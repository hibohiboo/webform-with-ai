import { describe, it, expect } from 'vitest';
import {
  validateDateFormat,
  validateDateValue,
  toJstUtcTimestamp,
  filterByDateRange,
  validateDateRange,
} from '../../src/lib/date-filter';
import type { FeedbackResponse, DateRangeParams } from '../../src/shared/types';

describe('validateDateFormat', () => {
  it('正しい形式（YYYY-MM-DD）は null を返す', () => {
    expect(validateDateFormat('2026-01-15', 'from')).toBeNull();
    expect(validateDateFormat('2026-12-31', 'to')).toBeNull();
  });

  it('不正な形式（スラッシュ区切り）は INVALID_DATE_FORMAT を返す', () => {
    const result = validateDateFormat('2026/01/15', 'from');
    expect(result).toEqual({
      error: 'INVALID_DATE_FORMAT',
      message: expect.stringContaining('from'),
    });
  });

  it('不正な形式（MM-DD-YYYY）は INVALID_DATE_FORMAT を返す', () => {
    const result = validateDateFormat('01-15-2026', 'to');
    expect(result).toEqual({
      error: 'INVALID_DATE_FORMAT',
      message: expect.stringContaining('to'),
    });
  });

  it('不正な形式（桁数不足）は INVALID_DATE_FORMAT を返す', () => {
    expect(validateDateFormat('2026-1-15', 'from')).toEqual({
      error: 'INVALID_DATE_FORMAT',
      message: expect.stringContaining('from'),
    });
  });
});

describe('validateDateValue', () => {
  it('有効な日付は null を返す', () => {
    expect(validateDateValue('2026-01-31', 'from')).toBeNull();
    expect(validateDateValue('2026-12-15', 'to')).toBeNull();
  });

  it('無効な日付（存在しない日）は INVALID_DATE を返す', () => {
    const result = validateDateValue('2026-02-30', 'from');
    expect(result).toEqual({
      error: 'INVALID_DATE',
      message: expect.stringContaining('from'),
    });
  });

  it('無効な日付（存在しない月）は INVALID_DATE を返す', () => {
    const result = validateDateValue('2026-13-01', 'to');
    expect(result).toEqual({
      error: 'INVALID_DATE',
      message: expect.stringContaining('to'),
    });
  });

  it('うるう年：2024-02-29 は有効', () => {
    expect(validateDateValue('2024-02-29', 'from')).toBeNull();
  });

  it('うるう年でない年：2026-02-29 は無効', () => {
    const result = validateDateValue('2026-02-29', 'to');
    expect(result).toEqual({
      error: 'INVALID_DATE',
      message: expect.stringContaining('to'),
    });
  });
});

describe('toJstUtcTimestamp', () => {
  it('from の場合、JST 00:00:00 = 前日 15:00:00 UTC を返す', () => {
    // 2026-01-15 00:00:00 JST = 2026-01-14 15:00:00 UTC
    expect(toJstUtcTimestamp('2026-01-15', 'from')).toBe('2026-01-14T15:00:00.000Z');
  });

  it('to の場合、JST 23:59:59.999 = 同日 14:59:59.999 UTC を返す', () => {
    // 2026-01-15 23:59:59.999 JST = 2026-01-15 14:59:59.999 UTC
    expect(toJstUtcTimestamp('2026-01-15', 'to')).toBe('2026-01-15T14:59:59.999Z');
  });

  it('月初の from は前月末の UTC になる', () => {
    // 2026-01-01 00:00:00 JST = 2025-12-31 15:00:00 UTC
    expect(toJstUtcTimestamp('2026-01-01', 'from')).toBe('2025-12-31T15:00:00.000Z');
  });

  it('年初の from は前年末の UTC になる', () => {
    // 2026-01-01 00:00:00 JST = 2025-12-31 15:00:00 UTC
    expect(toJstUtcTimestamp('2026-01-01', 'from')).toBe('2025-12-31T15:00:00.000Z');
  });
});

describe('validateDateRange', () => {
  it('有効な from/to パラメータは null を返す', () => {
    const params: DateRangeParams = { from: '2026-01-01', to: '2026-01-31' };
    expect(validateDateRange(params)).toBeNull();
  });

  it('from のみ指定は null を返す', () => {
    const params: DateRangeParams = { from: '2026-01-15' };
    expect(validateDateRange(params)).toBeNull();
  });

  it('to のみ指定は null を返す', () => {
    const params: DateRangeParams = { to: '2026-01-15' };
    expect(validateDateRange(params)).toBeNull();
  });

  it('パラメータ未指定は null を返す', () => {
    const params: DateRangeParams = {};
    expect(validateDateRange(params)).toBeNull();
  });

  it('不正なフォーマットの from は INVALID_DATE_FORMAT を返す', () => {
    const params: DateRangeParams = { from: '2026/01/01' };
    const result = validateDateRange(params);
    expect(result).toEqual({
      error: 'INVALID_DATE_FORMAT',
      message: expect.stringContaining('from'),
    });
  });

  it('無効な日付の to は INVALID_DATE を返す', () => {
    const params: DateRangeParams = { to: '2026-02-30' };
    const result = validateDateRange(params);
    expect(result).toEqual({
      error: 'INVALID_DATE',
      message: expect.stringContaining('to'),
    });
  });
});

