/**
 * 日付バリデーションユーティリティ
 */

import { format, isValid, parse, startOfMonth } from 'date-fns';

const DATE_FORMAT = 'yyyy-MM-dd';

/**
 * YYYY-MM-DD 形式かつ有効な日付かを検証
 * @param dateString 日付文字列
 * @returns 有効な場合 true
 */
export function isValidDate(dateString: string): boolean {
  const parsed = parse(dateString, DATE_FORMAT, new Date());
  return isValid(parsed) && format(parsed, DATE_FORMAT) === dateString;
}

/**
 * 今月の1日を YYYY-MM-DD 形式で返す
 * @returns 今月1日の日付文字列
 */
export function getFirstDayOfCurrentMonth(): string {
  return format(startOfMonth(new Date()), DATE_FORMAT);
}

/**
 * 本日を YYYY-MM-DD 形式で返す
 * @returns 本日の日付文字列
 */
export function getToday(): string {
  return format(new Date(), DATE_FORMAT);
}

/**
 * 開始日が終了日より後かを判定
 * @param start 開始日（YYYY-MM-DD）
 * @param end 終了日（YYYY-MM-DD）
 * @returns 開始日 > 終了日 の場合 true
 */
export function isStartAfterEnd(start: string, end: string): boolean {
  return start > end;
}