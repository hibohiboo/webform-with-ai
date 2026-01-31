import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler as downloadCsvHandler } from "../../src/handlers/download-csv";
import { handler as submitHandler } from "../../src/handlers/submit-response";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";

/**
 * API統合テスト
 * ハンドラーとDynamoDB層の統合をテスト
 * 実際のDynamoDBはモックを使用
 */

// mockSend を vi.hoisted で宣言
const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

// DynamoDBクライアントをモック
vi.mock("@aws-sdk/lib-dynamodb", () => {
  return {
    DynamoDBDocumentClient: {
      from: vi.fn(() => ({
        send: mockSend,
      })),
    },
    PutCommand: class PutCommand {
      input: Record<string, unknown>;
      type = "Put";
      constructor(params: Record<string, unknown>) {
        this.input = params;
      }
    },
    ScanCommand: class ScanCommand {
      input: Record<string, unknown>;
      type = "Scan";
      constructor(params: Record<string, unknown>) {
        this.input = params;
      }
    },
  };
});

vi.mock("@aws-sdk/client-dynamodb", () => {
  return {
    DynamoDBClient: class DynamoDBClient {
      constructor() {}
    },
  };
});

vi.mock("ulid", () => ({
  ulid: vi.fn(() => "01ARZ3NDEKTSV4RRFFQ69G5FAV"),
}));

// 環境変数を設定
process.env.TABLE_NAME = "TestTable";

// ハンドラーをインポート

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: "test",
  functionVersion: "1",
  invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:test",
  memoryLimitInMB: "128",
  awsRequestId: "test-request-id",
  logGroupName: "test-log-group",
  logStreamName: "test-log-stream",
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

const createSubmitEvent = (
  appId: string,
  body: Record<string, unknown> | null,
): APIGatewayProxyEvent => ({
  httpMethod: "POST",
  path: `/api/${appId}/responses`,
  pathParameters: { appId },
  body: body ? JSON.stringify(body) : null,
  headers: { "Content-Type": "application/json" },
  multiValueHeaders: {},
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {} as APIGatewayProxyEvent["requestContext"],
  resource: "",
  isBase64Encoded: false,
});

const createDownloadCsvEvent = (
  queryParams?: Record<string, string> | null
): APIGatewayProxyEvent => ({
  httpMethod: 'GET',
  path: '/api/responses/csv',
  pathParameters: null,
  body: null,
  headers: {},
  multiValueHeaders: {},
  queryStringParameters: queryParams ?? null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {} as APIGatewayProxyEvent['requestContext'],
  resource: '',
  isBase64Encoded: false,
});

