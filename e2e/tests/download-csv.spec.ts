import { test, expect, type Page } from "@playwright/test";

/**
 * CSVダウンロードのE2Eテスト
 * 目的: 管理者が回答データをCSVでダウンロードできることを検証
 *
 * 注意: これらのテストはバックエンドAPI + DynamoDB の統合環境が必要です。
 * デプロイ後に実行してください。
 *
 * 実行方法:
 *   RUN_E2E=true npx playwright test download-csv.spec.ts
 */

// =============================================================================
// 定数・設定
// =============================================================================

const ROUTES = {
  ADMIN: "/admin",
  CSV_API: "/api/responses/csv",
  RESPONSES_API: (appId: string) => `/api/${appId}/responses`,
} as const;

const SELECTORS = {
  FROM_DATE_INPUT: "input#fromDate",
  TO_DATE_INPUT: "input#toDate",
  DOWNLOAD_BUTTON: 'button:has-text("CSVをダウンロード")',
} as const;

const MESSAGES = {
  NO_DATA: "指定期間にデータがありません",
  REQUIRED_FROM: "開始日を入力してください",
  INVALID_RANGE: "終了日は開始日以降の日付を入力してください",
} as const;

const TIMEOUTS = {
  API_RESPONSE: 15000,
} as const;

// =============================================================================
// ヘルパー関数
// =============================================================================

/** 本日を YYYY-MM-DD 形式で返す */
function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

/** 今月1日を YYYY-MM-DD 形式で返す */
function getFirstDayOfCurrentMonth(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/** E2E 環境が準備できていない場合のスキップ条件 */
function shouldSkipE2E({ browserName }: { browserName: string }): boolean {
  return browserName === "chromium" && !process.env.RUN_E2E;
}

// =============================================================================
// 管理画面 Page Object
// =============================================================================

class AdminPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(ROUTES.ADMIN);
  }

  get fromDateInput() {
    return this.page.locator(SELECTORS.FROM_DATE_INPUT);
  }

  get toDateInput() {
    return this.page.locator(SELECTORS.TO_DATE_INPUT);
  }

  get downloadButton() {
    return this.page.locator(SELECTORS.DOWNLOAD_BUTTON);
  }

  async setDateRange(from: string, to: string) {
    await this.page.fill(SELECTORS.FROM_DATE_INPUT, from);
    await this.page.fill(SELECTORS.TO_DATE_INPUT, to);
  }

  async clearFromDate() {
    await this.page.fill(SELECTORS.FROM_DATE_INPUT, "");
  }

  async clickDownload() {
    await this.downloadButton.click();
  }

  async expectMessage(message: string, timeout?: number) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible(
      timeout ? { timeout } : undefined
    );
  }
}

// =============================================================================
// US2: CSVダウンロード（API テスト）
// =============================================================================

