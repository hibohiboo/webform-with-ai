# Research: CSV ダウンロード日付範囲フィルタ

**Feature Branch**: `001-csv-date-filter`
**Date**: 2026-01-30

## 既存コードベース調査結果

### バックエンド構造

| ファイル | 役割 | 変更の必要性 |
|---------|------|-------------|
| `backend/src/handlers/download-csv.ts` | Lambda ハンドラー | **変更必須**: クエリパラメータ受け取り、バリデーション、フィルタ処理 |
| `backend/src/lib/csv.ts` | CSV 生成ロジック | 変更不要: 既存の `generateCsv()` をそのまま利用 |
| `backend/src/lib/dynamodb.ts` | DynamoDB アクセス | 変更不要: `scanAllResponses()` で全件取得後にメモリでフィルタ |
| `backend/src/shared/types.ts` | 型定義 | **追加**: DateRangeParams, DateValidationError 型 |

### フロントエンド構造

| ファイル | 役割 | 変更の必要性 |
|---------|------|-------------|
| `frontend/src/components/AdminDownload.tsx` | 管理画面 | **変更必須**: 日付入力 UI、バリデーション、エラー表示 |
| `frontend/src/lib/api.ts` | API クライアント | 変更不要: 既存の fetch ロジックを拡張 |

### 既存 API 仕様

- **エンドポイント**: `GET /api/responses/csv`
- **レスポンス**:
  - `200`: CSV ファイル（BOM 付き UTF-8）
  - `204`: データなし
  - `500`: サーバーエラー（`{ "message": "..." }` 形式）

### 技術的決定事項

#### Decision 1: 日付フィルタリングの実装方式

- **Decision**: DynamoDB 全件取得後にメモリ上でフィルタリング
- **Rationale**:
  - 既存の `scanAllResponses()` を変更不要で再利用可能
  - 現在のデータ規模（想定 10,000 件未満）ではパフォーマンス問題なし
  - DynamoDB の FilterExpression よりも実装がシンプル
- **Alternatives considered**:
  - DynamoDB FilterExpression → GSI 追加が必要で複雑化
  - DynamoDB Query with GSI → インフラ変更が必要

#### Decision 2: 日付境界値の計算方法

- **Decision**: 純粋な文字列比較（ISO 8601 形式の特性を活用）
- **Rationale**:
  - ISO 8601 形式は辞書順比較で時系列順になる
  - `submittedAt` は既に `YYYY-MM-DDTHH:mm:ss.sssZ` 形式で保存済み
  - from: `{date}T00:00:00.000Z`, to: `{date}T23:59:59.999Z` に変換して比較
- **Alternatives considered**:
  - Date オブジェクトに変換して比較 → パース処理のオーバーヘッド

#### Decision 3: バリデーション戦略

- **Decision**: フロントエンド + バックエンドの二重バリデーション
- **Rationale**:
  - フロントエンド: UX 向上（即時フィードバック）
  - バックエンド: セキュリティ（API 直接呼び出し対策）
- **Validation items**:
  - YYYY-MM-DD 形式チェック（正規表現）
  - 有効な日付チェック（Date オブジェクトで検証）
  - 開始日 ≤ 終了日チェック（フロントエンドのみ）

#### Decision 4: エラーレスポンス形式

- **Decision**: `{ "error": "ERROR_CODE", "message": "説明文" }` 形式
- **Rationale**:
  - 既存の 500 エラー形式（`{ "message": "..." }`）を拡張
  - エラーコードにより機械的な処理が可能
- **Error codes**:
  - `INVALID_DATE_FORMAT`: 日付フォーマット不正
  - `INVALID_DATE`: 無効な日付（例: 2026-02-30）

## 技術コンテキスト

- **Language/Version**: TypeScript 5.x / Node.js 24.x
- **Primary Dependencies**: AWS CDK, aws-lambda, @aws-sdk/client-dynamodb
- **Storage**: DynamoDB（既存テーブル `WebformResponses`）
- **Testing**: Vitest（`bun run test`）
- **Target Platform**: AWS Lambda + API Gateway + CloudFront
- **Frontend**: React 19, React Router v7

## リスクと対策

| リスク | 影響度 | 対策 |
|-------|--------|------|
| 大量データ時のフィルタ性能 | 中 | 現時点では問題なし、将来的に GSI 追加を検討 |
| タイムゾーン混乱 | 高 | UTC 一貫使用を徹底、フロントエンドでも UTC として扱う |
| 後方互換性破壊 | 高 | パラメータ未指定時は従来動作を維持 |
