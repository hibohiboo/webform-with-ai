import { generateCsv } from "../lib/csv";
import { scanAllResponses } from "../lib/dynamodb";
import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const responses = await scanAllResponses();

    // 回答がない場合は 204 No Content
    if (responses.length === 0) {
      const result: APIGatewayProxyResult = {
        statusCode: 204,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
        body: "",
      };
      return result;
    }

    const csv = generateCsv(responses);

    // CSVをテキストとして直接返す
    const result: APIGatewayProxyResult = {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="feedback.csv"',
        "Access-Control-Allow-Origin": "*",
      },
      body: csv,
      isBase64Encoded: false,
    };
    return result;
  } catch (error) {
    console.error("Error downloading CSV:", error);
    const result: APIGatewayProxyResult = {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Internal server error" }),
    };
    return result;
  }
};
