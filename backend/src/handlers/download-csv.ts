import { generateCsv } from '../lib/csv';
import { scanAllResponses } from '../lib/dynamodb';
import { validateDateRange, filterByDateRange } from '../lib/date-filter';
import type { DateRangeParams } from '../shared/types';
import type { APIGatewayProxyHandler, APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';

/**
 * クエリパラメータから日付範囲パラメータを抽出
 */
function extractDateRangeParams(event: APIGatewayProxyEvent): DateRangeParams {
  const params: DateRangeParams = {};

  if (event.queryStringParameters?.from) {
    params.from = event.queryStringParameters.from;
  }

  if (event.queryStringParameters?.to) {
    params.to = event.queryStringParameters.to;
  }

  return params;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // 日付範囲パラメータを取得
    const dateParams = extractDateRangeParams(event);

    // パラメータバリデーション
    const validationError = validateDateRange(dateParams);
    if (validationError) {
      const result: APIGatewayProxyResult = {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: validationError.error,
          message: validationError.message,
        }),
      };
      return result;
    }

    // 全件取得
    const responses = await scanAllResponses();

    // 日付範囲でフィルタリング（パラメータ未指定時は全件返却）
    const filteredResponses = filterByDateRange(responses, dateParams);

    // フィルタ後のデータが空の場合は 204 No Content
    if (filteredResponses.length === 0) {
      const result: APIGatewayProxyResult = {
        statusCode: 204,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
        body: '',
      };
      return result;
    }

    const csv = generateCsv(filteredResponses);

    // CSVをテキストとして直接返す
    const result: APIGatewayProxyResult = {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="feedback.csv"',
        'Access-Control-Allow-Origin': '*',
      },
      body: csv,
      isBase64Encoded: false,
    };
    return result;
  } catch (error) {
    console.error('Error downloading CSV:', error);
    const result: APIGatewayProxyResult = {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
    return result;
  }
};
