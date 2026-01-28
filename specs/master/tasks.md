# タスク一覧: アプリ感想収集フォーム

**入力**: `/specs/master/` の設計ドキュメント（plan.md, data-model.md, contracts/api.yaml, research.md）
**仕様書**: `/specs/001-app-feedback-form/spec.md`

## フォーマット: `[ID] [P?] [Story?] 説明`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- **[Story]**: 対応するユーザーストーリー（US1, US2, US3）
- ファイルパスは説明に明記

---

## Phase 1: セットアップ（共有インフラ）

**目的**: プロジェクト初期化と基本構造の構築

### 1.1 インフラストラクチャ

- [ ] T001 [P] `infrastructure/` ディレクトリを作成し、CDKプロジェクトを初期化（`cdk init app --language typescript`）
- [ ] T002 [P] `infrastructure/package.json` に依存関係を追加（aws-cdk-lib, constructs）
- [ ] T003 [P] `infrastructure/tsconfig.json` を設定（strict: true, LF改行）
- [ ] T004 [P] `infrastructure/cdk.json` を設定

### 1.2 バックエンド

- [ ] T005 [P] `backend/` ディレクトリを作成し、package.jsonを初期化
- [ ] T006 [P] `backend/package.json` に依存関係を追加（@aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, ulid）
- [ ] T007 [P] `backend/tsconfig.json` を設定（strict: true, ESM, LF改行）
- [ ] T008 [P] `backend/vitest.config.ts` を設定

### 1.3 フロントエンド

- [ ] T009 [P] `frontend/` ディレクトリを作成し、Vite + React 19プロジェクトを初期化
- [ ] T010 [P] `frontend/package.json` に依存関係を追加（react, react-dom, react-router, survey-core, survey-react-ui）
- [ ] T011 [P] `frontend/tsconfig.json` を設定（strict: true, LF改行）
- [ ] T012 [P] `frontend/vite.config.ts` を設定

### 1.4 E2E

- [ ] T013 [P] `e2e/` ディレクトリを作成し、package.jsonを初期化
- [ ] T014 [P] `e2e/package.json` に依存関係を追加（@playwright/test）
- [ ] T015 [P] `e2e/playwright.config.ts` を設定

### 1.5 共通設定

- [ ] T016 `.gitattributes` をリポジトリルートに作成（LF改行を強制）
- [ ] T017 `.editorconfig` をリポジトリルートに作成

**チェックポイント**: 全サブプロジェクトの `bun install` が成功すること

---

## Phase 2: 基盤構築（ブロッキング前提条件）

**目的**: すべてのユーザーストーリーに必要なコアインフラストラクチャ

**⚠️ 重要**: このフェーズが完了するまで、ユーザーストーリーの実装は開始できません

### 2.1 インフラストラクチャ — CDKスタック

- [ ] T018 `infrastructure/bin/app.ts` を作成（CDKアプリのエントリーポイント）
- [ ] T019 `infrastructure/lib/backend-stack.ts` を作成（API Gateway, Lambda, DynamoDB）
  - DynamoDBテーブル: WebformResponses（PK, SK, GSI: AppIdIndex）
  - 課金方式: PAY_PER_REQUEST
  - ポイントインタイムリカバリ: 無効（コスト削減のため）