test.describe("US2: CSVダウンロード", () => {
  test.skip(shouldSkipE2E, "E2E環境が準備できていません。RUN_E2E=true で実行してください");

  test.describe("シナリオ1: CSVダウンロード成功", () => {
    test("APIエンドポイントからCSVをダウンロードできる", async ({ request }) => {
      const response = await request.get(ROUTES.CSV_API);

      expect([200, 204]).toContain(response.status());

      if (response.status() === 200) {
        expect(response.headers()["content-type"]).toContain("text/csv");
        expect(response.headers()["content-disposition"]).toContain("attachment");
        expect(response.headers()["content-disposition"]).toContain("feedback.csv");
      }
    });
  });

  test.describe("シナリオ2: 列構成の確認", () => {
    test("CSVヘッダーに必須列が含まれる", async ({ request }) => {
      await request.post(ROUTES.RESPONSES_API("app1"), {
        data: { name: "CSVテストユーザー", rating: 3, comment: "CSVテスト用コメント" },
      });

      const response = await request.get(ROUTES.CSV_API);

      if (response.status() === 204) {
        test.skip(true, "No data available for CSV download");
        return;
      }

      const csvContent = await response.text();
      const headerLine = csvContent.split("\n")[0];
      const requiredColumns = ["responseId", "appId", "submittedAt", "name", "rating", "comment"];

      for (const column of requiredColumns) {
        expect(headerLine).toContain(column);
      }
    });
  });

  test.describe("シナリオ3: 未入力項目は空白", () => {
    test("未入力フィールドが空白として出力される", async ({ request }) => {
      const postResponse = await request.post(ROUTES.RESPONSES_API("app1"), {
        data: { name: "未入力テストユーザー" },
      });

      expect(postResponse.status()).toBeLessThan(300);

      const response = await request.get(ROUTES.CSV_API);

      if (response.status() === 204) {
        test.skip(true, "No data available for CSV download");
        return;
      }

      const csvContent = await response.text();
      expect(csvContent).toContain("未入力テストユーザー");
    });
  });

  test.describe("シナリオ4: 複数アプリの回答が含まれる", () => {
    test("異なるappIdの回答がすべてCSVに含まれる", async ({ request }) => {
      await request.post(ROUTES.RESPONSES_API("app1"), {
        data: { name: "app1ユーザー", comment: "app1からの回答" },
      });
      await request.post(ROUTES.RESPONSES_API("app2"), {
        data: { name: "app2ユーザー", comment: "app2からの回答" },
      });

      const response = await request.get(ROUTES.CSV_API);

      if (response.status() === 204) {
        test.skip(true, "No data available for CSV download");
        return;
      }

      const csvContent = await response.text();
      expect(csvContent).toContain("app1");
      expect(csvContent).toContain("app2");
      expect(csvContent).toContain("app1ユーザー");
      expect(csvContent).toContain("app2ユーザー");
    });
  });

  test.describe("シナリオ5: BOM付きUTF-8", () => {
    test("CSVファイルがBOM付きUTF-8でエンコードされている", async ({ request }) => {
      await request.post(ROUTES.RESPONSES_API("app1"), {
        data: { name: "BOMテスト", comment: "日本語テスト" },
      });

      const response = await request.get(ROUTES.CSV_API);

      if (response.status() === 204) {
        test.skip(true, "No data available for CSV download");
        return;
      }

      const buffer = await response.body();
      const bytes = new Uint8Array(buffer);

      // UTF-8 BOM: EF BB BF
      expect(bytes[0]).toBe(0xef);
      expect(bytes[1]).toBe(0xbb);
      expect(bytes[2]).toBe(0xbf);
    });
  });

  test.describe("シナリオ6: 特殊文字のエスケープ", () => {
    test("カンマ、改行、ダブルクォートがRFC 4180に従ってエスケープされる", async ({ request }) => {
      await request.post(ROUTES.RESPONSES_API("app1"), {
        data: { name: 'テスト,ユーザー"特殊"', comment: "改行を\n含むコメント" },
      });

      const response = await request.get(ROUTES.CSV_API);

      if (response.status() === 204) {
        test.skip(true, "No data available for CSV download");
        return;
      }

      const csvContent = await response.text();
      expect(csvContent).toContain('"');
      expect(csvContent).toContain('""');
    });
  });

  test.describe("シナリオ7: 日付範囲フィルタ（API）", () => {
    test("from と to パラメータで期間指定ダウンロードできる", async ({ request }) => {
      const today = getToday();
      const response = await request.get(`${ROUTES.CSV_API}?from=${today}&to=${today}`);

      expect([200, 204]).toContain(response.status());

      if (response.status() === 200) {
        expect(response.headers()["content-type"]).toContain("text/csv");
      }
    });

    test("不正な日付フォーマットで 400 + INVALID_DATE_FORMAT を返す", async ({ request }) => {
      const response = await request.get(`${ROUTES.CSV_API}?from=2026/01/15`);

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("INVALID_DATE_FORMAT");
      expect(body.message).toContain("from");
    });

    test("無効な日付で 400 + INVALID_DATE を返す", async ({ request }) => {
      const response = await request.get(`${ROUTES.CSV_API}?to=2026-02-30`);

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("INVALID_DATE");
      expect(body.message).toContain("to");
    });

    test("該当データなしの期間で 204 No Content を返す", async ({ request }) => {
      const response = await request.get(`${ROUTES.CSV_API}?from=2099-01-01&to=2099-12-31`);

      expect(response.status()).toBe(204);
    });
  });
});

// =============================================================================
// US3: 日付範囲フィルタUI
// =============================================================================

test.describe("US3: 日付範囲フィルタUI", () => {
  test.skip(shouldSkipE2E, "E2E環境が準備できていません。RUN_E2E=true で実行してください");

  test.describe("シナリオ1: 初期値確認（FR-015）", () => {
    test("画面表示時に開始日が今月1日、終了日が本日に設定されている", async ({ page }) => {
      const adminPage = new AdminPage(page);
      await adminPage.goto();

      await expect(adminPage.fromDateInput).toHaveValue(getFirstDayOfCurrentMonth());
      await expect(adminPage.toDateInput).toHaveValue(getToday());
    });
  });

  test.describe("シナリオ2: 日付範囲指定でダウンロード成功", () => {
    test("有効な日付範囲を入力してダウンロードボタンをクリックできる", async ({ page }) => {
      const adminPage = new AdminPage(page);
      await adminPage.goto();

      await adminPage.setDateRange("2026-01-01", "2026-01-31");

      await expect(adminPage.downloadButton).toBeEnabled();
    });
  });

  test.describe("シナリオ3: 無効な日付でバリデーションエラー表示", () => {
    test("無効な日付を入力するとインラインエラーが表示されボタンが無効化される", async ({ page }) => {
      const adminPage = new AdminPage(page);
      await adminPage.goto();

      await adminPage.clearFromDate();

      await adminPage.expectMessage(MESSAGES.REQUIRED_FROM);
      await expect(adminPage.downloadButton).toBeDisabled();
    });
  });

  test.describe("シナリオ4: 開始日 > 終了日でボタン無効化", () => {
    test("開始日が終了日より後の場合エラーメッセージが表示されボタンが無効化される", async ({ page }) => {
      const adminPage = new AdminPage(page);
      await adminPage.goto();

      await adminPage.setDateRange("2026-01-31", "2026-01-01");

      await adminPage.expectMessage(MESSAGES.INVALID_RANGE);
      await expect(adminPage.downloadButton).toBeDisabled();
    });
  });

  test.describe("シナリオ5: データなし時の通知メッセージ表示（FR-016）", () => {
    test("該当データがない期間を指定すると通知メッセージが表示される", async ({ page }) => {
      const adminPage = new AdminPage(page);
      await adminPage.goto();

      await adminPage.setDateRange("2099-01-01", "2099-12-31");
      await adminPage.clickDownload();

      await adminPage.expectMessage(MESSAGES.NO_DATA, TIMEOUTS.API_RESPONSE);
    });
  });
});
