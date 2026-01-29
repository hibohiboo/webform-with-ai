# spec-kitの導入。

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
```

`specify-cli==0.0.22`をインストール。

```bash
specify init .
specify check
```

specify checkの結果。 ready
![](image/check.png)

# claude で作業開始

今回はpowershellで起動

```
claude
```

## プロジェクト憲法を書く

```
/speckit.constitution 可読性を重視する。 テストは必須。 シンプルな設計を優先し、過剰な抽象化は避ける。 ユーザー体験を第一に考える。
```

## STEP 5：仕様を書く（技術の話はしない）

```
> /speckit.specify
複数のアプリに対する利用者の感想を収集するためのウェブフォームを作成したい。

このフォームは、特定のアプリごとに異なるURLからアクセスされる。
例えば、/app1/form や /app2/form のように、アプリごとにパスが分かれている。
フォームの入力項目自体は、どのアプリでも共通である。

利用者は、フォーム上で以下の情報を入力できる。
- 名前
- 評価（1〜3の3段階）
- 自由記述欄

これらの項目はすべて任意とし、未入力のまま送信することも可能とする。

フォームは、どのアプリに対する感想を入力しているかが利用者に分かるよう、
アプリごとに表示されるタイトルや文言が適切に変化する。

フォームの回答結果は、管理者がCSV形式でダウンロードできるようにしたい。

将来的に入力項目が追加される可能性がある。
その場合、過去の回答データについても、
追加された項目の列を含んだCSVを出力し、
当時存在しなかった項目については空白として扱われること。
```

# clarifyへの回答(追加で説明した部分)

```
A - 評価は 任意項目.現在は 1〜3 だが、将来 4 段階以上に変わる可能性がある.厳密なバリデーションより データ収集の柔軟性を優先したい.UI は誘導するが、保存時は縛らない
```

# speckit.planで計画を立ててもらう

```
/speckit.plan
This project is an MVP.

Implement a single-page application hosted on Amazon S3 and delivered via CloudFront.
Backend APIs must be routed through Amazon API Gateway and implemented with AWS Lambda.
Do not use Lambda Function URLs or ALB.

All infrastructure must be defined using AWS CDK (TypeScript).

The feedback form UI should be implemented using SurveyJS.
The form must support both Japanese and English.
Form definitions should be data-driven and shared across applications.

The same form is used for multiple applications, distinguished by URL paths such as /app1/form.
Applications are registered and managed via configuration or data storage outside the web UI.

Form fields are optional and may increase over time.
The data model must support schema evolution without data migration.
Validation should guide users in the UI, but backend storage must accept any values.

Collected responses must be downloadable as CSV (UTF-8 with BOM).
When new fields are added, CSV exports must include the new columns and leave blank values for older records.

Do not introduce authentication, admin UI, or premature optimization.
Prioritize simplicity, clarity, and long-term maintainability.
Write the output in Japanese.


```

# /speckit.tasks でタスク一覧を作ってもらう

```
/speckit.tasks
Generate an MVP-focused task list based strictly on the existing plan.md and related documents.
Group tasks by infrastructure, backend, and frontend.
Do not introduce new features or refactorings.
Write the output in Japanese.

```

# /speckit.implements で実装開始

## package.jsonの更新

claudeが準備したpackage.jsonのライブラリのバージョンが古いので更新した

## lint設定

これは個人的な好み。
フロントエンド。

```
$ bun i -D @eslint/eslintrc @eslint/js eslint eslint-config-prettier eslint-import-resolver-typescript eslint-plugin-import eslint-plugin-react-hooks eslint-plugin-react-refresh  eslint-plugin-sonarjs eslint-plugin-unused-imports globals typescript-eslint
```

バックエンド

```

$ bun i -D @eslint/eslintrc @eslint/js eslint eslint-config-prettier eslint-import-resolver-typescript eslint-plugin-import  eslint-plugin-sonarjs eslint-plugin-unused-imports globals typescript-eslint
```

## CDK動作確認

infrastructureディレクトリで下記。

```
npm run synth
aws login
npm run deploy
```

フロントエンドデプロイ確認

https://d3nw9s12usdo3l.cloudfront.net/

バックエンドデプロイ確認
https://kiuzitkug5.execute-api.ap-northeast-1.amazonaws.com/prod/api/responses/csv

https://d3nw9s12usdo3l.cloudfront.net/api/responses/csv

# フロントエンド動作確認(開発)

http://localhost:5173/app1/form

# 動作確認

https://d3nw9s12usdo3l.cloudfront.net/app1/form

# バックエンド動作確認 (開発)

```
winget install -e --id Amazon.SAM-CLI
```

ローカルのDynamodbの起動

```
docker-compose up
```

ローカルのAPIGatewayの起動

```
$ npm run local-api
```

# E2Eテスト

Playwrightブラウザをインストール

```
cd e2e && npx playwright install
```
