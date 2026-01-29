import { describe, it, expect } from "vitest";
import { generateCsv } from "../../src/lib/csv";
import type { FeedbackResponse } from "../../src/shared/types";

describe("generateCsv", () => {
  describe("BOMの存在確認", () => {
    it("CSVの先頭にUTF-8 BOMが付与される", () => {
      const responses: FeedbackResponse[] = [
        {
          PK: "RESPONSE#01",
          SK: "app1#2024-01-01T00:00:00.000Z",
          responseId: "01",
          appId: "app1",
          submittedAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      const csv = generateCsv(responses);
      const bom = "\uFEFF";

      expect(csv.startsWith(bom)).toBe(true);
    });

    it("空の配列の場合は空文字を返す（BOMなし）", () => {
      const csv = generateCsv([]);

      expect(csv).toBe("");
    });
  });

  describe("特殊文字エスケープ", () => {
    it("カンマを含むフィールドはダブルクォートで囲まれる", () => {
      const responses: FeedbackResponse[] = [
        {
          PK: "RESPONSE#01",
          SK: "app1#2024-01-01T00:00:00.000Z",
          responseId: "01",
          appId: "app1",
          submittedAt: "2024-01-01T00:00:00.000Z",
          name: "田中,太郎",
        },
      ];

      const csv = generateCsv(responses);

      expect(csv).toContain('"田中,太郎"');
    });

    it("ダブルクォートを含むフィールドは二重にエスケープされる", () => {
      const responses: FeedbackResponse[] = [
        {
          PK: "RESPONSE#01",
          SK: "app1#2024-01-01T00:00:00.000Z",
          responseId: "01",
          appId: "app1",
          submittedAt: "2024-01-01T00:00:00.000Z",
          comment: 'これは"テスト"です',
        },
      ];

      const csv = generateCsv(responses);

      expect(csv).toContain('"これは""テスト""です"');
    });

    it("改行を含むフィールドはダブルクォートで囲まれる", () => {
      const responses: FeedbackResponse[] = [
        {
          PK: "RESPONSE#01",
          SK: "app1#2024-01-01T00:00:00.000Z",
          responseId: "01",
          appId: "app1",
          submittedAt: "2024-01-01T00:00:00.000Z",
          comment: "1行目\n2行目",
        },
      ];

      const csv = generateCsv(responses);

      expect(csv).toContain('"1行目\n2行目"');
    });

    it("nullまたはundefinedは空文字として出力される", () => {
      const responses: FeedbackResponse[] = [
        {
          PK: "RESPONSE#01",
          SK: "app1#2024-01-01T00:00:00.000Z",
          responseId: "01",
          appId: "app1",
          submittedAt: "2024-01-01T00:00:00.000Z",
          name: undefined,
        },
      ];

      const csv = generateCsv(responses);
      const lines = csv.split("\r\n");
      const dataLine = lines[1];

      // name列の位置に空文字が入ることを確認
      expect(dataLine).toContain("01,app1,2024-01-01T00:00:00.000Z,");
    });
  });

  describe("動的カラム生成", () => {
    it("固定カラム（responseId, appId, submittedAt）は常に先頭に配置される", () => {
      const responses: FeedbackResponse[] = [
        {
          PK: "RESPONSE#01",
          SK: "app1#2024-01-01T00:00:00.000Z",
          responseId: "01",
          appId: "app1",
          submittedAt: "2024-01-01T00:00:00.000Z",
          zebra: "最後のはず",
          apple: "先頭のはず",
        },
      ];

      const csv = generateCsv(responses);
      const lines = csv.split("\r\n");
      const header = lines[0].replace("\uFEFF", "");

      // 固定カラムが先頭
      expect(header.startsWith("responseId,appId,submittedAt")).toBe(true);

      // 動的カラムはアルファベット順
      const columns = header.split(",");
      expect(columns[3]).toBe("apple");
      expect(columns[4]).toBe("zebra");
    });

    it("PK, SK はCSVから除外される", () => {
      const responses: FeedbackResponse[] = [
        {
          PK: "RESPONSE#01",
          SK: "app1#2024-01-01T00:00:00.000Z",
          responseId: "01",
          appId: "app1",
          submittedAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      const csv = generateCsv(responses);

      expect(csv).not.toContain(",PK,");
      expect(csv).not.toContain(",SK,");
      expect(csv).not.toContain("PK,");
    });

    it("複数レコードから全ての動的カラムが収集される", () => {
      const responses: FeedbackResponse[] = [
        {
          PK: "RESPONSE#01",
          SK: "app1#2024-01-01T00:00:00.000Z",
          responseId: "01",
          appId: "app1",
          submittedAt: "2024-01-01T00:00:00.000Z",
          fieldA: "値A",
        },
        {
          PK: "RESPONSE#02",
          SK: "app1#2024-01-01T00:00:01.000Z",
          responseId: "02",
          appId: "app1",
          submittedAt: "2024-01-01T00:00:01.000Z",
          fieldB: "値B",
        },
      ];

      const csv = generateCsv(responses);
      const header = csv.split("\r\n")[0];

      // 両方のフィールドがヘッダーに含まれる
      expect(header).toContain("fieldA");
      expect(header).toContain("fieldB");
    });

    it("存在しないフィールドは空白で出力される", () => {
      const responses: FeedbackResponse[] = [
        {
          PK: "RESPONSE#01",
          SK: "app1#2024-01-01T00:00:00.000Z",
          responseId: "01",
          appId: "app1",
          submittedAt: "2024-01-01T00:00:00.000Z",
          name: "山田",
        },
        {
          PK: "RESPONSE#02",
          SK: "app1#2024-01-01T00:00:01.000Z",
          responseId: "02",
          appId: "app1",
          submittedAt: "2024-01-01T00:00:01.000Z",
          rating: 3,
        },
      ];

      const csv = generateCsv(responses);
      const lines = csv.split("\r\n");

      // 1番目のレコードはnameあり、ratingなし
      expect(lines[1]).toContain("山田");

      // 2番目のレコードはnameなし、ratingあり
      expect(lines[2]).toContain(",3");
    });
  });

  describe("行区切り", () => {
    it("行区切りはCRLF（\\r\\n）である", () => {
      const responses: FeedbackResponse[] = [
        {
          PK: "RESPONSE#01",
          SK: "app1#2024-01-01T00:00:00.000Z",
          responseId: "01",
          appId: "app1",
          submittedAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      const csv = generateCsv(responses);

      expect(csv).toContain("\r\n");
      expect(csv.split("\r\n").length).toBe(2); // ヘッダー + 1データ行
    });
  });
});
