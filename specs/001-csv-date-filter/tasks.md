# Tasks: CSV ダウンロード日付範囲フィルタ

**Input**: Design documents from `/specs/001-csv-date-filter/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.yaml

**Tests**: TDD アプローチ（Constitution: Test-Driven Development）に従い、テストファーストで実装

**Organization**: バックエンド → フロントエンド → E2E の順序で実装

## Format: `[ID] [P?] [Layer] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Layer]**: BE=Backend, FE=Frontend, E2E=End-to-End Test
- Include exact file paths in descriptions

---

## Phase 1: バックエンド - 型定義・基盤

**Purpose**: バックエンドの型定義とユーティリティ関数の実装

### T001: 型定義追加

- [x] T001 [BE] `DateRangeParams` と `DateValidationError` 型を追加 in `backend/src/shared/types.ts`

**FR**: FR-001, FR-002, FR-007a
**変更対象**: 既存ファイル（追記）
**Done Criteria**:
- `DateRangeParams` 型がエクスポートされている
- `DateValidationError` 型がエクスポートされている
- 既存の型定義に影響を与えていない
- `bun run lint` がパスする

---

## Phase 2: バックエンド - ユニットテスト（テストファースト）

**Purpose**: 日付バリデーション・フィルタ関数のテストを先に作成

**⚠️ CRITICAL**: 実装前にテストを作成し、テストが FAIL することを確認

### T002: 日付フィルタ ユニットテスト作成

- [x] T002 [BE] 日付バリデーション・フィルタのユニットテストを作成 in `backend/tests/unit/date-filter.test.ts`

**FR**: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-007a
**変更対象**: 新規ファイル
**テスト観点**:
- `validateDateFormat`: 正しい形式（2026-01-15）→ null
- `validateDateFormat`: 不正な形式（2026/01/15, 01-15-2026）→ INVALID_DATE_FORMAT
- `validateDateValue`: 有効な日付（2026-01-31）→ null
- `validateDateValue`: 無効な日付（2026-02-30, 2026-13-01）→ INVALID_DATE
- `validateDateValue`: うるう年（2024-02-29 valid, 2026-02-29 invalid）
- `toJstUtcTimestamp('2026-01-15', 'from')` → '2026-01-14T15:00:00.000Z'（JST 00:00:00 = UTC -9h）
- `toJstUtcTimestamp('2026-01-15', 'to')` → '2026-01-15T14:59:59.999Z'（JST 23:59:59.999 = UTC -9h）
- `filterByDateRange`: from のみ指定 → from（JST 00:00:00）以降のデータのみ
- `filterByDateRange`: to のみ指定 → to（JST 23:59:59.999）以前のデータのみ
- `filterByDateRange`: 両方指定 → 範囲内のデータのみ
- `filterByDateRange`: 未指定 → 全件
- `filterByDateRange`: 境界値（JST→UTC変換後）が正しく含まれる

**Done Criteria**:
- テストファイルが作成されている
- `bun run test backend/tests/unit/date-filter.test.ts` が実行可能（FAIL する）
- 全テストケースが記述されている

---

## Phase 3: バックエンド - 実装

**Purpose**: 日付バリデーション・フィルタ関数とハンドラーの実装

### T003: 日付フィルタユーティリティ実装

- [x] T003 [BE] 日付バリデーション・フィルタユーティリティを実装 in `backend/src/lib/date-filter.ts`

**FR**: FR-001, FR-002, FR-003, FR-007, FR-007a
**変更対象**: 新規ファイル
**実装内容**:
- `validateDateFormat(date, paramName)`: YYYY-MM-DD 形式チェック
- `validateDateValue(date, paramName)`: 実在する日付かチェック
- `validateDateRange(params)`: from/to パラメータの包括的検証
- `toJstUtcTimestamp(date, type)`: JST 日付を UTC タイムスタンプ文字列へ変換
  - `from`: 指定日 00:00:00 JST → 前日 15:00:00 UTC
  - `to`: 指定日 23:59:59.999 JST → 同日 14:59:59.999 UTC
