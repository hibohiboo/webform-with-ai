import { ulid } from "ulid";
import { putResponse } from "../lib/dynamodb";
import type {
  FeedbackResponse,
  SubmitResponseBody,
  SubmitResponseResult,
} from "../shared/types";
import type { APIGatewayProxyHandler } from "aws-lambda";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const appId = event.pathParameters?.appId;
    if (!appId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "appId is required" }),
      };
    }

    // リクエストボディをパース（空の場合は空オブジェクト）
    let body: SubmitResponseBody = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: "Invalid JSON body" }),
        };
      }
    }

    // ULID で responseId を生成
    const responseId = ulid();
    const submittedAt = new Date().toISOString();

    // DynamoDB に保存するアイテムを構築
    const item: FeedbackResponse = {
      PK: `RESPONSE#${responseId}`,
      SK: `${appId}#${submittedAt}`,
      responseId,
      appId,
      submittedAt,
      ...body,
    };

    await putResponse(item);

    const result: SubmitResponseResult = {
      responseId,
      submittedAt,
    };

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Error submitting response:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
