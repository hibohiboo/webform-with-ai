# Data Model: CSV ダウンロード日付範囲フィルタ

**Feature Branch**: `001-csv-date-filter`
**Date**: 2026-01-30

## エンティティ定義

### DateRangeParams（新規）

日付範囲フィルタのパラメータを表現する型。日付は日本時間（JST = UTC+9）として解釈される。

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
- **タイムゾーン**: 入力日付は JST として解釈し、バックエンドで UTC に変換して比較

### DateValidationError（新規）

日付バリデーションエラーを表現する型。

```typescript
interface DateValidationError {
  /** エラーコード */
  error: 'INVALID_DATE_FORMAT' | 'INVALID_DATE';
  /** エラーメッセージ */
  message: string;
}
```

**Error Codes**:
| Code | Condition | Message Example |
|------|-----------|-----------------|
| `INVALID_DATE_FORMAT` | YYYY-MM-DD 形式でない | "from パラメータは YYYY-MM-DD 形式で指定してください" |
| `INVALID_DATE` | 存在しない日付 | "to パラメータに無効な日付が指定されています" |

### FeedbackResponse（既存・変更なし）

既存のフィードバック回答エンティティ。`submittedAt` フィールドがフィルタ対象。

```typescript
interface FeedbackResponse {
  PK: string;                    // パーティションキー
  SK: string;                    // ソートキー
  responseId: string;            // ULID 形式
  appId: string;                 // アプリケーション ID
  submittedAt: string;           // ISO 8601 UTC 形式（フィルタ対象）
  name?: string;
  rating?: number;
  comment?: string;
  [key: string]: unknown;        // 動的フィールド
}
```

## フィルタリングロジック

### 境界値計算（JST → UTC 変換）

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

**JST → UTC 変換式**:
- JST は UTC+9 のため、UTC = JST - 9時間
- `from` (00:00:00 JST) → 前日 15:00:00 UTC
- `to` (23:59:59.999 JST) → 同日 14:59:59.999 UTC

### フィルタ条件マトリクス

| from | to | 条件 |
|------|----|------|
| 指定 | 指定 | `fromTimestamp <= submittedAt <= toTimestamp` |
| 指定 | 未指定 | `fromTimestamp <= submittedAt` |
| 未指定 | 指定 | `submittedAt <= toTimestamp` |
| 未指定 | 未指定 | フィルタなし（全件） |

### 文字列比較の妥当性

ISO 8601 形式は辞書順比較で時系列順になるため、Date オブジェクト変換不要：

```typescript
// これらは文字列比較で正しく動作する
"2026-01-15T00:00:00.000Z" < "2026-01-15T12:00:00.000Z"  // true
"2026-01-14T23:59:59.999Z" < "2026-01-15T00:00:00.000Z"  // true
```

## 状態遷移（フロントエンド）

```
[初期状態]
  ↓ 画面表示
[日付入力済み] (今月1日〜本日)
  ↓ ユーザー入力
[バリデーション中]
  ├─ 有効 → [ダウンロード可能]
  └─ 無効 → [エラー表示] → ユーザー修正 → [バリデーション中]

[ダウンロード可能]
  ↓ ボタンクリック
[ダウンロード中]
  ├─ 200 → [ダウンロード完了]
  ├─ 204 → [データなし通知表示]
  ├─ 400 → [API エラー表示]
  └─ 500 → [サーバーエラー表示]
```

## バリデーションルール詳細

### フロントエンド

| Rule | Trigger | Error Message |
|------|---------|---------------|
| 日付未入力 | blur / submit | "開始日を入力してください" / "終了日を入力してください" |
| フォーマット不正 | blur | "日付は YYYY-MM-DD 形式で入力してください" |
| 無効な日付 | blur | "有効な日付を入力してください" |
| 開始日 > 終了日 | 終了日 blur | "終了日は開始日以降の日付を入力してください" |

### バックエンド

| Rule | HTTP Status | Error Code | Error Message |
|------|-------------|------------|---------------|
| フォーマット不正 | 400 | `INVALID_DATE_FORMAT` | "{param} パラメータは YYYY-MM-DD 形式で指定してください" |
| 無効な日付 | 400 | `INVALID_DATE` | "{param} パラメータに無効な日付が指定されています" |
