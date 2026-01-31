import { useState, useCallback, useMemo } from 'react';
import {
  isValidDate,
  getFirstDayOfCurrentMonth,
  getToday,
  isStartAfterEnd,
} from '../utils/date-validation';

export interface UseDateRangeFormReturn {
  fromDate: string;
  toDate: string;
  fromError: string | null;
  toError: string | null;
  isValid: boolean;
  setFromDate: (date: string) => void;
  setToDate: (date: string) => void;
  validateAll: () => boolean;
}

/**
 * 日付範囲フォームのカスタムフック
 * 初期値: 今月1日〜本日 (FR-015)
 */
export function useDateRangeForm(): UseDateRangeFormReturn {
  const [fromDate, setFromDateInternal] = useState(() => getFirstDayOfCurrentMonth());
  const [toDate, setToDateInternal] = useState(() => getToday());
  const [fromError, setFromError] = useState<string | null>(null);
  const [toError, setToError] = useState<string | null>(null);

  const validateFrom = useCallback((value: string): string | null => {
    if (!value) {
      return '開始日を入力してください';
    }
    if (!isValidDate(value)) {
      return '有効な日付を入力してください';
    }
    return null;
  }, []);

  const validateTo = useCallback((value: string, fromValue: string): string | null => {
    if (!value) {
      return '終了日を入力してください';
    }
    if (!isValidDate(value)) {
      return '有効な日付を入力してください';
    }
    if (fromValue && isValidDate(fromValue) && isStartAfterEnd(fromValue, value)) {
      return '終了日は開始日以降の日付を入力してください';
    }
    return null;
  }, []);

  const setFromDate = useCallback((value: string) => {
    setFromDateInternal(value);
    const error = validateFrom(value);
    setFromError(error);

    // fromが変わった場合、toのエラーをクリア（toErrorWithRangeCheckで再評価される）
    if (!error) {
      setToError(null);
    }
  }, [validateFrom]);

  const setToDate = useCallback((value: string) => {
    setToDateInternal(value);
    const error = validateTo(value, fromDate);
    setToError(error);
  }, [validateTo, fromDate]);

  // fromDateが変更されたときにtoDateの検証を再実行
  const toErrorWithRangeCheck = useMemo(() => {
    if (toError !== null) return toError;
    // fromDateが有効でtoDateも有効な場合、範囲チェックを行う
    if (isValidDate(fromDate) && isValidDate(toDate) && isStartAfterEnd(fromDate, toDate)) {
      return '終了日は開始日以降の日付を入力してください';
    }
    return null;
  }, [fromDate, toDate, toError]);

  const isValid = useMemo(() => {
    return (
      fromError === null &&
      toErrorWithRangeCheck === null &&
      isValidDate(fromDate) &&
      isValidDate(toDate) &&
      !isStartAfterEnd(fromDate, toDate)
    );
  }, [fromError, toErrorWithRangeCheck, fromDate, toDate]);

  const validateAll = useCallback((): boolean => {
    const fromErr = validateFrom(fromDate);
    const toErr = validateTo(toDate, fromDate);
    setFromError(fromErr);
    setToError(toErr);
    return fromErr === null && toErr === null;
  }, [fromDate, toDate, validateFrom, validateTo]);

  return {
    fromDate,
    toDate,
    fromError,
    toError: toErrorWithRangeCheck,
    isValid,
    setFromDate,
    setToDate,
    validateAll,
  };
}
