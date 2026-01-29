import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";

// モックを定義
vi.mock("ulid", () => ({
  ulid: vi.fn(() => "01ARZ3NDEKTSV4RRFFQ69G5FAV"),
}));

vi.mock("../../src/lib/dynamodb", () => ({
  putResponse: vi.fn(),
}));

// モジュールをインポート
import { handler } from "../../src/handlers/submit-response";
import { putResponse } from "../../src/lib/dynamodb";

const mockPutResponse = vi.mocked(putResponse);

describe("submit-response handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:30:00.000Z"));
  });

  const createEvent = (
    overrides: Partial<APIGatewayProxyEvent> = {}
  ): APIGatewayProxyEvent => ({
    httpMethod: "POST",
    path: "/api/app1/responses",
    pathParameters: { appId: "app1" },
    body: null,
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "",
    isBase64Encoded: false,
    ...overrides,
  });

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

  describe("正常系", () => {
    it("空のボディで送信成功（すべて任意入力）", async () => {
      mockPutResponse.mockResolvedValue(undefined);

      const event = createEvent();
      const result = await handler(event, mockContext, () => {});

      expect(result).toEqual({
        statusCode: 201,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          responseId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
          submittedAt: "2024-01-15T10:30:00.000Z",
        }),
      });

      expect(mockPutResponse).toHaveBeenCalledWith({
        PK: "RESPONSE#01ARZ3NDEKTSV4RRFFQ69G5FAV",
        SK: "app1#2024-01-15T10:30:00.000Z",
        responseId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        appId: "app1",
        submittedAt: "2024-01-15T10:30:00.000Z",
      });
    });

    it("全フィールド入力で送信成功", async () => {
      mockPutResponse.mockResolvedValue(undefined);

      const event = createEvent({
        body: JSON.stringify({
          name: "山田太郎",
          rating: 3,
          comment: "とても良いです",
        }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result).toEqual({
        statusCode: 201,
        headers: expect.any(Object),
        body: expect.any(String),
      });

      expect(mockPutResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "山田太郎",
          rating: 3,
          comment: "とても良いです",
          appId: "app1",
        })
      );
    });

    it("追加フィールドも保存される（スキーマ進化対応）", async () => {
      mockPutResponse.mockResolvedValue(undefined);

      const event = createEvent({
        body: JSON.stringify({
          name: "テスト",
          customField: "カスタム値",
          anotherField: 123,
        }),
      });
      await handler(event, mockContext, () => {});

      expect(mockPutResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          customField: "カスタム値",
          anotherField: 123,
        })
      );
    });

    it("異なるappIdで送信成功", async () => {
      mockPutResponse.mockResolvedValue(undefined);

      const event = createEvent({
        pathParameters: { appId: "app2" },
      });
      await handler(event, mockContext, () => {});

      expect(mockPutResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          appId: "app2",
          SK: "app2#2024-01-15T10:30:00.000Z",
        })
      );
    });
  });

  describe("エラー系", () => {
    it("appIdがない場合は400を返す", async () => {
      const event = createEvent({
        pathParameters: null,
      });
      const result = await handler(event, mockContext, () => {});

      expect(result).toEqual({
        statusCode: 400,
        headers: expect.any(Object),
        body: JSON.stringify({ message: "appId is required" }),
      });

      expect(mockPutResponse).not.toHaveBeenCalled();
    });

    it("不正なJSONの場合は400を返す", async () => {
      const event = createEvent({
        body: "invalid json",
      });
      const result = await handler(event, mockContext, () => {});

      expect(result).toEqual({
        statusCode: 400,
        headers: expect.any(Object),
        body: JSON.stringify({ message: "Invalid JSON body" }),
      });

      expect(mockPutResponse).not.toHaveBeenCalled();
    });

    it("DynamoDB エラーの場合は500を返す", async () => {
      mockPutResponse.mockRejectedValue(new Error("DynamoDB error"));

      const event = createEvent({
        body: JSON.stringify({ name: "テスト" }),
      });
      const result = await handler(event, mockContext, () => {});

      expect(result).toEqual({
        statusCode: 500,
        headers: expect.any(Object),
        body: JSON.stringify({ message: "Internal server error" }),
      });
    });
  });

  describe("ULID生成", () => {
    it("レスポンスにresponseIdが含まれる", async () => {
      mockPutResponse.mockResolvedValue(undefined);

      const event = createEvent();
      const result = await handler(event, mockContext, () => {});
      const body = JSON.parse((result as { body: string }).body);

      expect(body.responseId).toBe("01ARZ3NDEKTSV4RRFFQ69G5FAV");
    });
  });

  describe("タイムスタンプ", () => {
    it("submittedAtがISO 8601形式で生成される", async () => {
      mockPutResponse.mockResolvedValue(undefined);

      const event = createEvent();
      const result = await handler(event, mockContext, () => {});
      const body = JSON.parse((result as { body: string }).body);

      expect(body.submittedAt).toBe("2024-01-15T10:30:00.000Z");
    });
  });
});
