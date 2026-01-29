# Quickstart: CSV ダウンロード日付範囲フィルタ

**Feature Branch**: `001-csv-date-filter`
**Date**: 2026-01-30

## 概要

CSV ダウンロード API に `from`/`to` クエリパラメータを追加し、日付範囲でフィードバックデータをフィルタリングする機能を実装する。

## 変更対象ファイル

### バックエンド

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/handlers/download-csv.ts` | クエリパラメータ取得、バリデーション、フィルタ処理追加 |
| `backend/src/shared/types.ts` | `DateRangeParams`, `DateValidationError` 型追加 |
| `backend/src/lib/date-filter.ts` | **新規**: 日付バリデーション・フィルタユーティリティ |
| `backend/tests/unit/date-filter.test.ts` | **新規**: 日付フィルタのユニットテスト |
| `backend/tests/integration/api.test.ts` | 日付フィルタ付き CSV ダウンロードテスト追加 |

### フロントエンド

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/AdminDownload.tsx` | 日付入力 UI、バリデーション、エラー表示追加 |
| `frontend/src/hooks/useDateRangeForm.ts` | **新規**: 日付範囲フォームのカスタムフック |
| `frontend/src/utils/date-validation.ts` | **新規**: 日付バリデーションユーティリティ |

### E2E テスト

| ファイル | 変更内容 |
|---------|---------|
| `e2e/tests/download-csv.spec.ts` | 日付フィルタ付きダウンロードのシナリオ追加 |

## 実装順序

```
Phase 1: バックエンド基盤
├── 1.1 型定義追加 (types.ts)
├── 1.2 日付バリデーション・フィルタユーティリティ (date-filter.ts)
├── 1.3 ユニットテスト (date-filter.test.ts)
└── 1.4 ハンドラー修正 (download-csv.ts)

Phase 2: バックエンドテスト
├── 2.1 統合テスト追加 (api.test.ts)
└── 2.2 lint・型チェック

Phase 3: フロントエンド
├── 3.1 日付バリデーションユーティリティ (date-validation.ts)
├── 3.2 カスタムフック (useDateRangeForm.ts)
├── 3.3 UI 修正 (AdminDownload.tsx)
└── 3.4 lint・型チェック・ビルド確認

Phase 4: E2E テスト
├── 4.1 BDD シナリオ追加 (download-csv.spec.ts)
└── 4.2 全シナリオ通過確認
```

## API 使用例

### 日付範囲指定

```bash
# 2026年1月のデータのみ
curl "https://example.com/api/responses/csv?from=2026-01-01&to=2026-01-31"

# 2026-01-15 以降のデータ
curl "https://example.com/api/responses/csv?from=2026-01-15"

# 2026-01-15 以前のデータ
curl "https://example.com/api/responses/csv?to=2026-01-15"

# 全件（従来動作）
curl "https://example.com/api/responses/csv"
```

### エラーレスポンス例

```json
// 400 Bad Request - フォーマット不正
{
  "error": "INVALID_DATE_FORMAT",
  "message": "Invalid date format for 'from'. Expected YYYY-MM-DD."
}

// 400 Bad Request - 無効な日付
{
  "error": "INVALID_DATE",
  "message": "Invalid date value for 'to': 2026-02-30 does not exist."
}
```

## フロントエンド UI 仕様

### 初期状態

- 開始日: 今月1日（例: 2026-01-01）
- 終了日: 本日（例: 2026-01-30）
- ダウンロードボタン: 有効

### バリデーションエラー表示

```
┌─────────────────────────────────────┐
│ 開始日                              │
│ ┌─────────────────────────────────┐ │
│ │ 2026-01-32                      │ │
│ └─────────────────────────────────┘ │
│ ⚠️ 有効な日付を入力してください       │
│                                     │
│ 終了日                              │
│ ┌─────────────────────────────────┐ │
│ │ 2026-01-15                      │ │
│ └─────────────────────────────────┘ │
│ ⚠️ 終了日は開始日以降の日付を...     │
│                                     │
│ [CSVをダウンロード] (disabled)      │
└─────────────────────────────────────┘
```

### 204 No Content 時

- 通知メッセージ「指定期間にデータがありません」を表示
- ダウンロードは発生しない

## テスト観点

### ユニットテスト（バックエンド）

- [ ] YYYY-MM-DD 形式の正規表現マッチ
- [ ] 有効な日付の検証（うるう年考慮）
- [ ] 無効な日付の検出（2026-02-30 等）
- [ ] 境界値変換（from → 00:00:00.000Z, to → 23:59:59.999Z）
- [ ] フィルタリングロジック（from のみ、to のみ、両方、なし）

### 統合テスト（バックエンド）

- [ ] 日付範囲指定で正しいデータのみ返却
- [ ] 境界値のデータが正しく含まれる/除外される
- [ ] パラメータなしで全件返却（後方互換性）
- [ ] 400 エラー時の正しいレスポンス形式

### E2E テスト

- [ ] 日付入力 → ダウンロード成功フロー
- [ ] バリデーションエラー表示
- [ ] 204 No Content 時の通知表示
- [ ] ボタン無効化の動作確認
