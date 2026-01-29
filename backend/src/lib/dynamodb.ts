import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { FeedbackResponse } from "../shared/types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME ?? "WebformResponses";

/**
 * フィードバック回答をDynamoDBに保存
 */
export async function putResponse(response: FeedbackResponse): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: response,
    }),
  );
}

/**
 * 全てのフィードバック回答を取得（ページネーション対応）
 */
export async function scanAllResponses(): Promise<FeedbackResponse[]> {
  const items: FeedbackResponse[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    if (result.Items) {
      items.push(...(result.Items as FeedbackResponse[]));
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}