- `filterByDateRange(responses, params)`: 日付範囲でのフィルタリング（JST→UTC変換後に比較）

**Done Criteria**:
- T002 のユニットテストがすべてパスする
- `bun run lint` がパスする
- エラーコード `INVALID_DATE_FORMAT`, `INVALID_DATE` が正しく返される

### T004: ハンドラー修正

- [x] T004 [BE] CSV ダウンロードハンドラーに日付フィルタ機能を追加 in `backend/src/handlers/download-csv.ts`

**FR**: FR-001〜FR-008, FR-007a
**変更対象**: 既存ファイル（修正）
**既存機能への影響**: パラメータ未指定時は従来通り全件取得（後方互換性維持）
**実装内容**:
1. `APIGatewayProxyEvent` からクエリパラメータ `from`, `to` を取得
2. `validateDateRange()` でバリデーション
3. バリデーションエラー時は 400 レスポンス（`{ "error": "...", "message": "..." }` 形式）
4. `scanAllResponses()` 後に `filterByDateRange()` でフィルタ
5. フィルタ後のデータが空なら 204 No Content

**Done Criteria**:
- クエリパラメータ `from`, `to` が正しく取得される
- バリデーションエラー時に 400 + FR-007a 形式のレスポンスが返される
- フィルタ後のデータが正しく CSV に変換される
- パラメータなしで呼び出した場合、従来通り全件返却される
- `bun run lint` がパスする

---

## Phase 4: バックエンド - 統合テスト

**Purpose**: API エンドポイントの統合テスト

### T005: 統合テスト追加

- [x] T005 [BE] CSV ダウンロード API の日付フィルタ統合テストを追加 in `backend/tests/integration/api.test.ts`

**FR**: FR-001〜FR-008, FR-007a
**変更対象**: 既存ファイル（追記）
**テスト観点**:
- `from=2026-01-01&to=2026-01-31` → 範囲内データのみの CSV
- `from=2026-01-15` のみ → 2026-01-15 以降のデータ
- `to=2026-01-15` のみ → 2026-01-15 以前のデータ
- パラメータなし → 全件（後方互換性）
- 不正フォーマット → 400 + `INVALID_DATE_FORMAT`
- 無効な日付 → 400 + `INVALID_DATE`
- 該当データなし → 204 No Content
- 境界値（00:00:00.000Z, 23:59:59.999Z）が正しく含まれる

**Done Criteria**:
- 全テストケースがパスする
- `bun run test backend/tests/integration/api.test.ts` が成功する

### T006: バックエンド Lint・型チェック

- [x] T006 [BE] バックエンドの Lint・型チェックを実行 in `backend/`

**Done Criteria**:
- `cd backend && bun run lint` がエラーなしで完了する
- 型エラーがない

**Checkpoint**: バックエンド実装完了 - API が日付フィルタ付きで正しく動作する

---

## Phase 5: フロントエンド - ユーティリティ

**Purpose**: フロントエンドの日付バリデーションユーティリティ

### T007: 日付バリデーションユーティリティ作成

- [x] T007 [P] [FE] 日付バリデーションユーティリティを作成 in `frontend/src/utils/date-validation.ts`

**FR**: FR-012, FR-015
**変更対象**: 新規ファイル
**実装内容**:
- `isValidDate(dateString)`: YYYY-MM-DD 形式かつ有効な日付かを検証
- `getFirstDayOfCurrentMonth()`: 今月の1日を YYYY-MM-DD 形式で返す（FR-015）
- `getToday()`: 本日を YYYY-MM-DD 形式で返す（FR-015）
- `isStartAfterEnd(start, end)`: 開始日が終了日より後かを判定

**Done Criteria**:
- 全関数がエクスポートされている
- 今月1日と本日が正しく計算される
- 日付バリデーションが正しく動作する
- `bun run lint` がパスする

---

## Phase 6: フロントエンド - カスタムフック

**Purpose**: 日付範囲フォームのカスタムフック

### T008: 日付範囲フォームフック作成

- [x] T008 [FE] 日付範囲フォームのカスタムフックを作成 in `frontend/src/hooks/useDateRangeForm.ts`

