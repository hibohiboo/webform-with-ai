import { test, expect } from "@playwright/test";

/**
 * フォーム送信のE2Eテスト
 * 目的: アプリ利用者がフォームから感想を送信できることを検証
 */

test.describe("US1: フォーム送信", () => {
  test.describe("シナリオ1: アプリ名が表示される", () => {
    test("app1のフォームページでアプリ名が表示される", async ({ page }) => {
      await page.goto("/app1/form");

      // ヘッダーにアプリ名が表示されることを確認
      await expect(page.locator("h1")).toContainText("サンプルアプリ1");
    });

    test("英語設定でアプリ名が英語で表示される", async ({ page, context }) => {
      // 英語ロケールを設定
      await context.addCookies([
        { name: "lang", value: "en", domain: "localhost", path: "/" },
      ]);

      await page.goto("/app1/form");

      // 英語のアプリ名が表示されることを確認
      await expect(page.locator("h1")).toContainText("Sample App 1");
    });
  });

  test.describe("シナリオ2: 全項目入力して送信", () => {
    test("すべてのフィールドを入力して送信できる", async ({ page }) => {
      await page.goto("/app1/form");

      // フォームが表示されるまで待機
      await expect(page.locator("h1")).toBeVisible();

      // 名前を入力
      await page.fill('input[aria-label="お名前"]', "山田太郎");

      // 評価を選択（2つ星）
      await page.click('label:has-text("2")');

      // コメントを入力
      await page.fill(
        'textarea[aria-label="ご意見・ご感想"]',
        "とても使いやすいアプリでした。"
      );

      // 送信ボタンをクリック
      await page.click('input[value="送信"]');

      // 完了ページに遷移することを確認
      await expect(page).toHaveURL(/\/app1\/thank-you/);
      await expect(page.locator("h1")).toContainText("ありがとうございます");
    });
  });

  test.describe("シナリオ3: 空白で送信", () => {
    test("すべてのフィールドを空白で送信できる", async ({ page }) => {
      await page.goto("/app1/form");

      // フォームが表示されるまで待機
      await expect(page.locator("h1")).toBeVisible();

      // 何も入力せずに送信ボタンをクリック
      await page.click('input[value="送信"]');

      // 完了ページに遷移することを確認（すべて任意入力のため）
      await expect(page).toHaveURL(/\/app1\/thank-you/);
    });
  });

  test.describe("シナリオ4: 別アプリでアプリ名が異なる", () => {
    test("app2のフォームページで異なるアプリ名が表示される", async ({
      page,
    }) => {
      await page.goto("/app2/form");

      // app2のアプリ名が表示されることを確認
      await expect(page.locator("h1")).toContainText("サンプルアプリ2");
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

      // 各フィールドが存在することを確認
      await expect(page.locator('input[aria-label="お名前"]')).toBeVisible();
      await expect(
        page.locator('textarea[aria-label="ご意見・ご感想"]')
      ).toBeVisible();

      // 評価フィールドが存在することを確認（1-3の選択肢）
      await expect(page.locator('label:has-text("1")')).toBeVisible();
      await expect(page.locator('label:has-text("2")')).toBeVisible();
      await expect(page.locator('label:has-text("3")')).toBeVisible();
    });
  });

  test.describe("シナリオ6: 完了ページからフォームに戻る", () => {
    test("完了ページからフォームに戻るリンクが機能する", async ({ page }) => {
      // まず送信を完了
      await page.goto("/app1/form");
      await expect(page.locator("h1")).toBeVisible();
      await page.click('input[value="送信"]');
      await expect(page).toHaveURL(/\/app1\/thank-you/);

      // フォームに戻るリンクをクリック
      await page.click('a:has-text("フォームに戻る")');

      // フォームページに遷移することを確認
      await expect(page).toHaveURL(/\/app1\/form/);
    });
  });
});
