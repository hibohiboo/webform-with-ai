# クイックスタート: アプリ感想収集フォーム

**日付**: 2026-01-28 | **計画書**: [plan.md](./plan.md)

## 前提条件

- Node.js 24.x
- Bun（パッケージマネージャー兼テストランナー）
- AWS CLIが有効な認証情報で設定済み
- AWS CDK CLI（`npm install -g aws-cdk`）

## プロジェクトセットアップ

```bash
# リポジトリルートから実行
cd infrastructure && bun install
cd ../backend && bun install
cd ../frontend && bun install
cd ../e2e && bun install
```

## ローカル開発

### バックエンド（Lambdaハンドラ）

```bash
cd backend

# ユニットテスト実行（TDD: テストを先に書く）
bun run test

# lint・型チェック実行
bun run lint
```

### フロントエンド（React SPA）

```bash
cd frontend

# 開発サーバー起動（Vite）
bun run dev

# テスト実行
bun run test

# lint・型チェック実行
bun run lint

# 本番ビルド
bun run build
```

### E2Eテスト（Playwright）

```bash
cd e2e

# BDDシナリオ実行
bun run test

# UIモードで実行
bun run test:ui
```

## AWSへのデプロイ

```bash
cd infrastructure

# CloudFormationテンプレートの合成
bun run cdk synth

# スタックのデプロイ
bun run cdk deploy

# スタックの削除（クリーンアップ）
bun run cdk destroy
```

## アーキテクチャ概要

```
ブラウザ → CloudFront
             ├── /* → S3 (React SPA)
             └── /api/* → API Gateway → Lambda → DynamoDB
```

## APIエンドポイント

| メソッド | パス | 説明 |
|--------|------|-------------|
| GET | `/api/{appId}` | アプリ情報取得（アプリの存在を検証） |
| POST | `/api/{appId}/responses` | フィードバック回答の送信 |
| GET | `/api/responses/csv` | 全回答をCSVでダウンロード |

## 主要ファイル

| ファイル | 用途 |
|------|---------|
| `infrastructure/lib/webform-stack.ts` | CDKスタック（全AWSリソース） |
| `backend/src/lib/apps-config.ts` | アプリ定義（ここにアプリを追加） |
| `frontend/src/lib/form-definition.ts` | SurveyJSフォームJSON（ここにフィールドを追加） |
| `frontend/src/lib/i18n.ts` | 日本語/英語の翻訳 |

## 新しいアプリの追加方法

`backend/src/lib/apps-config.ts` を編集:

```typescript
export const apps = {
  "app1": { name: "アプリ1", nameEn: "App 1" },
  "app2": { name: "アプリ2", nameEn: "App 2" },
  // ここに新しいアプリを追加:
  "app3": { name: "新しいアプリ", nameEn: "New App" },
};
```

その後、バックエンドLambdaを再デプロイする。

## 新しいフォームフィールドの追加方法

1. `frontend/src/lib/form-definition.ts` のSurveyJSフォーム定義を更新
2. バックエンドの変更は不要（任意のフィールドを受け入れる）
3. データベースマイグレーションは不要（DynamoDBはスキーマレス）
4. CSVエクスポートは自動的に新しい列を含める
5. 古い回答では新しいフィールドは空白として表示

## テスト実行

```bash
# バックエンドユニットテスト
cd backend && bun run test

# フロントエンドテスト
cd frontend && bun run test

# E2E / BDDテスト
cd e2e && bun run test

# lint（全プロジェクト）
cd backend && bun run lint
cd frontend && bun run lint
cd infrastructure && bun run lint
```
