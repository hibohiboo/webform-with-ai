import type { FeedbackResponse, DateRangeParams, DateValidationError } from '../shared/types';

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** JST オフセット（時間）: UTC+9 */
const JST_OFFSET_HOURS = 9;

/**
 * 日付フォーマット検証 (YYYY-MM-DD)
 * @param date 日付文字列
 * @param paramName パラメータ名 (エラーメッセージ用)
 * @returns エラーがあれば DateValidationError、なければ null
 */
export function validateDateFormat(
  date: string,
  paramName: 'from' | 'to'
): DateValidationError | null {
  if (!DATE_FORMAT_REGEX.test(date)) {
    return {
      error: 'INVALID_DATE_FORMAT',
      message: `${paramName} パラメータは YYYY-MM-DD 形式で指定してください`,
    };
  }
  return null;
}

/**
 * 日付値検証 (実在する日付か)
 * @param date 日付文字列 (YYYY-MM-DD形式)
 * @param paramName パラメータ名 (エラーメッセージ用)
 * @returns エラーがあれば DateValidationError、なければ null
 */
export function validateDateValue(
  date: string,
  paramName: 'from' | 'to'
): DateValidationError | null {
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return {
      error: 'INVALID_DATE',
      message: `${paramName} パラメータに無効な日付が指定されています`,
    };
  }
  return null;
}

/**
 * 日付範囲パラメータの包括的検証
 * @param params 日付範囲パラメータ
 * @returns エラーがあれば DateValidationError、なければ null
 */
export function validateDateRange(params: DateRangeParams): DateValidationError | null {
  if (params.from) {
    const formatError = validateDateFormat(params.from, 'from');
    if (formatError) return formatError;

    const valueError = validateDateValue(params.from, 'from');
    if (valueError) return valueError;
  }

  if (params.to) {
    const formatError = validateDateFormat(params.to, 'to');
    if (formatError) return formatError;

    const valueError = validateDateValue(params.to, 'to');
    if (valueError) return valueError;
  }

  return null;
}

/**
 * JST 日付文字列を UTC タイムスタンプに変換
 * - from: 指定日の 00:00:00.000 JST → 前日 15:00:00.000 UTC
 * - to: 指定日の 23:59:59.999 JST → 同日 14:59:59.999 UTC
 *
 * @param date 日付文字列 (YYYY-MM-DD形式、JST として解釈)
 * @param type 'from' (00:00:00 JST) または 'to' (23:59:59.999 JST)
 * @returns ISO 8601形式のUTCタイムスタンプ
 */
export function toJstUtcTimestamp(date: string, type: 'from' | 'to'): string {
  const [year, month, day] = date.split('-').map(Number);

  if (type === 'from') {
    // JST 00:00:00.000 → UTC -9時間 = 前日 15:00:00.000
    const jstMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const utcTimestamp = new Date(jstMidnight.getTime() - JST_OFFSET_HOURS * 60 * 60 * 1000);
    return utcTimestamp.toISOString();
  }

  // type === 'to'
  // JST 23:59:59.999 → UTC -9時間 = 同日 14:59:59.999
  const jstEndOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  const utcTimestamp = new Date(jstEndOfDay.getTime() - JST_OFFSET_HOURS * 60 * 60 * 1000);
  return utcTimestamp.toISOString();
}

/**
 * 日付範囲でフィードバック回答をフィルタリング
 * 日付は JST として解釈し、UTC に変換して比較する
 *
 * @param responses フィードバック回答配列
 * @param params 日付範囲パラメータ (JST として解釈)
 * @returns フィルタリング後の回答配列
 */
export function filterByDateRange(
  responses: FeedbackResponse[],
  params: DateRangeParams
): FeedbackResponse[] {
  if (!params.from && !params.to) {
    return responses;
  }

  const fromTimestamp = params.from ? toJstUtcTimestamp(params.from, 'from') : null;
  const toTimestamp = params.to ? toJstUtcTimestamp(params.to, 'to') : null;

  return responses.filter((response) => {
    const submittedAt = response.submittedAt;

    if (fromTimestamp && submittedAt < fromTimestamp) {
      return false;
    }

    if (toTimestamp && submittedAt > toTimestamp) {
      return false;
    }

    return true;
  });
}
