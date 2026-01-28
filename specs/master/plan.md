# 実装計画: アプリ感想収集フォーム

**ブランチ**: `master` | **日付**: 2026-01-28 | **仕様書**: [spec.md](../001-app-feedback-form/spec.md)
**入力**: `/specs/001-app-feedback-form/spec.md` の機能仕様書

## 概要

複数アプリのユーザー感想を収集するMVPウェブフォームを構築する。SurveyJSベースのSPAをS3/CloudFrontでホスティングし、バックエンドAPIはAPI Gateway + Lambdaで実装、DynamoDBでスキーマ柔軟なストレージを使用する。インフラはすべてAWS CDK（TypeScript）で定義する。フォームは日本語/英語対応、データ駆動のフィールド定義、マイグレーション不要のスキーマ進化、BOM付きCSVエクスポートをサポートする。

## 技術コンテキスト

**言語/バージョン**: TypeScript 5.x（Lambda実行環境: Node.js 20.x）
**主要依存ライブラリ**: AWS CDK, SurveyJS (survey-react-ui), React 18, esbuild（Lambdaバンドル）
**ストレージ**: Amazon DynamoDB（スキーマ柔軟なドキュメントストレージのためのシングルテーブル設計）
**テスト**: Vitest（単体/統合テスト）、Playwright（BDD/E2Eテスト）
**ターゲットプラットフォーム**: S3/CloudFront上のWeb SPA、Node.js 20.x上のLambda
**プロジェクト種別**: Webアプリケーション（フロントエンド + バックエンド + インフラ）
**パフォーマンス目標**: フォーム送信 < 1秒、CSVダウンロード < 5秒（1000件以下の場合）
**制約事項**: 認証なし、管理画面なし、MVPスコープ、すべてのフィールドは任意
**規模/スコープ**: 小規模MVP、数百〜数千件の回答

## 憲法チェック

*ゲート: Phase 0のリサーチ前に通過が必須。Phase 1設計後に再チェック。*

### I. 可読性優先
- [x] **合格**: 明確な命名規則を計画済み（明示的な型を持つTypeScript）
- [x] **合格**: .gitattributesとエディタ設定でLF改行コードを強制
- [x] **合格**: ビジネスルールにコメントを付与（フォーム定義、CSVエクスポートロジック）

### II. テスト駆動開発（必須）
- [x] **合格**: Lambdaハンドラのユニットテスト（Vitest）
- [x] **合格**: APIエンドポイントの統合テスト
- [x] **合格**: ユーザーシナリオのBDD/E2Eテスト（Playwright）
- [x] **合格**: テスト実行は `bun run test` を使用

### III. シンプルさ優先
- [x] **合格**: DynamoDBシングルテーブル（ORM・リポジトリパターン不使用）
- [x] **合格**: 最小限のLambdaハンドラ（APIエンドポイントごとに1つ）
- [x] **合格**: 認証レイヤーなし、管理画面なし
- [x] **合格**: CDKコンストラクトを直接使用（カスタムコンストラクトライブラリ不使用）

### IV. ユーザー体験優先
- [x] **合格**: ユーザーストーリーの優先順位付け（P1 > P2 > P3）
- [x] **合格**: SurveyJSによるフォームUX（バリデーション、国際化対応）
- [x] **合格**: BOM付きCSVによるExcel互換性

**ゲート結果**: 合格 — 違反なし。

## プロジェクト構成

### ドキュメント（本機能）

```text
specs/master/
├── plan.md              # 本ファイル
├── research.md          # Phase 0の成果物
├── data-model.md        # Phase 1の成果物
├── quickstart.md        # Phase 1の成果物
├── contracts/           # Phase 1の成果物
│   └── api.yaml         # OpenAPI仕様書
└── tasks.md             # Phase 2の成果物（/speckit.tasksコマンドで生成）
```

### ソースコード（リポジトリルート）