**FR**: FR-010, FR-011, FR-012, FR-013, FR-014, FR-015
**変更対象**: 新規ファイル
**依存**: T007（date-validation.ts）
**実装内容**:
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
```

**動作仕様**:
- 初期値: 今月1日〜本日（FR-015）
- 入力変更時に即時バリデーション
- エラー時は `isValid = false`
- 開始日 > 終了日の場合、toError にメッセージ

**Done Criteria**:
- 初期値が今月1日〜本日であること
- 有効な日付入力 → エラーなし、isValid = true
- 無効な形式 → fromError/toError にメッセージ、isValid = false
- 開始日 > 終了日 → toError にメッセージ、isValid = false
- `bun run lint` がパスする

---

## Phase 7: フロントエンド - UI 実装

**Purpose**: 管理画面に日付入力 UI を追加

### T009: AdminDownload.tsx 修正

- [x] T009 [FE] CSV ダウンロード画面に日付入力 UI を追加 in `frontend/src/components/AdminDownload.tsx`

**FR**: FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016
**変更対象**: 既存ファイル（修正）
**依存**: T007, T008
**既存機能への影響**: 既存のダウンロードボタンに日付入力欄を追加

**実装内容**:
1. `useDateRangeForm` フック使用
2. 日付入力欄 2 つ追加（開始日、終了日）
3. インラインエラー表示（FR-014）
4. ダウンロードボタンの無効化条件追加（`!isValid || isDownloading`）
5. API 呼び出し時にクエリパラメータ付与（`?from=...&to=...`）
6. 204 時の通知メッセージ表示（FR-016: 「指定期間にデータがありません」）

**UI 構造**:
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

**Done Criteria**:
- 画面表示時に初期値（今月1日〜本日）がセットされている（FR-015）
- バリデーションエラー時にインラインメッセージ表示（FR-014）
- バリデーションエラー時にボタン無効化（FR-010, FR-011）
- 有効な入力時にボタン有効化
- ダウンロード成功時に CSV ファイルが取得される
- 204 時に「指定期間にデータがありません」と表示（FR-016）
- `bun run lint` がパスする

### T010: フロントエンド Lint・ビルド確認

- [x] T010 [FE] フロントエンドの Lint・型チェック・ビルドを実行 in `frontend/`

**Done Criteria**:
- `cd frontend && bun run lint` がエラーなしで完了する
- `cd frontend && bun run build` がエラーなしで完了する

**Checkpoint**: フロントエンド実装完了 - UI が日付入力・バリデーション・ダウンロードを正しく行う

---

## Phase 8: E2E テスト

**Purpose**: エンドツーエンドの統合動作確認

### T011: BDD シナリオ追加

- [ ] T011 [E2E] CSV ダウンロードの日付フィルタ BDD シナリオを追加 in `e2e/tests/download-csv.spec.ts`

**FR**: FR-001〜FR-016
**変更対象**: 既存ファイル（追記）
**依存**: Phase 4, Phase 7 完了

**テストシナリオ**:

1. **日付範囲指定でダウンロード成功**
   - Given: 管理画面を開く
   - When: 日付範囲を入力してダウンロードボタンをクリック
   - Then: 指定期間のデータのみを含む CSV がダウンロードされる

2. **無効な日付でバリデーションエラー表示**
   - Given: 管理画面を開く
   - When: 無効な日付を入力
   - Then: インラインエラーメッセージが表示される
   - And: ダウンロードボタンが無効化される

3. **データなし時の通知メッセージ表示**（FR-016）
   - Given: 管理画面を開く
   - When: データが存在しない期間を指定してダウンロード
   - Then: 「指定期間にデータがありません」と表示される

4. **開始日 > 終了日でボタン無効化**
   - Given: 管理画面を開く
   - When: 開始日 > 終了日を入力
   - Then: エラーメッセージが表示される
   - And: ダウンロードボタンが無効化される

5. **初期値確認**（FR-015）
   - Given: 管理画面を開く
   - Then: 開始日が今月1日、終了日が本日に設定されている

**Done Criteria**:
- 全シナリオが記述されている
- `cd e2e && bun run test` が実行可能

### T012: E2E テスト実行・全シナリオ通過確認

- [ ] T012 [E2E] E2E テストを実行し全シナリオ通過を確認 in `e2e/`

**Done Criteria**:
- `cd e2e && bun run test` が全テストパスする
- 全 BDD シナリオが通過する

**Checkpoint**: E2E テスト完了 - 機能全体が正しく動作することを確認

---

## Phase 9: 完了確認

**Purpose**: 全体の品質確認

### T013: 全体 Lint・テスト確認

- [ ] T013 全体の Lint・テスト・ビルドを実行し最終確認

**Done Criteria**:
- `cd backend && bun run lint && bun run test` がパスする
- `cd frontend && bun run lint && bun run build` がパスする
- `cd e2e && bun run test` がパスする
- 全 FR 要件が満たされている

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: 型定義（T001）← 独立
    ↓
Phase 2: ユニットテスト（T002）← T001
    ↓
Phase 3: 実装（T003, T004）← T001, T002
    ↓
Phase 4: 統合テスト（T005, T006）← T003, T004
    ↓ (バックエンド完了)
Phase 5: FE ユーティリティ（T007）← 独立（並列可）
    ↓
Phase 6: FE フック（T008）← T007
    ↓
Phase 7: FE UI（T009, T010）← T007, T008
    ↓ (フロントエンド完了)
Phase 8: E2E（T011, T012）← Phase 4, Phase 7
    ↓
Phase 9: 完了確認（T013）← 全フェーズ
```

