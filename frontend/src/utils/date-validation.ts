/**
 * 日付バリデーションユーティリティ
 */

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * YYYY-MM-DD 形式かつ有効な日付かを検証
 * @param dateString 日付文字列
 * @returns 有効な場合 true
 */
export function isValidDate(dateString: string): boolean {
  if (!DATE_FORMAT_REGEX.test(dateString)) {
    return false;
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
}

/**
 * 今月の1日を YYYY-MM-DD 形式で返す
 * @returns 今月1日の日付文字列
 */
export function getFirstDayOfCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * 本日を YYYY-MM-DD 形式で返す
 * @returns 本日の日付文字列
 */
export function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
