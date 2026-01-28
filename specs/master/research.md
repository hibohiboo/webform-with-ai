# リサーチ: アプリ感想収集フォーム

**日付**: 2026-01-28 | **計画書**: [plan.md](./plan.md)

## 1. DynamoDBデータモデル設計

### 決定: スパース属性を用いたシングルテーブル設計

**根拠:**
- DynamoDBは設計上スキーマレス — 新しい属性の追加にマイグレーション不要
- 属性を省略する（nullを保存しない）ことでストレージを節約し、スパースインデックスの効率を維持
- エンティティは2種類（アプリ + 回答）のみでアクセスパターンも単純 — シングルテーブルが適切
- ORMやリポジトリパターンは不要（憲法: シンプルさ優先）

**検討した代替案:**
- マルチテーブル設計 — 却下: 2つのエンティティには不必要な複雑さ
- EAV（Entity-Attribute-Value）パターン — 却下: このユースケースには過剰設計
- RDS/PostgreSQL — 却下: スキーママイグレーションが必要、運用負荷が高い

### テーブル設計

```
Table: WebformResponses
  PK: RESPONSE#{responseId}    (ULID for time-ordered uniqueness)
  SK: APP#{appId}#TS#{isoTimestamp}

  GSI: AppIdIndex
    GSI-PK: appId
    GSI-SK: timestamp
    Projection: ALL
```

**アクセスパターン:**
| パターン | メソッド | キー条件 |
|---------|--------|---------------|
| 回答送信 | PutItem | PK = RESPONSE#{id} |
| 全回答取得（CSV） | ページネーション付きScan | テーブル全体スキャン |
| アプリ別回答取得 | GSIでQuery | appId = "app1" |
| アプリ存在確認 | 設定ファイル参照 | DynamoDB外 |

**スキーマ進化:**
- 新しいフィールドは新しいアイテムの属性として追加 — マイグレーション不要
- 古いアイテムには単にその属性がない（スパース）
- CSVエクスポートは全アイテムの属性名の和集合を収集
- TypeScript型ではオプショナルプロパティを使用（`field?: type`）

---

## 2. SurveyJS統合

### 決定: survey-core + survey-react-ui（v2.x）

**根拠:**
- SurveyJSはデータ駆動のJSONフォーム定義に特化して構築されている
- 日本語ローカライゼーションを組み込みでサポート（50以上の言語を含む）
- Ratingの質問タイプが設定可能なスケールをネイティブにサポート
- `onComplete`イベントがAPI送信用のクリーンなJSONデータを提供
- 活発なメンテナンス（v2.3.x、2026年1月時点）

**検討した代替案:**
- カスタムReactフォーム — 却下: 開発工数が多い、組み込みのi18n/ratingなし
- React Hook Form — 却下: データ駆動でない、フォーム定義の共有不可
- Formik — 却下: React Hook Formと同様の制限

### 必要なパッケージ

```
survey-core        # プラットフォーム非依存のロジック
survey-react-ui    # Reactレンダリングコンポーネント
```

### ローカライゼーション方針
- 日本語UIストリングのために `survey-core/survey.i18n.ja` をインポート
- フォーム定義JSONはフィールドごとに `{ "en": "...", "ja": "..." }` をサポート
- ブラウザ/ユーザーの設定に基づいて `survey.locale = "ja"` または `"en"` を設定
- SurveyJSがボタンラベル、バリデーションメッセージなどを自動的に処理

### フォーム定義（データ駆動）
- フォームJSONをTypeScript定数として保存（共有設定）
- JSONが質問、型、ローカライズされたタイトル、表示オプションを定義
- 全アプリで同一の定義を使用 — アプリ名を動的に注入
- すべてのフィールドは `isRequired: false` に設定（省略した場合もfalseがデフォルト）

---

## 3. AWS CDKアーキテクチャ

### 決定: RestApi、NodejsFunction、S3/CloudFrontを含む単一スタック

**根拠:**
- 単一スタックはMVPにとってシンプル（全リソースが同一ライフサイクルを共有）
- CloudFront統合の成熟度とより良い互換性のためにHttpApiよりRestApiを選択
- 高速なバンドルとツリーシェイキングのためにNodejsFunction + esbuildを使用
- S3セキュリティのためにレガシーOAIではなくOAC（Origin Access Control）を使用
- CloudFrontを単一のエントリーポイントとして使用し、CORSの複雑さを排除

**検討した代替案:**
- HttpApi — 却下: CloudFront統合が未成熟、機能セットが限定的
- 複数スタック — 却下: MVPスコープには不必要
- Lambda Function URLs — 却下: 要件で明示的に除外
- ALB — 却下: 要件で明示的に除外

### CloudFrontルーティング

```
CloudFront Distribution
├── /* (default)     → S3 Bucket (SPA with OAC)
│   └── 404 errors → /index.html (SPA client-side routing)
└── /api/*           → API Gateway RestApi origin
    └── Routes to Lambda functions
```