### Parallel Opportunities

- **T007**（FE ユーティリティ）は Phase 2〜4 と並列実行可能
- **T001** と **T007** は同時に開始可能

### Critical Path

```
T001 → T002 → T003 → T004 → T005 → T006 (Backend)
                                      ↓
T007 → T008 → T009 → T010 (Frontend) ← T006 完了後に T009 開始
                           ↓
                    T011 → T012 → T013 (E2E & Final)
```

---

## FR 要件マッピング

| FR | タスク | 説明 |
|----|--------|------|
| FR-001 | T001, T003, T004 | from パラメータ処理 |
| FR-002 | T001, T003, T004 | to パラメータ処理 |
| FR-003 | T003, T004 | YYYY-MM-DD フォーマット検証 |
| FR-004 | T003, T004 | from のみ指定時の動作 |
| FR-005 | T003, T004 | to のみ指定時の動作 |
| FR-006 | T004 | パラメータ未指定時の後方互換性 |
| FR-007 | T003, T004 | 400 Bad Request |
| FR-007a | T001, T003, T004 | エラーレスポンス形式 |
| FR-008 | T004 | 204 No Content |
| FR-009 | T009 | 日付入力欄追加 |
| FR-010 | T008, T009 | 必須入力・ボタン無効化 |
| FR-011 | T008, T009 | 開始日 > 終了日エラー |
| FR-012 | T007, T008 | フロントエンドバリデーション |
| FR-013 | T008, T009 | バリデーションエラー時の API 送信防止 |
| FR-014 | T009 | インラインエラー表示 |
| FR-015 | T007, T008, T009 | 初期値（今月1日〜本日） |
| FR-016 | T009 | 204 時の通知メッセージ |

---

## Implementation Strategy

### MVP First (Backend Only)

1. T001 → T002 → T003 → T004 → T005 → T006
2. **STOP and VALIDATE**: API が日付フィルタ付きで正しく動作することを確認
3. curl や Postman で手動テスト可能

### Full Implementation

1. Backend (T001-T006) → Frontend (T007-T010) → E2E (T011-T012) → Final (T013)
2. 各チェックポイントで動作確認

---

## Notes

- [P] tasks = different files, no dependencies
- [BE/FE/E2E] label maps task to specific layer for traceability
- テストファースト（TDD）: T002 を先に作成し、T003 で実装
- 後方互換性: パラメータなしで従来動作を維持（T004, T005 で確認）
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