describe("API統合テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:30:00.000Z"));
  });

  describe("フォーム送信 → CSV ダウンロードフロー", () => {
    it("送信したデータがCSVでダウンロードできる", async () => {
      // 1. フォーム送信
      mockSend.mockResolvedValueOnce({}); // PutCommand成功

      const submitEvent = createSubmitEvent("app1", {
        name: "山田太郎",
        rating: 3,
        comment: "テストコメント",
      });

      const submitResult = await submitHandler(
        submitEvent,
        mockContext,
        () => {},
      );
      expect(submitResult).toMatchObject({ statusCode: 201 });

      // PutCommandが呼ばれたことを確認
      expect(mockSend).toHaveBeenCalledTimes(1);
      const putCall = mockSend.mock.calls[0][0];
      expect(putCall.type).toBe("Put");
      expect(putCall.input.Item).toMatchObject({
        appId: "app1",
        name: "山田太郎",
        rating: 3,
        comment: "テストコメント",
      });

      // 2. CSVダウンロード
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            PK: "RESPONSE#01ARZ3NDEKTSV4RRFFQ69G5FAV",
            SK: "app1#2024-01-15T10:30:00.000Z",
            responseId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
            appId: "app1",
            submittedAt: "2024-01-15T10:30:00.000Z",
            name: "山田太郎",
            rating: 3,
            comment: "テストコメント",
          },
        ],
        LastEvaluatedKey: undefined,
      });

      const downloadEvent = createDownloadCsvEvent();
      const downloadResult = await downloadCsvHandler(
        downloadEvent,
        mockContext,
        () => {},
      );

      expect(downloadResult).toMatchObject({ statusCode: 200 });

      // CSVの内容を確認（直接テキスト）
      const csvContent = (downloadResult as { body: string }).body;

      expect(csvContent).toContain("responseId");
      expect(csvContent).toContain("appId");
      expect(csvContent).toContain("山田太郎");
      expect(csvContent).toContain("テストコメント");
    });
  });

  describe("複数アプリからの送信", () => {
    it("異なるappIdの回答がすべてCSVに含まれる", async () => {
      // app1とapp2の回答をモック
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            PK: "RESPONSE#01",
            SK: "app1#2024-01-15T10:30:00.000Z",
            responseId: "01",
            appId: "app1",
            submittedAt: "2024-01-15T10:30:00.000Z",
            name: "app1ユーザー",
          },
          {
            PK: "RESPONSE#02",
            SK: "app2#2024-01-15T10:31:00.000Z",
            responseId: "02",
            appId: "app2",
            submittedAt: "2024-01-15T10:31:00.000Z",
            name: "app2ユーザー",
          },
        ],
        LastEvaluatedKey: undefined,
      });

      const downloadEvent = createDownloadCsvEvent();
      const result = await downloadCsvHandler(
        downloadEvent,
        mockContext,
        () => {},
      );

      expect(result).toMatchObject({ statusCode: 200 });

      const csvContent = (result as { body: string }).body;

      expect(csvContent).toContain("app1");
      expect(csvContent).toContain("app2");
      expect(csvContent).toContain("app1ユーザー");
      expect(csvContent).toContain("app2ユーザー");
    });
  });

  describe("スキーマ進化", () => {
    it("異なるフィールドセットを持つ回答がCSVで正しく出力される", async () => {
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            PK: "RESPONSE#01",
            SK: "app1#2024-01-15T10:30:00.000Z",
            responseId: "01",
            appId: "app1",
            submittedAt: "2024-01-15T10:30:00.000Z",
            name: "ユーザー1",
            customFieldA: "値A",
          },
          {
            PK: "RESPONSE#02",
            SK: "app1#2024-01-15T10:31:00.000Z",
            responseId: "02",
            appId: "app1",
            submittedAt: "2024-01-15T10:31:00.000Z",
            name: "ユーザー2",
            customFieldB: "値B",
          },
        ],
        LastEvaluatedKey: undefined,
      });

      const downloadEvent = createDownloadCsvEvent();
      const result = await downloadCsvHandler(
        downloadEvent,
        mockContext,
        () => {},
      );

      const csvContent = (result as { body: string }).body;

      // ヘッダーに両方のカスタムフィールドが含まれる
      const headerLine = csvContent.split("\r\n")[0];
      expect(headerLine).toContain("customFieldA");
      expect(headerLine).toContain("customFieldB");

      // 各データが含まれる
      expect(csvContent).toContain("値A");
      expect(csvContent).toContain("値B");
    });
  });

  describe("データなしの場合", () => {
    it("データがない場合は204を返す", async () => {
      mockSend.mockResolvedValueOnce({
        Items: [],
        LastEvaluatedKey: undefined,
      });

      const downloadEvent = createDownloadCsvEvent();
      const result = await downloadCsvHandler(
        downloadEvent,
        mockContext,
        () => {},
      );

      expect(result).toMatchObject({ statusCode: 204 });
    });
  });

  describe("ページネーション", () => {
    it("複数ページのデータを取得してCSVに含める", async () => {
      // 1ページ目
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            PK: "RESPONSE#01",
            SK: "app1#2024-01-15T10:30:00.000Z",
            responseId: "01",
            appId: "app1",
            submittedAt: "2024-01-15T10:30:00.000Z",
            name: "ページ1ユーザー",
          },
        ],
        LastEvaluatedKey: { PK: "RESPONSE#01" },
      });

      // 2ページ目
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            PK: "RESPONSE#02",
            SK: "app1#2024-01-15T10:31:00.000Z",
            responseId: "02",
            appId: "app1",
            submittedAt: "2024-01-15T10:31:00.000Z",
            name: "ページ2ユーザー",
          },
        ],
        LastEvaluatedKey: undefined,
      });

      const downloadEvent = createDownloadCsvEvent();
      const result = await downloadCsvHandler(
        downloadEvent,
        mockContext,
        () => {},
      );

      const csvContent = (result as { body: string }).body;

      // 両方のページのデータが含まれる
      expect(csvContent).toContain("ページ1ユーザー");
      expect(csvContent).toContain("ページ2ユーザー");

      // Scanが2回呼ばれた
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('日付範囲フィルタ', () => {
    // テストデータ: UTC タイムスタンプで保存
    // JST で考えると:
    // - 01: 2026-01-10 19:00:00 JST
    // - 02: 2026-01-15 00:00:00 JST (境界値)
    // - 03: 2026-01-15 12:00:00 JST
    // - 04: 2026-01-15 23:59:59.999 JST (境界値)
    // - 05: 2026-01-21 00:00:00 JST
    const mockDateRangeItems = [
      {
        PK: 'RESPONSE#01',
        SK: 'app1#2026-01-10T10:00:00.000Z',
        responseId: '01',
        appId: 'app1',
        submittedAt: '2026-01-10T10:00:00.000Z', // = 2026-01-10 19:00:00 JST
        name: 'ユーザー1',
      },
      {
        PK: 'RESPONSE#02',
        SK: 'app1#2026-01-14T15:00:00.000Z',
        responseId: '02',
        appId: 'app1',
        submittedAt: '2026-01-14T15:00:00.000Z', // = 2026-01-15 00:00:00 JST
        name: 'ユーザー2（境界値開始）',
      },
      {
        PK: 'RESPONSE#03',
        SK: 'app1#2026-01-15T03:00:00.000Z',
        responseId: '03',
        appId: 'app1',
        submittedAt: '2026-01-15T03:00:00.000Z', // = 2026-01-15 12:00:00 JST
        name: 'ユーザー3',
      },
      {
        PK: 'RESPONSE#04',
        SK: 'app1#2026-01-15T14:59:59.999Z',
        responseId: '04',
        appId: 'app1',
        submittedAt: '2026-01-15T14:59:59.999Z', // = 2026-01-15 23:59:59.999 JST
        name: 'ユーザー4（境界値終了）',
      },
      {
        PK: 'RESPONSE#05',
        SK: 'app1#2026-01-20T15:00:00.000Z',
        responseId: '05',
        appId: 'app1',
        submittedAt: '2026-01-20T15:00:00.000Z', // = 2026-01-21 00:00:00 JST
        name: 'ユーザー5',
      },
    ];

    it('from と to を指定すると範囲内のデータのみ返す', async () => {
      mockSend.mockResolvedValueOnce({
        Items: mockDateRangeItems,
        LastEvaluatedKey: undefined,
      });

      const event = createDownloadCsvEvent({ from: '2026-01-15', to: '2026-01-15' });
      const result = await downloadCsvHandler(event, mockContext, () => {});

      expect(result).toMatchObject({ statusCode: 200 });
      const csvContent = (result as { body: string }).body;
      // 2026-01-15 JST のデータのみ
      expect(csvContent).toContain('ユーザー2（境界値開始）');
      expect(csvContent).toContain('ユーザー3');
      expect(csvContent).toContain('ユーザー4（境界値終了）');
      expect(csvContent).not.toContain('ユーザー1');
      expect(csvContent).not.toContain('ユーザー5');
    });

    it('from のみ指定するとその日（JST）以降のデータを返す', async () => {
      mockSend.mockResolvedValueOnce({
        Items: mockDateRangeItems,
        LastEvaluatedKey: undefined,
      });

      const event = createDownloadCsvEvent({ from: '2026-01-15' });
      const result = await downloadCsvHandler(event, mockContext, () => {});

      expect(result).toMatchObject({ statusCode: 200 });
      const csvContent = (result as { body: string }).body;
      expect(csvContent).toContain('ユーザー2（境界値開始）');
      expect(csvContent).toContain('ユーザー3');
      expect(csvContent).toContain('ユーザー4（境界値終了）');
      expect(csvContent).toContain('ユーザー5');
      expect(csvContent).not.toContain('ユーザー1');
    });

    it('to のみ指定するとその日（JST）以前のデータを返す', async () => {
      mockSend.mockResolvedValueOnce({
        Items: mockDateRangeItems,
        LastEvaluatedKey: undefined,
      });

      const event = createDownloadCsvEvent({ to: '2026-01-15' });
      const result = await downloadCsvHandler(event, mockContext, () => {});

      expect(result).toMatchObject({ statusCode: 200 });
      const csvContent = (result as { body: string }).body;
      expect(csvContent).toContain('ユーザー1');
      expect(csvContent).toContain('ユーザー2（境界値開始）');
      expect(csvContent).toContain('ユーザー3');
      expect(csvContent).toContain('ユーザー4（境界値終了）');
      expect(csvContent).not.toContain('ユーザー5');
    });

    it('パラメータなしで全件返す（後方互換性）', async () => {
      mockSend.mockResolvedValueOnce({
        Items: mockDateRangeItems,
        LastEvaluatedKey: undefined,
      });

      const event = createDownloadCsvEvent();
      const result = await downloadCsvHandler(event, mockContext, () => {});

      expect(result).toMatchObject({ statusCode: 200 });
      const csvContent = (result as { body: string }).body;
      expect(csvContent).toContain('ユーザー1');
      expect(csvContent).toContain('ユーザー2（境界値開始）');
      expect(csvContent).toContain('ユーザー3');
      expect(csvContent).toContain('ユーザー4（境界値終了）');
      expect(csvContent).toContain('ユーザー5');
    });

    it('不正なフォーマットの日付で 400 + INVALID_DATE_FORMAT を返す', async () => {
      const event = createDownloadCsvEvent({ from: '2026/01/15' });
      const result = await downloadCsvHandler(event, mockContext, () => {});

      expect(result).toMatchObject({ statusCode: 400 });
      const body = JSON.parse((result as { body: string }).body);
      expect(body.error).toBe('INVALID_DATE_FORMAT');
      expect(body.message).toContain('from');
    });

    it('無効な日付で 400 + INVALID_DATE を返す', async () => {
      const event = createDownloadCsvEvent({ to: '2026-02-30' });
      const result = await downloadCsvHandler(event, mockContext, () => {});

      expect(result).toMatchObject({ statusCode: 400 });
      const body = JSON.parse((result as { body: string }).body);
      expect(body.error).toBe('INVALID_DATE');
      expect(body.message).toContain('to');
    });

    it('該当データなしの場合 204 No Content を返す', async () => {
      mockSend.mockResolvedValueOnce({
        Items: mockDateRangeItems,
        LastEvaluatedKey: undefined,
      });

      const event = createDownloadCsvEvent({ from: '2027-01-01', to: '2027-12-31' });
      const result = await downloadCsvHandler(event, mockContext, () => {});

      expect(result).toMatchObject({ statusCode: 204 });
    });

    it('境界値: JST 00:00:00 のデータが from 指定時に含まれる', async () => {
      mockSend.mockResolvedValueOnce({
        Items: mockDateRangeItems,
        LastEvaluatedKey: undefined,
      });

      const event = createDownloadCsvEvent({ from: '2026-01-15' });
      const result = await downloadCsvHandler(event, mockContext, () => {});

      expect(result).toMatchObject({ statusCode: 200 });
      const csvContent = (result as { body: string }).body;
      // 2026-01-15 00:00:00 JST = 2026-01-14T15:00:00.000Z
      expect(csvContent).toContain('ユーザー2（境界値開始）');
    });

    it('境界値: JST 23:59:59.999 のデータが to 指定時に含まれる', async () => {
      mockSend.mockResolvedValueOnce({
        Items: mockDateRangeItems,
        LastEvaluatedKey: undefined,
      });

      const event = createDownloadCsvEvent({ to: '2026-01-15' });
      const result = await downloadCsvHandler(event, mockContext, () => {});

      expect(result).toMatchObject({ statusCode: 200 });
      const csvContent = (result as { body: string }).body;
      // 2026-01-15 23:59:59.999 JST = 2026-01-15T14:59:59.999Z
      expect(csvContent).toContain('ユーザー4（境界値終了）');
    });
  });
});
