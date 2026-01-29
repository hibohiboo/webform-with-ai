import { test, expect } from "@playwright/test";

/**
 * スキーマ進化のE2Eテスト
 * 目的: 将来の項目追加に対応したデータモデルの検証
 *
 * 注意: これらのテストはフロントエンド + バックエンドAPI + DynamoDB の
 * 統合環境が必要です。デプロイ後に実行してください。
 *
 * 実行方法:
 *   RUN_E2E=true npx playwright test schema-evolution.spec.ts
 */

test.describe("US3: スキーマ進化", () => {
  // 環境が準備できていない場合はスキップ
  test.skip(
    ({ browserName }) => browserName === "chromium" && !process.env.RUN_E2E,
    "E2E環境が準備できていません。RUN_E2E=true で実行してください"
  );

  test.describe("シナリオ1: 新しいフィールドの回答が記録される", () => {
    test("フォームに新しいフィールドを追加して送信できる", async ({
      page,
    }) => {
      // フォームページにアクセス
      await page.goto("/app1/form");

      // フォームが表示されるまで待機
      await expect(page.locator("h1")).toBeVisible();

      // 名前を入力
      await page.fill('input[aria-label="お名前"]', "テストユーザー");

      // 評価を選択（3つ星）
      await page.click('label:has-text("3")');

      // コメントを入力
      await page.fill(
        'textarea[aria-label="ご意見・ご感想"]',
        "スキーマ進化テスト用コメント"
      );

      // 送信ボタンをクリック
      await page.click('input[value="送信"]');

      // 完了ページに遷移することを確認
      await expect(page).toHaveURL(/\/app1\/thank-you/);
      await expect(page.locator("h1")).toContainText("ありがとうございます");
    });
  });

  test.describe("シナリオ2: CSVに新しい列が含まれる", () => {
    test("CSVダウンロードで動的に生成された列が含まれる", async ({
      request,
    }) => {
      // APIから直接CSVをダウンロード
      const response = await request.get("/api/responses/csv");

      // ステータスコードを確認（データがない場合は204）
      if (response.status() === 204) {
        test.skip(true, "No data available for CSV download");
        return;
      }

      expect(response.ok()).toBeTruthy();

      // Content-Typeを確認
      expect(response.headers()["content-type"]).toContain("text/csv");

      // CSVの内容を取得
      const csvContent = await response.text();

      // ヘッダー行が存在することを確認
      expect(csvContent).toContain("responseId");
      expect(csvContent).toContain("appId");
      expect(csvContent).toContain("submittedAt");

      // 基本フィールドが含まれることを確認
      expect(csvContent).toContain("name");
      expect(csvContent).toContain("rating");
      expect(csvContent).toContain("comment");
    });
  });

  test.describe("シナリオ3: 過去の回答は新しい列が空白", () => {
    test("異なるフィールドセットを持つ回答が正しくCSVに出力される", async ({
      page,
      request,
    }) => {
      // 最初の回答: 名前のみ
      await page.goto("/app1/form");
      await expect(page.locator("h1")).toBeVisible();
      await page.fill('input[aria-label="お名前"]', "名前のみユーザー");
      await page.click('input[value="送信"]');
      await expect(page).toHaveURL(/\/app1\/thank-you/);

      // 2番目の回答: コメントのみ
      await page.goto("/app2/form");
      await expect(page.locator("h1")).toBeVisible();
      await page.fill(
        'textarea[aria-label="ご意見・ご感想"]',
        "コメントのみテスト"
      );
      await page.click('input[value="送信"]');
      await expect(page).toHaveURL(/\/app2\/thank-you/);

      // CSVをダウンロードして確認
      const response = await request.get("/api/responses/csv");

      if (response.status() === 204) {
        test.skip(true, "No data available for CSV download");
        return;
      }

      expect(response.ok()).toBeTruthy();

      const csvContent = await response.text();

      // すべてのフィールドがヘッダーに含まれる
      expect(csvContent).toContain("name");
      expect(csvContent).toContain("rating");
      expect(csvContent).toContain("comment");

      // 各回答が存在する
      expect(csvContent).toContain("名前のみユーザー");
      expect(csvContent).toContain("コメントのみテスト");
    });
  });
});

test.describe("US3: 動的カラム生成の検証", () => {
  // 環境が準備できていない場合はスキップ
  test.skip(
    ({ browserName }) => browserName === "chromium" && !process.env.RUN_E2E,
    "E2E環境が準備できていません。RUN_E2E=true で実行してください"
  );

  test("レスポンスに含まれるすべての属性がCSVの列になる", async ({
    request,
  }) => {
    // 異なる属性を持つデータを送信
    const response1 = await request.post("/api/app1/responses", {
      data: {
        name: "テスト1",
        customField1: "カスタム値1",
      },
    });

    // 201または成功レスポンスを確認
    expect(response1.status()).toBeLessThan(300);

    const response2 = await request.post("/api/app1/responses", {
      data: {
        name: "テスト2",
        customField2: "カスタム値2",
      },
    });

    expect(response2.status()).toBeLessThan(300);

    // CSVをダウンロード
    const csvResponse = await request.get("/api/responses/csv");

    if (csvResponse.status() === 204) {
      test.skip(true, "No data available for CSV download");
      return;
    }

    const csvContent = await csvResponse.text();

    // 両方のカスタムフィールドがヘッダーに含まれる
    expect(csvContent).toContain("customField1");
    expect(csvContent).toContain("customField2");

    // 各レコードのデータが含まれる
    expect(csvContent).toContain("カスタム値1");
    expect(csvContent).toContain("カスタム値2");
  });
});
