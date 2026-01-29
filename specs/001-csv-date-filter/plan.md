# Implementation Plan: CSV ダウンロード日付範囲フィルタ

**Branch**: `001-csv-date-filter` | **Date**: 2026-01-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-csv-date-filter/spec.md`

## Summary

CSV ダウンロード API に `from`/`to` クエリパラメータを追加し、日付範囲による絞り込み機能を実装する。フロントエンドには日付入力 UI を追加し、バリデーション・エラー表示を実装する。後方互換性を維持しつつ、管理者が効率的に期間指定でデータをエクスポートできるようにする。

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 24.x (Lambda runtime)
**Primary Dependencies**: AWS CDK, aws-lambda, @aws-sdk/client-dynamodb, React 19, React Router v7
**Storage**: DynamoDB（既存テーブル `WebformResponses`）
**Testing**: Vitest（`bun run test`）、Playwright（E2E）
**Target Platform**: AWS Lambda + API Gateway + CloudFront
**Project Type**: Web application (frontend + backend)
**Performance Goals**: 既存の全件取得と同等のパフォーマンスを維持
**Constraints**: フィルタリングは取得後にメモリ上で実行
**Scale/Scope**: 想定 10,000 件未満のデータ

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Readability First | ✅ Pass | 明確な命名、日本語コメント、一貫したフォーマット |
| II. Test-Driven Development | ✅ Pass | テストファースト、`bun run test` 使用、BDD テスト実施 |
| III. Simplicity Over Abstraction | ✅ Pass | メモリフィルタリングで最小実装、GSI 追加せず |
| IV. User Experience Priority | ✅ Pass | P1-P3 優先度付け、即時フィードバック、明確なエラー表示 |

## Project Structure

### Documentation (this feature)

```text
specs/001-csv-date-filter/
├── plan.md              # This file
├── research.md          # Phase 0 output (completed)
├── data-model.md        # Phase 1 output (completed)
├── quickstart.md        # Phase 1 output (completed)
├── contracts/           # Phase 1 output (completed)
│   └── api.yaml         # OpenAPI spec for date filter extension
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── handlers/
│   │   └── download-csv.ts      # 変更: クエリパラメータ処理追加
│   ├── lib/
│   │   ├── csv.ts               # 変更なし
│   │   ├── dynamodb.ts          # 変更なし
│   │   └── date-filter.ts       # 新規: 日付バリデーション・フィルタ
│   └── shared/
│       └── types.ts             # 変更: 型定義追加
└── tests/
    ├── unit/
    │   ├── csv.test.ts          # 変更なし
    │   └── date-filter.test.ts  # 新規: 日付フィルタテスト
    └── integration/
        └── api.test.ts          # 変更: 日付フィルタテスト追加

frontend/
├── src/
│   ├── components/
│   │   └── AdminDownload.tsx    # 変更: 日付入力 UI 追加
│   ├── hooks/
│   │   └── useDateRangeForm.ts  # 新規: 日付範囲フォームフック
│   └── utils/
│       └── date-validation.ts   # 新規: 日付バリデーション
└── tests/                       # ユニットテスト（必要に応じて）

e2e/
└── tests/
    └── download-csv.spec.ts     # 変更: 日付フィルタシナリオ追加
```

**Structure Decision**: 既存の Web application 構造を維持。新規ファイルは最小限に抑え、既存パターンに従う。

## Implementation Phases

### Phase 1: バックエンド実装

#### Task 1.1: 型定義追加

**File**: `backend/src/shared/types.ts`

**Changes**:
```typescript
// 追加する型定義
export interface DateRangeParams {
  from?: string;
  to?: string;
}

export interface DateValidationError {
  error: 'INVALID_DATE_FORMAT' | 'INVALID_DATE';
  message: string;
}
```

**Test Points**:
- 型が正しくエクスポートされること

---

#### Task 1.2: 日付バリデーション・フィルタユーティリティ作成

**File**: `backend/src/lib/date-filter.ts` (新規)

**Functions**:
```typescript
/**
 * YYYY-MM-DD 形式の文字列を検証
 * @returns null if valid, DateValidationError if invalid
 */
export function validateDateFormat(date: string, paramName: string): DateValidationError | null;

/**
 * 日付文字列が実在する日付かを検証
 * @returns null if valid, DateValidationError if invalid
 */
export function validateDateValue(date: string, paramName: string): DateValidationError | null;

/**
 * from/to パラメータを検証
 * @returns null if valid, DateValidationError if invalid
 */
export function validateDateRange(params: DateRangeParams): DateValidationError | null;

/**
 * YYYY-MM-DD を UTC タイムスタンプ文字列に変換
 * from: YYYY-MM-DDT00:00:00.000Z
 * to:   YYYY-MM-DDT23:59:59.999Z
 */
export function toUtcTimestamp(date: string, type: 'from' | 'to'): string;