```text
infrastructure/
├── bin/
│   └── app.ts                  # CDKアプリのエントリーポイント
├── lib/
│   └── webform-stack.ts        # CDKスタック（S3, CloudFront, API GW, Lambda, DynamoDB）
├── cdk.json
├── tsconfig.json
└── package.json

backend/
├── src/
│   ├── handlers/
│   │   ├── submit-response.ts  # POST /api/{appId}/responses
│   │   ├── download-csv.ts     # GET /api/responses/csv
│   │   └── get-app.ts          # GET /api/{appId}
│   ├── lib/
│   │   ├── dynamodb.ts         # DynamoDBクライアントヘルパー
│   │   ├── csv.ts              # BOM付きCSV生成
│   │   └── apps-config.ts      # アプリ定義（設定駆動）
│   └── shared/
│       └── types.ts            # 共有型定義
├── tests/
│   ├── unit/
│   │   ├── submit-response.test.ts
│   │   ├── download-csv.test.ts
│   │   └── csv.test.ts
│   └── integration/
│       └── api.test.ts
├── tsconfig.json
└── package.json

frontend/
├── src/
│   ├── App.tsx                 # ルーター + SurveyJSフォームページ
│   ├── main.tsx                # エントリーポイント
│   ├── components/
│   │   ├── FeedbackForm.tsx    # SurveyJSフォームラッパー
│   │   └── ThankYou.tsx        # 送信完了確認
│   ├── lib/
│   │   ├── api.ts              # APIクライアント
│   │   ├── form-definition.ts  # データ駆動のフォーム定義JSON（共有）
│   │   └── i18n.ts             # 日本語/英語の翻訳
│   └── hooks/
│       └── useApp.ts           # アプリデータ取得フック
├── tests/
│   ├── components/
│   │   └── FeedbackForm.test.tsx
│   └── hooks/
│       └── useApp.test.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json

e2e/
├── tests/
│   ├── submit-feedback.spec.ts   # ユーザーストーリー1のBDDシナリオ
│   ├── download-csv.spec.ts      # ユーザーストーリー2のBDDシナリオ
│   └── schema-evolution.spec.ts  # ユーザーストーリー3のBDDシナリオ
├── playwright.config.ts
└── package.json
```

**構成の判断**: フロントエンド、バックエンド、インフラ、E2Eを分離したWebアプリケーションパターンを採用。各ディレクトリに独立したpackage.jsonを持ち、依存関係を個別に管理する。バックエンドの `shared/` 型定義は最小限に抑え、フロントエンドは独自のAPIクライアント型を使用する。

## 憲法再チェック（設計後）

*Phase 1設計完了後の再評価。*

### I. 可読性優先
- [x] **合格**: データモデルに明確で説明的なフィールド名を使用（responseId, appId, submittedAt）
- [x] **合格**: APIコントラクトをOpenAPI 3.0形式で文書化
- [x] **合格**: LF改行コードを強制
- [x] **合格**: フォーム定義は明示的なフィールド定義を持つデータ駆動JSON

### II. テスト駆動開発（必須）
- [x] **合格**: 各Lambdaハンドラとcsv生成のユニットテストを計画済み
- [x] **合格**: APIエンドポイントの統合テストを計画済み
- [x] **合格**: 仕様書の全受け入れシナリオにBDD/E2Eテストを対応付け
- [x] **合格**: 憲法に従いテストコマンドは `bun run test` を使用

### III. シンプルさ優先
- [x] **合格**: DynamoDBシングルテーブルで直接属性を保存（EAV・ORM不使用）
- [x] **合格**: アプリ設定はJSON定数（動的な管理画面不使用）
- [x] **合格**: 3つのLambdaハンドラ（エンドポイントごとに1つ） — 共有フレームワーク不使用
- [x] **合格**: 単一CDKスタック — マルチスタックやカスタムコンストラクト不使用
- [x] **合格**: 手動CSV生成 — 不必要なライブラリ依存なし
- [x] **合格**: CSVはLambdaから直接レスポンス（MVPではS3署名付きURL不使用）

### IV. ユーザー体験優先
- [x] **合格**: SurveyJSによる実績あるフォームUXとローカライゼーション
- [x] **合格**: すべてのフィールドが任意 — ユーザーは自由に送信可能
- [x] **合格**: BOM付きCSVによるExcel互換性
- [x] **合格**: 未登録アプリへの404ページ
- [x] **合格**: フォーム完了後の送信確認表示

**設計後ゲート結果**: 合格 — 違反なし。設計はすべての憲法原則に準拠。

## 複雑性の追跡

> 違反なし。複雑性の正当化は不要。
