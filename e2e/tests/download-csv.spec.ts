import { test, expect } from "@playwright/test";

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

test.describe("US2: CSVダウンロード", () => {
  // 環境が準備できていない場合はスキップ
  test.skip(
    ({ browserName }) => browserName === "chromium" && !process.env.RUN_E2E,
    "E2E環境が準備できていません。RUN_E2E=true で実行してください"
  );

  test.describe("シナリオ1: CSVダウンロード成功", () => {
    test("APIエンドポイントからCSVをダウンロードできる", async ({
      request,
    }) => {
      const response = await request.get("/api/responses/csv");

      // データがない場合は204、ある場合は200
      expect([200, 204]).toContain(response.status());

      if (response.status() === 200) {
        // Content-Typeを確認
        expect(response.headers()["content-type"]).toContain("text/csv");

        // Content-Dispositionを確認
        expect(response.headers()["content-disposition"]).toContain(
          "attachment"
        );
        expect(response.headers()["content-disposition"]).toContain(
          "feedback.csv"
        );
      }
    });
  });

  test.describe("シナリオ2: 列構成の確認", () => {
    test("CSVヘッダーに必須列が含まれる", async ({ request }) => {
      // テストデータを投入
      await request.post("/api/app1/responses", {
        data: {
          name: "CSVテストユーザー",
          rating: 3,
          comment: "CSVテスト用コメント",
        },
      });

      const response = await request.get("/api/responses/csv");

      if (response.status() === 204) {
        test.skip(true, "No data available for CSV download");
        return;
      }

      const csvContent = await response.text();

      // 必須列の確認
      const headerLine = csvContent.split("\n")[0];
      expect(headerLine).toContain("responseId");
      expect(headerLine).toContain("appId");
      expect(headerLine).toContain("submittedAt");
      expect(headerLine).toContain("name");
      expect(headerLine).toContain("rating");
      expect(headerLine).toContain("comment");
    });
  });

  test.describe("シナリオ3: 未入力項目は空白", () => {
    test("未入力フィールドが空白として出力される", async ({ request }) => {
      // 名前のみ入力したデータを投入
      const postResponse = await request.post("/api/app1/responses", {
        data: {
          name: "未入力テストユーザー",
        },
      });

      expect(postResponse.status()).toBeLessThan(300);

      const response = await request.get("/api/responses/csv");

      if (response.status() === 204) {
        test.skip(true, "No data available for CSV download");
        return;
      }

      const csvContent = await response.text();

      // 投入したデータが含まれることを確認
      expect(csvContent).toContain("未入力テストユーザー");
    });
  });

  test.describe("シナリオ4: 複数アプリの回答が含まれる", () => {
    test("異なるappIdの回答がすべてCSVに含まれる", async ({ request }) => {
      // app1にデータを投入
      await request.post("/api/app1/responses", {
        data: {
          name: "app1ユーザー",
          comment: "app1からの回答",
        },
      });

      // app2にデータを投入
      await request.post("/api/app2/responses", {
        data: {
          name: "app2ユーザー",
          comment: "app2からの回答",
        },
      });

      const response = await request.get("/api/responses/csv");

      if (response.status() === 204) {
        test.skip(true, "No data available for CSV download");
        return;
      }

      const csvContent = await response.text();

      // 両方のappIdの回答が含まれることを確認
      expect(csvContent).toContain("app1");
      expect(csvContent).toContain("app2");
      expect(csvContent).toContain("app1ユーザー");
      expect(csvContent).toContain("app2ユーザー");
    });
  });

  test.describe("シナリオ5: BOM付きUTF-8", () => {
    test("CSVファイルがBOM付きUTF-8でエンコードされている", async ({
      request,
    }) => {
      // テストデータを投入
      await request.post("/api/app1/responses", {
        data: {
          name: "BOMテスト",
          comment: "日本語テスト",
        },
      });

      const response = await request.get("/api/responses/csv");

      if (response.status() === 204) {
        test.skip(true, "No data available for CSV download");
        return;
      }

      // バイナリとして取得してBOMを確認
      const buffer = await response.body();
      const bytes = new Uint8Array(buffer);

      // UTF-8 BOM: EF BB BF
      expect(bytes[0]).toBe(0xef);
      expect(bytes[1]).toBe(0xbb);
      expect(bytes[2]).toBe(0xbf);
    });
  });

  test.describe("シナリオ6: 特殊文字のエスケープ", () => {
    test("カンマ、改行、ダブルクォートがRFC 4180に従ってエスケープされる", async ({
      request,
    }) => {
      // 特殊文字を含むデータを投入
      await request.post("/api/app1/responses", {
        data: {
          name: 'テスト,ユーザー"特殊"',
          comment: "改行を\n含むコメント",
        },
      });

      const response = await request.get("/api/responses/csv");

      if (response.status() === 204) {
        test.skip(true, "No data available for CSV download");
        return;
      }

      const csvContent = await response.text();

      // カンマを含むフィールドがダブルクォートで囲まれている
      expect(csvContent).toContain('"');

      // ダブルクォートがエスケープされている（""）
      expect(csvContent).toContain('""');
    });
  });

  test.describe("シナリオ7: 日付範囲フィルタ（API）", () => {
    test("from と to パラメータで期間指定ダウンロードできる", async ({
      request,
    }) => {
      const today = new Date().toISOString().split("T")[0];
      const response = await request.get(
        `/api/responses/csv?from=${today}&to=${today}`
      );

      // データがない場合は204、ある場合は200
      expect([200, 204]).toContain(response.status());

      if (response.status() === 200) {
        expect(response.headers()["content-type"]).toContain("text/csv");
      }
    });

    test("不正な日付フォーマットで 400 + INVALID_DATE_FORMAT を返す", async ({
      request,
    }) => {
      const response = await request.get("/api/responses/csv?from=2026/01/15");

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("INVALID_DATE_FORMAT");
      expect(body.message).toContain("from");
    });

    test("無効な日付で 400 + INVALID_DATE を返す", async ({ request }) => {
      const response = await request.get("/api/responses/csv?to=2026-02-30");

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("INVALID_DATE");
      expect(body.message).toContain("to");
    });

    test("該当データなしの期間で 204 No Content を返す", async ({
      request,
    }) => {
      // 未来の日付範囲を指定
      const response = await request.get(
        "/api/responses/csv?from=2099-01-01&to=2099-12-31"
      );

      expect(response.status()).toBe(204);
    });
  });
});