/**
 * FeedbackResponse 配列を日付範囲でフィルタ
 */
export function filterByDateRange(
  responses: FeedbackResponse[],
  params: DateRangeParams
): FeedbackResponse[];
```

**Test Points**:
- [ ] `validateDateFormat`: 正しい形式（2026-01-15）→ null
- [ ] `validateDateFormat`: 不正な形式（2026/01/15, 01-15-2026）→ INVALID_DATE_FORMAT
- [ ] `validateDateValue`: 有効な日付（2026-01-31）→ null
- [ ] `validateDateValue`: 無効な日付（2026-02-30, 2026-13-01）→ INVALID_DATE
- [ ] `validateDateValue`: うるう年（2024-02-29 valid, 2026-02-29 invalid）
- [ ] `toUtcTimestamp('2026-01-15', 'from')` → '2026-01-15T00:00:00.000Z'
- [ ] `toUtcTimestamp('2026-01-15', 'to')` → '2026-01-15T23:59:59.999Z'
- [ ] `filterByDateRange`: from のみ指定 → from 以降のデータのみ
- [ ] `filterByDateRange`: to のみ指定 → to 以前のデータのみ
- [ ] `filterByDateRange`: 両方指定 → 範囲内のデータのみ
- [ ] `filterByDateRange`: 未指定 → 全件
- [ ] `filterByDateRange`: 境界値（00:00:00.000Z, 23:59:59.999Z）が正しく含まれる

---

#### Task 1.3: ハンドラー修正

**File**: `backend/src/handlers/download-csv.ts`

**Changes**:
1. `APIGatewayProxyEvent` からクエリパラメータ `from`, `to` を取得
2. `validateDateRange()` でバリデーション
3. バリデーションエラー時は 400 レスポンス（FR-007a 形式）
4. `scanAllResponses()` 後に `filterByDateRange()` でフィルタ
5. フィルタ後のデータが空なら 204 No Content

**Before/After**:
```typescript
// Before
const responses = await scanAllResponses();
if (responses.length === 0) { /* 204 */ }
const csv = generateCsv(responses);

// After
const params: DateRangeParams = {
  from: event.queryStringParameters?.from,
  to: event.queryStringParameters?.to,
};
const validationError = validateDateRange(params);
if (validationError) { /* 400 with error/message */ }

const allResponses = await scanAllResponses();
const filteredResponses = filterByDateRange(allResponses, params);
if (filteredResponses.length === 0) { /* 204 */ }
const csv = generateCsv(filteredResponses);
```

**Test Points**:
- [ ] `from=2026-01-01&to=2026-01-31` → 範囲内データのみの CSV
- [ ] `from=2026-01-15` のみ → 2026-01-15 以降のデータ
- [ ] `to=2026-01-15` のみ → 2026-01-15 以前のデータ
- [ ] パラメータなし → 全件（後方互換性）
- [ ] 不正フォーマット → 400 + INVALID_DATE_FORMAT
- [ ] 無効な日付 → 400 + INVALID_DATE
- [ ] 該当データなし → 204 No Content

---

### Phase 2: バックエンドテスト

#### Task 2.1: ユニットテスト作成

**File**: `backend/tests/unit/date-filter.test.ts` (新規)

Task 1.2 の全テストポイントをカバー。

#### Task 2.2: 統合テスト追加

**File**: `backend/tests/integration/api.test.ts`

**追加シナリオ**:
```typescript
describe('GET /api/responses/csv with date filter', () => {
  it('filters responses by date range');
  it('includes boundary values correctly');
  it('returns all data when no params (backward compatible)');
  it('returns 400 for invalid date format');
  it('returns 400 for non-existent date');
  it('returns 204 when no data matches filter');
});
```

#### Task 2.3: Lint・型チェック

```bash
cd backend && bun run lint
```

---

### Phase 3: フロントエンド実装

#### Task 3.1: 日付バリデーションユーティリティ

**File**: `frontend/src/utils/date-validation.ts` (新規)

```typescript
/**
 * YYYY-MM-DD 形式かつ有効な日付かを検証
 */
export function isValidDate(dateString: string): boolean;

/**
 * 今月の1日を YYYY-MM-DD 形式で返す
 */
export function getFirstDayOfCurrentMonth(): string;

/**
 * 本日を YYYY-MM-DD 形式で返す
 */
export function getToday(): string;

/**
 * 開始日が終了日より後かを判定
 */
export function isStartAfterEnd(start: string, end: string): boolean;
```

---

#### Task 3.2: カスタムフック作成

**File**: `frontend/src/hooks/useDateRangeForm.ts` (新規)

```typescript
interface UseDateRangeFormReturn {
  fromDate: string;
  toDate: string;
  fromError: string | null;
  toError: string | null;
  isValid: boolean;
  setFromDate: (date: string) => void;
  setToDate: (date: string) => void;
  validateAll: () => boolean;
}