- [ ] T020 `infrastructure/lib/frontend-stack.ts` を作成（S3, CloudFront）
  - S3バケット: プライベート、OACでCloudFrontからのみアクセス
  - CloudFront: errorResponsesでSPAルーティング、/api/*をAPI Gatewayに転送
- [ ] T021 [P] `infrastructure/lib/backend-stack.ts` にLambda関数を追加（NodejsFunction + esbuild）
  - get-app, submit-response, download-csv の3つ
- [ ] T022 [P] `infrastructure/lib/backend-stack.ts` にAPI Gatewayルートを追加
  - GET /api/{appId}
  - POST /api/{appId}/responses
  - GET /api/responses/csv

### 2.2 バックエンド — 共有コード

- [ ] T023 [P] `backend/src/shared/types.ts` を作成（AppConfig, FeedbackResponse型定義）
- [ ] T024 [P] `backend/src/lib/apps-config.ts` を作成（アプリ定義のJSON設定）
  - app1, app2 のサンプルデータを含む
- [ ] T025 [P] `backend/src/lib/dynamodb.ts` を作成（DynamoDBクライアントヘルパー）
  - DynamoDBDocumentClientの初期化
  - PutItem, Scan操作のラッパー関数

### 2.3 フロントエンド — 共有コード

- [ ] T026 [P] `frontend/src/lib/form-definition.ts` を作成（SurveyJSフォーム定義JSON）
  - 名前、評価（1-3）、自由記述の3フィールド
  - 日本語/英語のローカライズ対応
- [ ] T027 [P] `frontend/src/lib/i18n.ts` を作成（日本語/英語の翻訳設定）
- [ ] T028 [P] `frontend/src/lib/api.ts` を作成（APIクライアント）
  - getApp, submitResponse, downloadCsv関数

**チェックポイント**: `bun run cdk synth` が成功し、CloudFormationテンプレートが生成されること

---

## Phase 3: ユーザーストーリー1 — フォーム送信 (P1) 🎯 MVP

**目標**: アプリ利用者がフォームから感想を送信できる

**独立テスト**: /app1/form にアクセスし、フォームを送信して完了画面が表示される

### 3.1 バックエンド実装

- [ ] T029 [P] [US1] `backend/src/handlers/get-app.ts` を作成
  - apps-config.tsからアプリ情報を取得
  - 存在しないappIdには404を返す
- [ ] T030 [P] [US1] `backend/src/handlers/submit-response.ts` を作成
  - ULIDでresponseIdを生成
  - ISO 8601形式でsubmittedAtを生成
  - DynamoDBにPutItem
  - 201レスポンスを返す
- [ ] T031 [US1] `backend/tests/unit/get-app.test.ts` を作成
- [ ] T032 [US1] `backend/tests/unit/submit-response.test.ts` を作成

### 3.2 フロントエンド実装

- [ ] T033 [P] [US1] `frontend/src/main.tsx` を作成（エントリーポイント）
- [ ] T034 [P] [US1] `frontend/src/App.tsx` を作成（React Router v7 createBrowserRouter）
  - /:appId/form ルート
  - 404ページ
- [ ] T035 [P] [US1] `frontend/src/hooks/useApp.ts` を作成
  - GET /api/{appId} を呼び出してアプリ情報を取得
  - エラー時は404状態を返す
- [ ] T036 [US1] `frontend/src/components/FeedbackForm.tsx` を作成
  - SurveyJSでフォームをレンダリング
  - onCompleteで回答をAPIに送信
  - アプリ名を動的に表示
- [ ] T037 [US1] `frontend/src/components/ThankYou.tsx` を作成
  - 送信完了メッセージを表示
- [ ] T038 [US1] `frontend/src/components/NotFound.tsx` を作成
  - 404エラーページ
- [ ] T039 [US1] `frontend/index.html` を作成

### 3.3 E2Eテスト

- [ ] T040 [US1] `e2e/tests/submit-feedback.spec.ts` を作成
  - シナリオ1: アプリ名が表示される
  - シナリオ2: 全項目入力して送信
  - シナリオ3: 空白で送信
  - シナリオ4: 別アプリでアプリ名が異なる

**チェックポイント**: ローカルでフォーム送信が動作し、DynamoDBにデータが保存される

---

## Phase 4: ユーザーストーリー2 — CSVダウンロード (P2)

**目標**: 管理者が回答データをCSVでダウンロードできる

**独立テスト**: /api/responses/csv にアクセスし、CSVファイルがダウンロードされる

### 4.1 バックエンド実装

- [ ] T041 [P] [US2] `backend/src/lib/csv.ts` を作成
  - BOM付きUTF-8でCSV生成
  - RFC 4180エスケープ（カンマ、改行、ダブルクォート）
  - 動的カラム（全レコードの属性和集合）
- [ ] T042 [US2] `backend/src/handlers/download-csv.ts` を作成
  - DynamoDBをページネーション付きでScan
  - csv.tsでCSV生成
  - Content-Type: text/csv; charset=utf-8
  - Content-Disposition: attachment; filename="feedback.csv"
  - isBase64Encoded: true
- [ ] T043 [US2] `backend/tests/unit/csv.test.ts` を作成
  - BOMの存在確認
  - 特殊文字エスケープ
  - 動的カラム生成
- [ ] T044 [US2] `backend/tests/unit/download-csv.test.ts` を作成

### 4.2 E2Eテスト

- [ ] T045 [US2] `e2e/tests/download-csv.spec.ts` を作成
  - シナリオ1: CSVダウンロード成功
  - シナリオ2: 列構成の確認
  - シナリオ3: 未入力項目は空白
  - シナリオ4: 複数アプリの回答が含まれる

**チェックポイント**: CSVダウンロードが動作し、Excelで文字化けなく開ける

---

## Phase 5: ユーザーストーリー3 — スキーマ進化 (P3)

**目標**: 将来の項目追加に対応したデータモデル

**独立テスト**: 新しいフィールドを追加した回答を送信し、CSVに新しい列が含まれる

### 5.1 検証（実装は不要 — 設計時点で対応済み）

- [ ] T046 [US3] スキーマ進化の動作確認
  - form-definition.tsに新しいフィールドを追加
  - 新しい回答を送信
  - CSVダウンロードで新しい列が含まれ、過去の回答は空白であることを確認

### 5.2 E2Eテスト

- [ ] T047 [US3] `e2e/tests/schema-evolution.spec.ts` を作成
  - シナリオ1: 新しいフィールドの回答が記録される
  - シナリオ2: CSVに新しい列が含まれる
  - シナリオ3: 過去の回答は新しい列が空白

**チェックポイント**: スキーマ進化が正しく動作することを確認

---

## Phase 6: 仕上げ・横断的関心事

**目的**: 複数のユーザーストーリーに影響する改善

- [ ] T048 [P] `backend/tests/integration/api.test.ts` を作成（API統合テスト）
- [ ] T049 [P] 全サブプロジェクトで `bun run lint` が通ることを確認
- [ ] T050 [P] 全サブプロジェクトで `bun run test` が通ることを確認
- [ ] T051 `quickstart.md` の手順を実行して動作確認
- [ ] T052 AWSへのデプロイ（`bun run cdk deploy`）

---

## 依存関係と実行順序

### フェーズ依存関係

```
Phase 1: セットアップ
    ↓
Phase 2: 基盤構築 ← すべてのユーザーストーリーをブロック
    ↓
Phase 3: US1 (P1) ← MVP
    ↓
Phase 4: US2 (P2) ← US1の完了後に開始可能
    ↓
Phase 5: US3 (P3) ← US1, US2の完了後に開始可能
    ↓
Phase 6: 仕上げ
```

### ユーザーストーリー間の依存関係

| ストーリー | 依存先 | 独立テスト可能 |
|-----------|--------|---------------|
| US1 (フォーム送信) | Phase 2のみ | ✅ はい |
| US2 (CSVダウンロード) | Phase 2 + US1（データが必要） | ✅ はい（テストデータ投入後） |
| US3 (スキーマ進化) | US1 + US2 | ✅ はい |

### 並列実行の機会

**Phase 1 内**:
```
並列: T001, T002, T003, T004 (インフラ)
並列: T005, T006, T007, T008 (バックエンド)
並列: T009, T010, T011, T012 (フロントエンド)
並列: T013, T014, T015 (E2E)
```

**Phase 2 内**:
```
順次: T018 → T019 → T020 (CDKスタック)
並列: T021, T022 (Lambda, API Gateway)
並列: T023, T024, T025 (バックエンド共有)
並列: T026, T027, T028 (フロントエンド共有)
```

**Phase 3 内**:
```
並列: T029, T030 (バックエンドハンドラ)
並列: T033, T034, T035 (フロントエンド基盤)
順次: T035 → T036 → T037 (フォームコンポーネント)
```

---

## 実装戦略

### MVP優先（ユーザーストーリー1のみ）

1. Phase 1: セットアップを完了
2. Phase 2: 基盤構築を完了（重要 — すべてをブロック）
3. Phase 3: ユーザーストーリー1を完了
4. **停止して検証**: US1が独立して動作することを確認
5. 準備ができたらデプロイ/デモ

### インクリメンタルデリバリー

1. セットアップ + 基盤 → 基盤完了
2. US1追加 → 独立テスト → デプロイ（MVP!）
3. US2追加 → 独立テスト → デプロイ
4. US3追加 → 独立テスト → デプロイ
5. 各ストーリーは前のストーリーを壊さずに価値を追加

---

## サマリー

| 項目 | 数値 |
|------|------|
| 総タスク数 | 52 |
| Phase 1（セットアップ） | 17 |
| Phase 2（基盤構築） | 11 |
| Phase 3（US1） | 12 |
| Phase 4（US2） | 5 |
| Phase 5（US3） | 2 |
| Phase 6（仕上げ） | 5 |
| 並列実行可能タスク | 32 |

**推奨MVPスコープ**: Phase 1 + Phase 2 + Phase 3（US1のみ）= 40タスク
