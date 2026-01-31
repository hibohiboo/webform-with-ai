import Papa from "papaparse";
import type { FeedbackResponse } from "../shared/types";

// UTF-8 BOM for Excel compatibility
const BOM = "\uFEFF";

// 固定列（常に先頭に表示）
const FIXED_COLUMNS = ["responseId", "appId", "submittedAt"];

// DynamoDB のキー属性（CSVから除外）
const EXCLUDED_KEYS = ["PK", "SK"];

/**
 * フィードバック回答の配列から BOM 付き UTF-8 CSV を生成
 * - 動的カラム: 全レコードに存在する属性の和集合
 * - 固定カラム（responseId, appId, submittedAt）は常に先頭
 * - RFC 4180 準拠のエスケープは papaparse が自動処理
 */
export function generateCsv(responses: FeedbackResponse[]): string {
  if (responses.length === 0) {
    return "";
  }

  // 全レコードから動的カラムを収集
  const dynamicColumns = new Set<string>();
  for (const response of responses) {
    for (const key of Object.keys(response)) {
      if (!FIXED_COLUMNS.includes(key) && !EXCLUDED_KEYS.includes(key)) {
        dynamicColumns.add(key);
      }
    }
  }

  // カラム順序: 固定カラム + 動的カラム（アルファベット順）
  const columns = [...FIXED_COLUMNS, ...[...dynamicColumns].sort()];

  // papaparse で CSV 生成（RFC 4180 準拠のエスケープを自動処理）
  const csv = Papa.unparse(responses, {
    columns,
    newline: "\r\n",
  });

  return BOM + csv;
}