export function useDateRangeForm(): UseDateRangeFormReturn;
```

**Behavior**:
- 初期値: 今月1日〜本日（FR-015）
- 入力変更時に即時バリデーション
- エラー時は `isValid = false`

**Test Points**:
- [ ] 初期値が今月1日〜本日であること
- [ ] 有効な日付入力 → エラーなし、isValid = true
- [ ] 無効な形式 → fromError/toError にメッセージ、isValid = false
- [ ] 開始日 > 終了日 → toError にメッセージ、isValid = false

---

#### Task 3.3: AdminDownload.tsx 修正

**File**: `frontend/src/components/AdminDownload.tsx`

**Changes**:
1. `useDateRangeForm` フック使用
2. 日付入力欄 2 つ追加（開始日、終了日）
3. インラインエラー表示（FR-014）
4. ダウンロードボタンの無効化条件追加（`!isValid || isDownloading`）
5. API 呼び出し時にクエリパラメータ付与
6. 204 時の通知メッセージ表示（FR-016）

**UI Structure**:
```tsx
<div>
  <label>開始日</label>
  <input type="date" value={fromDate} onChange={...} />
  {fromError && <span className="error">{fromError}</span>}
</div>
<div>
  <label>終了日</label>
  <input type="date" value={toDate} onChange={...} />
  {toError && <span className="error">{toError}</span>}
</div>
<button disabled={!isValid || isDownloading}>
  CSVをダウンロード
</button>
```

**Test Points**:
- [ ] 画面表示時に初期値がセットされている
- [ ] バリデーションエラー時にインラインメッセージ表示
- [ ] バリデーションエラー時にボタン無効化
- [ ] 有効な入力時にボタン有効化
- [ ] ダウンロード成功時に CSV ファイルが取得される
- [ ] 204 時に「指定期間にデータがありません」と表示

---

#### Task 3.4: Lint・型チェック・ビルド確認

```bash
cd frontend && bun run lint && bun run build
```

---

### Phase 4: E2E テスト

#### Task 4.1: BDD シナリオ追加

**File**: `e2e/tests/download-csv.spec.ts`

**追加シナリオ**:
```typescript
test.describe('CSV download with date filter', () => {
  test('downloads CSV with date range filter', async ({ page }) => {
    // Given: 管理画面を開く
    // When: 日付範囲を入力してダウンロードボタンをクリック
    // Then: 指定期間のデータのみを含む CSV がダウンロードされる
  });

  test('shows validation error for invalid date', async ({ page }) => {
    // Given: 管理画面を開く
    // When: 無効な日付を入力
    // Then: インラインエラーメッセージが表示される
    // And: ダウンロードボタンが無効化される
  });

  test('shows message when no data in range', async ({ page }) => {
    // Given: 管理画面を開く
    // When: データが存在しない期間を指定してダウンロード
    // Then: 「指定期間にデータがありません」と表示される
  });

  test('disables button when start > end', async ({ page }) => {
    // Given: 管理画面を開く
    // When: 開始日 > 終了日を入力
    // Then: エラーメッセージが表示される
    // And: ダウンロードボタンが無効化される
  });
});
```

#### Task 4.2: 全シナリオ通過確認

```bash
cd e2e && bun run test
```

---

## Complexity Tracking

> No violations - design follows simplicity principle.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| フィルタリング方式 | メモリ上でフィルタ | GSI 追加不要、現在のデータ規模で十分なパフォーマンス |
| 日付比較 | 文字列比較 | ISO 8601 形式の特性を活用、Date オブジェクト変換不要 |
| バリデーション | 正規表現 + Date | シンプルかつ堅牢な検証 |

## Dependencies

```
Phase 1 (Backend)
├── Task 1.1: 型定義 ← (独立)
├── Task 1.2: ユーティリティ ← Task 1.1
└── Task 1.3: ハンドラー ← Task 1.1, 1.2

Phase 2 (Backend Test)
├── Task 2.1: ユニットテスト ← Task 1.2
├── Task 2.2: 統合テスト ← Task 1.3
└── Task 2.3: Lint ← Task 1.1, 1.2, 1.3

Phase 3 (Frontend)
├── Task 3.1: ユーティリティ ← (独立)
├── Task 3.2: フック ← Task 3.1
├── Task 3.3: UI ← Task 3.1, 3.2, Phase 2 完了
└── Task 3.4: Lint ← Task 3.1, 3.2, 3.3

Phase 4 (E2E)
├── Task 4.1: シナリオ追加 ← Phase 2, 3 完了
└── Task 4.2: テスト実行 ← Task 4.1
```

## Checklist

- [ ] Phase 1: バックエンド実装完了
- [ ] Phase 2: バックエンドテスト全パス
- [ ] Phase 3: フロントエンド実装完了
- [ ] Phase 4: E2E テスト全パス
- [ ] `bun run lint` パス（backend/frontend）
- [ ] ビルドエラーなし
