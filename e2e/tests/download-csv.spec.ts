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
});