describe('filterByDateRange', () => {
  // テストデータ: UTC タイムスタンプで保存されているデータ
  // JST で考えると:
  // - 001: 2026-01-10 19:00:00 JST
  // - 002: 2026-01-15 00:00:00 JST (境界値: from=2026-01-15 で含まれるべき)
  // - 003: 2026-01-15 12:00:00 JST
  // - 004: 2026-01-15 23:59:59.999 JST (境界値: to=2026-01-15 で含まれるべき)
  // - 005: 2026-01-21 00:00:00 JST
  const mockResponses: FeedbackResponse[] = [
    {
      PK: 'RESPONSE#001',
      SK: 'app1#2026-01-10T10:00:00.000Z',
      responseId: '001',
      appId: 'app1',
      submittedAt: '2026-01-10T10:00:00.000Z', // = 2026-01-10 19:00:00 JST
      comment: 'Comment 1',
    },
    {
      PK: 'RESPONSE#002',
      SK: 'app1#2026-01-14T15:00:00.000Z',
      responseId: '002',
      appId: 'app1',
      submittedAt: '2026-01-14T15:00:00.000Z', // = 2026-01-15 00:00:00 JST (境界値)
      comment: 'Comment 2 - boundary start JST',
    },
    {
      PK: 'RESPONSE#003',
      SK: 'app1#2026-01-15T03:00:00.000Z',
      responseId: '003',
      appId: 'app1',
      submittedAt: '2026-01-15T03:00:00.000Z', // = 2026-01-15 12:00:00 JST
      comment: 'Comment 3',
    },
    {
      PK: 'RESPONSE#004',
      SK: 'app1#2026-01-15T14:59:59.999Z',
      responseId: '004',
      appId: 'app1',
      submittedAt: '2026-01-15T14:59:59.999Z', // = 2026-01-15 23:59:59.999 JST (境界値)
      comment: 'Comment 4 - boundary end JST',
    },
    {
      PK: 'RESPONSE#005',
      SK: 'app1#2026-01-20T15:00:00.000Z',
      responseId: '005',
      appId: 'app1',
      submittedAt: '2026-01-20T15:00:00.000Z', // = 2026-01-21 00:00:00 JST
      comment: 'Comment 5',
    },
  ];

  it('from のみ指定：JST でその日以降のデータのみ', () => {
    const params: DateRangeParams = { from: '2026-01-15' };
    const result = filterByDateRange(mockResponses, params);
    // from=2026-01-15 JST → UTC: 2026-01-14T15:00:00.000Z 以降
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.responseId)).toEqual(['002', '003', '004', '005']);
  });

  it('to のみ指定：JST でその日以前のデータのみ', () => {
    const params: DateRangeParams = { to: '2026-01-15' };
    const result = filterByDateRange(mockResponses, params);
    // to=2026-01-15 JST → UTC: 2026-01-15T14:59:59.999Z まで
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.responseId)).toEqual(['001', '002', '003', '004']);
  });

  it('両方指定：JST で範囲内のデータのみ', () => {
    const params: DateRangeParams = { from: '2026-01-15', to: '2026-01-15' };
    const result = filterByDateRange(mockResponses, params);
    // 2026-01-15 JST 全日 = UTC: 2026-01-14T15:00:00.000Z ~ 2026-01-15T14:59:59.999Z
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.responseId)).toEqual(['002', '003', '004']);
  });

  it('パラメータ未指定：全件', () => {
    const params: DateRangeParams = {};
    const result = filterByDateRange(mockResponses, params);
    expect(result).toHaveLength(5);
  });

  it('境界値: JST 00:00:00 のデータが from 指定時に含まれる', () => {
    const params: DateRangeParams = { from: '2026-01-15' };
    const result = filterByDateRange(mockResponses, params);
    // 2026-01-15 00:00:00 JST = 2026-01-14T15:00:00.000Z
    expect(result.some((r) => r.submittedAt === '2026-01-14T15:00:00.000Z')).toBe(true);
  });

  it('境界値: JST 23:59:59.999 のデータが to 指定時に含まれる', () => {
    const params: DateRangeParams = { to: '2026-01-15' };
    const result = filterByDateRange(mockResponses, params);
    // 2026-01-15 23:59:59.999 JST = 2026-01-15T14:59:59.999Z
    expect(result.some((r) => r.submittedAt === '2026-01-15T14:59:59.999Z')).toBe(true);
  });

  it('該当データなしの場合、空配列を返す', () => {
    const params: DateRangeParams = { from: '2027-01-01', to: '2027-12-31' };
    const result = filterByDateRange(mockResponses, params);
    expect(result).toHaveLength(0);
  });
});
