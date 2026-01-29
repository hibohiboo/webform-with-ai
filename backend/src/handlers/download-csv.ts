import type { APIGatewayProxyHandler } from "aws-lambda";
import { scanAllResponses } from "../lib/dynamodb";
import { generateCsv } from "../lib/csv";

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const responses = await scanAllResponses();

    // 回答がない場合は 204 No Content
    if (responses.length === 0) {
      return {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: "",
      };
    }

    const csv = generateCsv(responses);

    // Base64 エンコードして返す（バイナリレスポンス）
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="feedback.csv"',
        "Access-Control-Allow-Origin": "*",
      },
      body: Buffer.from(csv, "utf-8").toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("Error downloading CSV:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
