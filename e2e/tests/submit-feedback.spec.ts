import { test, expect } from "@playwright/test";

/**
 * フォーム送信のE2Eテスト
 * 目的: アプリ利用者がフォームから感想を送信できることを検証
 *
 * 注意: これらのテストはフロントエンド + バックエンドAPI + DynamoDB の
 * 統合環境が必要です。デプロイ後に実行してください。
 *
 * 実行方法:
 *   npx playwright test submit-feedback.spec.ts
 *
 * スキップする場合:
 *   SKIP_E2E=true npx playwright test
 */

test.describe("US1: フォーム送信", () => {
  // 環境が準備できていない場合はスキップ
  test.skip(
    ({ browserName }) => browserName === "chromium" && !process.env.RUN_E2E,
    "E2E環境が準備できていません。RUN_E2E=true で実行してください"
  );

  test.describe("シナリオ1: アプリ名が表示される", () => {
    test("app1のフォームページでアプリ名が表示される", async ({ page }) => {
      await page.goto("/app1/form");

      // ヘッダーにアプリ名が表示されることを確認
      await expect(page.locator("h1")).toContainText("アプリ1");
    });

    test("英語設定でアプリ名が英語で表示される", async ({ browser }) => {
      // 英語ロケールの新しいコンテキストを作成
      const context = await browser.newContext({ locale: "en-US" });
      const page = await context.newPage();

      await page.goto("/app1/form");

      // 英語のアプリ名が表示されることを確認
      await expect(page.locator("h1")).toContainText("App 1");

      await context.close();
    });
  });

  test.describe("シナリオ2: 全項目入力して送信", () => {
    test("すべてのフィールドを入力して送信できる", async ({ page }) => {
      await page.goto("/app1/form");

      // フォームが表示されるまで待機
      await expect(page.locator("h1")).toBeVisible();

      // 名前を入力（SurveyJSのセレクタ）
      await page.fill('[data-name="name"] input', "山田太郎");

      // 評価を選択（2つ星）
      await page.click('.sd-rating__item-text:has-text("2")');

      // コメントを入力
      await page.fill('[data-name="comment"] textarea', "とても使いやすいアプリでした。");

      // 送信ボタンをクリック（SurveyJS）
      await page.click('.sd-navigation__complete-btn');

      // 完了ページに遷移することを確認
      await expect(page).toHaveURL(/\/app1\/thank-you/, { timeout: 30000 });
      await expect(page.locator("h1")).toContainText("送信完了");
    });
  });

  test.describe("シナリオ3: 空白で送信", () => {
    test("すべてのフィールドを空白で送信できる", async ({ page }) => {
      await page.goto("/app1/form");

      // フォームが表示されるまで待機
      await expect(page.locator("h1")).toBeVisible();

      // 何も入力せずに送信ボタンをクリック（SurveyJS）
      await page.click('.sd-navigation__complete-btn');

      // 完了ページに遷移することを確認（すべて任意入力のため）
      await expect(page).toHaveURL(/\/app1\/thank-you/, { timeout: 30000 });
    });
  });

  test.describe("シナリオ4: 別アプリでアプリ名が異なる", () => {
    test("app2のフォームページで異なるアプリ名が表示される", async ({
      page,
    }) => {
      await page.goto("/app2/form");

      // app2のアプリ名が表示されることを確認
      await expect(page.locator("h1")).toContainText("アプリ2");
    });

    test("存在しないappIdの場合は404ページに遷移する", async ({ page }) => {
      await page.goto("/invalid-app/form");

      // 404ページに遷移することを確認
      await expect(page).toHaveURL(/\/not-found/);
      await expect(page.locator("h1")).toContainText("404");
    });
  });

  test.describe("シナリオ5: フォーム要素の確認", () => {
    test("フォームに必要なフィールドが存在する", async ({ page }) => {
      await page.goto("/app1/form");

      // 各フィールドが存在することを確認（SurveyJSのセレクタ）
      await expect(page.locator('[data-name="name"] input')).toBeVisible();
      await expect(page.locator('[data-name="comment"] textarea')).toBeVisible();

      // 評価フィールドが存在することを確認（1-3の選択肢）
      await expect(page.locator('.sd-rating__item-text:has-text("1")')).toBeVisible();
      await expect(page.locator('.sd-rating__item-text:has-text("2")')).toBeVisible();
      await expect(page.locator('.sd-rating__item-text:has-text("3")')).toBeVisible();
    });
  });

  test.describe("シナリオ6: 完了ページからフォームに戻る", () => {
    test("完了ページからフォームに戻るリンクが機能する", async ({ page }) => {
      // まず送信を完了
      await page.goto("/app1/form");
      await expect(page.locator("h1")).toBeVisible();
      await page.click('.sd-navigation__complete-btn');
      await expect(page).toHaveURL(/\/app1\/thank-you/, { timeout: 30000 });

      // フォームに戻るリンクをクリック
      await page.click('a:has-text("フォームに戻る")');

      // フォームページに遷移することを確認
      await expect(page).toHaveURL(/\/app1\/form/);
    });
  });
});