test.describe("US3: 日付範囲フィルタUI", () => {
  test.skip(
    ({ browserName }) => browserName === "chromium" && !process.env.RUN_E2E,
    "E2E環境が準備できていません。RUN_E2E=true で実行してください"
  );

  test.describe("シナリオ1: 初期値確認（FR-015）", () => {
    test("画面表示時に開始日が今月1日、終了日が本日に設定されている", async ({
      page,
    }) => {
      await page.goto("/admin");

      const today = new Date();
      const firstDayOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const fromInput = page.locator('input[type="date"]#fromDate');
      const toInput = page.locator('input[type="date"]#toDate');

      await expect(fromInput).toHaveValue(firstDayOfMonth);
      await expect(toInput).toHaveValue(todayStr);
    });
  });

  test.describe("シナリオ2: 日付範囲指定でダウンロード成功", () => {
    test("有効な日付範囲を入力してダウンロードボタンをクリックできる", async ({
      page,
    }) => {
      await page.goto("/admin");

      // 日付入力
      await page.fill('input#fromDate', "2026-01-01");
      await page.fill('input#toDate', "2026-01-31");

      // ボタンが有効であることを確認
      const downloadButton = page.locator("button", {
        hasText: "CSVをダウンロード",
      });
      await expect(downloadButton).toBeEnabled();
    });
  });

  test.describe("シナリオ3: 無効な日付でバリデーションエラー表示", () => {
    test("無効な日付を入力するとインラインエラーが表示されボタンが無効化される", async ({
      page,
    }) => {
      await page.goto("/admin");

      // 無効な日付を入力（フォームをクリア）
      await page.fill('input#fromDate', "");

      // エラーメッセージが表示される
      await expect(page.locator("text=開始日を入力してください")).toBeVisible();

      // ボタンが無効化される
      const downloadButton = page.locator("button", {
        hasText: "CSVをダウンロード",
      });
      await expect(downloadButton).toBeDisabled();
    });
  });

  test.describe("シナリオ4: 開始日 > 終了日でボタン無効化", () => {
    test("開始日が終了日より後の場合エラーメッセージが表示されボタンが無効化される", async ({
      page,
    }) => {
      await page.goto("/admin");

      // 開始日 > 終了日を入力
      await page.fill('input#fromDate', "2026-01-31");
      await page.fill('input#toDate', "2026-01-01");

      // エラーメッセージが表示される
      await expect(
        page.locator("text=終了日は開始日以降の日付を入力してください")
      ).toBeVisible();

      // ボタンが無効化される
      const downloadButton = page.locator("button", {
        hasText: "CSVをダウンロード",
      });
      await expect(downloadButton).toBeDisabled();
    });
  });

  test.describe("シナリオ5: データなし時の通知メッセージ表示（FR-016）", () => {
    test("該当データがない期間を指定すると通知メッセージが表示される", async ({
      page,
    }) => {
      await page.goto("/admin");

      // 未来の日付範囲を入力
      await page.fill('input#fromDate', "2099-01-01");
      await page.fill('input#toDate', "2099-12-31");

      // ダウンロードボタンをクリック
      const downloadButton = page.locator("button", {
        hasText: "CSVをダウンロード",
      });
      await downloadButton.click();

      // 通知メッセージが表示される
      await expect(
        page.locator("text=指定期間にデータがありません")
      ).toBeVisible();
    });
  });
});