**主要な設定:**
- `S3BucketOrigin.withOriginAccessControl(bucket)` によるセキュアなS3アクセス
- `errorResponses` で404時にindex.htmlを返す（SPAルーティング）
- `additionalBehaviors` で/api/*パスをAPI Gatewayに転送
- カスタムオリジンリクエストポリシー（Hostヘッダーを除外してAPI GWの403を回避）
- APIビヘイビアに `CachePolicy.CACHING_DISABLED` を設定

### Lambdaバンドル
- `NodejsFunction` + esbuild（TypeScriptの自動トランスパイル）
- `externalModules: ['@aws-sdk/*']`（AWS SDK v3はLambdaランタイムに含まれる）
- `minify: true` でバンドルサイズを縮小
- Node.js 24.xランタイム

### CORS
- CloudFrontをリバースプロキシとして使用し、SPAとAPIを同一オリジンに
- 開発環境（localhost）とプリフライトリクエストにはCORSヘッダーが引き続き必要
- RestApiに `defaultCorsPreflightOptions` を設定

---

## 4. CSV生成

### 決定: UTF-8 BOM付き手動生成、Lambdaからの直接レスポンス

**根拠:**
- シンプルな要件（既知の列構造、RFC 4180エスケープ）
- 外部依存ライブラリ不要 — Lambdaバンドルサイズを削減
- Lambdaからの直接レスポンスはMVP規模で十分（9,000件未満）
- BOM（`\uFEFF`）は日本語テキストのExcel互換性に必要

**検討した代替案:**
- csvライブラリ（fast-csv、papaparse）— 却下: シンプルなケースには不必要な依存
- S3署名付きURLアプローチ — 却下: MVPには時期尚早な最適化
- Lambdaストリーミングレスポンス — 却下: Lambda Function URLsが必要（除外済み）

### 実装詳細

**BOM**: `\uFEFF`（U+FEFF）をCSVコンテンツの先頭に付加

**エスケープ（RFC 4180）:**
- カンマ、改行、ダブルクォートを含むフィールドはクォートで囲む
- フィールド内のダブルクォートは二重化（`"` → `""`）
- 空/未入力フィールドは空文字列として出力（nullではない）

**HTTPレスポンス:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="feedback.csv"
isBase64Encoded: true  (Lambda response format)
```

**API Gateway:** バイナリメディアタイプ `text/csv` を設定

**容量制限:**
| レコード数 | アプローチ | ステータス |
|---------|----------|--------|
| 9,000件未満 | Lambdaからの直接レスポンス | MVP（現在） |
| 9,000件以上 | S3署名付きURL | 将来のアップグレードパス |

**動的カラム:**
1. DynamoDBから全回答をスキャン（ページネーション付き）
2. すべての属性名の和集合を収集
3. 固定列を先頭に配置: responseId, appId, appName, timestamp
4. 動的列はアルファベット順で続く
5. 古いレコードに存在しない属性 → 空セル

---

## 5. アプリ登録

### 決定: バックエンドコード内のJSON設定ファイル

**根拠:**
- 仕様書に「アプリは設定ファイルまたはデータベースで定義」と記載
- JSON設定はMVPにとって最もシンプル（YAGNI — 管理画面は不要）
- アプリの追加/変更にはコードのデプロイが必要（MVPでは許容範囲）
- 動的管理が必要になった場合、後からDynamoDBに移行可能

**検討した代替案:**
- DynamoDBベースのアプリレジストリ — 却下: MVPには時期尚早、複雑さが増す
- 環境変数 — 却下: アプリメタデータには構造化が不十分
- S3設定ファイル — 却下: リクエストごとにS3読み取りが発生

### 設定構造

```typescript
const apps: Record<string, AppConfig> = {
  "app1": { name: "アプリ1", nameEn: "App 1" },
  "app2": { name: "アプリ2", nameEn: "App 2" },
};
```

---

## 6. ルーティングと404ハンドリング

### 決定: フロントエンドルーターがAPI経由でappIdを検証し、404ページを表示

**根拠:**
- SPAアーキテクチャではフロントエンドがルーティングを処理
- フロントエンドが `GET /api/{appId}` エンドポイントからアプリ情報を取得
- アプリが見つからない場合、APIが404を返す → フロントエンドが404ページを表示
- CloudFrontのエラーレスポンスが、存在しないSPAルートへの直接アクセスを処理

**フロー:**
1. ユーザーが `/{appId}/form` にアクセス
2. CloudFrontがindex.htmlを返す（SPA）
3. React Router v7（createBrowserRouter）が `/:appId/form` にマッチ
4. コンポーネントが `GET /api/{appId}` を呼び出してアプリ名を検証・取得
5. 404の場合 → エラーページを表示。200の場合 → アプリ名付きでフォームをレンダリング

---

## 参考資料

### DynamoDB
- [Best practices for designing and using partition keys effectively](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html)
- [Single-table vs. multi-table design in Amazon DynamoDB](https://aws.amazon.com/blogs/database/single-table-vs-multi-table-design-in-amazon-dynamodb/)
- [Evolve your Amazon DynamoDB table's data model](https://aws.amazon.com/blogs/database/evolve-your-amazon-dynamodb-tables-data-model/)
- [Take advantage of sparse indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-general-sparse-indexes.html)

### SurveyJS
- [React Form Library | Getting Started Guide](https://surveyjs.io/form-library/documentation/get-started-react)
- [Survey Localization](https://surveyjs.io/form-library/documentation/survey-localization)
- [Rating Scale Question](https://surveyjs.io/form-library/documentation/api-reference/rating-scale-question-model)

### AWS CDK / アーキテクチャ
- [Deploy a React SPA to S3 and CloudFront](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/deploy-a-react-based-single-page-application-to-amazon-s3-and-cloudfront.html)
- [aws-cdk-lib.aws_lambda_nodejs module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs-readme.html)
- [CloudFront Origin Access Control L2 construct](https://aws.amazon.com/blogs/devops/a-new-aws-cdk-l2-construct-for-amazon-cloudfront-origin-access-control-oac/)
- [Choose between REST APIs and HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html)

### CSV
- [RFC 4180: Common Format and MIME Type for CSV Files](https://www.rfc-editor.org/rfc/rfc4180.html)
- [Return binary media from Lambda proxy integration](https://docs.aws.amazon.com/apigateway/latest/developerguide/lambda-proxy-binary-media.html)
- [API Gateway quotas](https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html)
