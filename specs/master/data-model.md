# データモデル: アプリ感想収集フォーム

**日付**: 2026-01-28 | **計画書**: [plan.md](./plan.md)

## エンティティ

### App（アプリ）

設定駆動のエンティティ。DynamoDBには保存せず、**フロントエンドコード内の静的JSON設定**として定義する。バックエンドはappIdの存在を検証せず、送信された値をそのまま保存する。

| フィールド | 型 | 説明 |
|-----------|------|-------------|
| appId | string | URLパス識別子（例: "app1"） |
| name | string | 日本語表示名（例: "アプリ1"） |
| nameEn | string | 英語表示名（例: "App 1"） |

**保存先**: `frontend/src/lib/apps-config.ts` 内のTypeScript定数

```typescript
type AppConfig = {
  appId: string;
  name: string;
  nameEn: string;
};
```

**制約**:
- appIdはURL安全な文字列（英数字 + ハイフン）
- nameとnameEnは必須
- appIdの重複不可

---

### Response（回答）

中核エンティティ。DynamoDBに保存する。

| フィールド | 型 | 必須 | 説明 |
|-----------|------|----------|-------------|
| responseId | string (ULID) | はい | 一意の回答識別子 |
| appId | string | はい | アプリ設定への参照 |
| submittedAt | string (ISO 8601) | はい | 送信日時 |
| name | string | いいえ | 回答者名 |
| rating | number | いいえ | 評価値（UIは1〜3を誘導、保存時は任意の値を受け入れ） |
| comment | string | いいえ | 自由記述コメント |
| *（将来のフィールド）* | *any* | *いいえ* | *将来追加されるフィールド* |

**保存先**: DynamoDBシングルテーブル

```typescript
type FeedbackResponse = {
  responseId: string;
  appId: string;
  submittedAt: string;
  name?: string;
  rating?: number;
  comment?: string;
  [key: string]: unknown;  // Schema evolution: future fields
};
```

**制約**:
- responseIdはサーバー側で生成（ULID）
- submittedAtはサーバー側で生成（ISO 8601 UTC）
- ユーザー入力フィールドはすべて任意
- バックエンドはバリデーションなしで任意の値を受け入れる（FR-003-Aに準拠）
- 同一ユーザーからの重複送信は個別レコードとして保存（FR-010に準拠）

---

## DynamoDBテーブル設計

### テーブル: WebformResponses

| 属性 | 型 | 役割 |
|-----------|------|------|
| PK | String | パーティションキー: `RESPONSE#{responseId}` |
| SK | String | ソートキー: `APP#{appId}#TS#{submittedAt}` |
| responseId | String | ULID |
| appId | String | アプリ識別子 |
| submittedAt | String | ISO 8601タイムスタンプ |
| name | String | 任意の回答者名 |
| rating | Number | 任意の評価値 |
| comment | String | 任意の自由記述コメント |

**課金方式**: PAY_PER_REQUEST（無料枠対応）
**暗号化**: AWSマネージド暗号化
**ポイントインタイムリカバリ**: 無効（コスト削減のため）

### GSI: AppIdIndex

| 属性 | 型 | 役割 |
|-----------|------|------|
| appId | String | GSIパーティションキー |
| submittedAt | String | GSIソートキー |

**プロジェクション**: ALL（将来のフィールドを含むCSVエクスポートの柔軟性のために必要）

### アクセスパターン

| パターン | 操作 | キー条件 |
|---------|-----------|---------------|
| 回答送信 | PutItem | PK=RESPONSE#{id}, SK=APP#{appId}#TS#{ts} |
| 全件CSV出力 | Scan（ページネーション付き） | テーブル全体スキャン、1ページ1MB |
| appId別クエリ | AppIdIndexでQuery | appId = {appId} |

---

## スキーマ進化戦略

### 新しいフィールドの追加

新しいフォームフィールドを追加する場合（例: 「推奨度」）:

1. **フォーム定義**: SurveyJS JSONに新しい質問を追加
2. **バックエンドハンドラ**: 変更不要 — 任意のJSONフィールドを受け入れる
3. **DynamoDB**: 新しいアイテムには属性が含まれ、古いアイテムには含まれない（スパース）
4. **CSVエクスポート**: 全アイテムの属性名の和集合を収集し、新しい列を含める
5. **TypeScript型**: FeedbackResponse型にオプショナルプロパティを追加

### CSV列の生成

1. DynamoDBから全アイテムをスキャン
2. すべての属性キーの和集合を収集（PK、SKを除く）
3. 固定列を先頭に配置: `responseId`, `appId`, `submittedAt`
4. 動的列はアルファベット順: `comment`, `name`, `rating`, ...
5. 新しいフィールドがない古いレコード → CSVでは空セル

### 例: 「recommendation」追加前後

**追加前**（CSV）:
```csv
responseId,appId,submittedAt,comment,name,rating
r001,app1,2026-01-28T10:00:00Z,使いやすかった,山田太郎,2
r002,app1,2026-01-28T11:00:00Z,,,
```

**「recommendation」フィールド追加後**:
```csv
responseId,appId,submittedAt,comment,name,rating,recommendation
r001,app1,2026-01-28T10:00:00Z,使いやすかった,山田太郎,2,
r002,app1,2026-01-28T11:00:00Z,,,,
r003,app1,2026-01-29T09:00:00Z,最高です,佐藤花子,3,5
```

---

## リレーションシップ

```
AppConfig (JSON設定)            FeedbackResponse (DynamoDB)
┌─────────────────┐            ┌──────────────────────┐
│ appId (PK)      │◄───────────│ appId (FK)           │
│ name            │            │ responseId (PK)      │
│ nameEn          │            │ submittedAt          │
└─────────────────┘            │ name?                │
                               │ rating?              │
  1 App : N Responses          │ comment?             │
                               │ [future fields]?     │
                               └──────────────────────┘
```

- 1つのAppに対して複数のResponseが存在する（1:N）
- リレーションシップはアプリケーション層で管理（データベースの外部キーではない）
- リクエスト内の無効なappId → フロントエンドが静的設定を参照し404ページを表示（バックエンドは検証しない）

---

## 日付フィルタリング

### DateRangeParams

CSVダウンロード時の日付範囲フィルタパラメータ。日付は日本時間（JST = UTC+9）として解釈される。

```typescript
interface DateRangeParams {
  /** 開始日（YYYY-MM-DD 形式、JST として解釈）、未指定の場合は undefined */
  from?: string;
  /** 終了日（YYYY-MM-DD 形式、JST として解釈）、未指定の場合は undefined */
  to?: string;
}
```

**Validation Rules**:
- `from`: `YYYY-MM-DD` 形式の文字列、有効な日付であること
- `to`: `YYYY-MM-DD` 形式の文字列、有効な日付であること
- 両方 undefined の場合は全件取得（後方互換性）

### DateValidationError

日付バリデーションエラーレスポンス。

```typescript
interface DateValidationError {
  /** エラーコード */
  error: 'INVALID_DATE_FORMAT' | 'INVALID_DATE';
  /** エラーメッセージ */
  message: string;
}
```

| Code | Condition | Message Example |
|------|-----------|-----------------|
| `INVALID_DATE_FORMAT` | YYYY-MM-DD 形式でない | "from パラメータは YYYY-MM-DD 形式で指定してください" |
| `INVALID_DATE` | 存在しない日付 | "to パラメータに無効な日付が指定されています" |

### JST → UTC 変換ロジック

日付パラメータは JST として解釈し、UTC に変換して `submittedAt` と比較する。

```
入力: from = "2026-01-15" (JST)
解釈: 2026-01-15 00:00:00.000 JST
変換: fromTimestamp = "2026-01-14T15:00:00.000Z" (UTC)
条件: response.submittedAt >= fromTimestamp

入力: to = "2026-01-15" (JST)
解釈: 2026-01-15 23:59:59.999 JST
変換: toTimestamp = "2026-01-15T14:59:59.999Z" (UTC)
条件: response.submittedAt <= toTimestamp
```

### フィルタ条件マトリクス

| from | to | 条件 |
|------|----|------|
| 指定 | 指定 | `fromTimestamp <= submittedAt <= toTimestamp` |
| 指定 | 未指定 | `fromTimestamp <= submittedAt` |
| 未指定 | 指定 | `submittedAt <= toTimestamp` |
| 未指定 | 未指定 | フィルタなし（全件）|
