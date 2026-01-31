/**
 * Lambda Layer に含めるモジュール
 * これらのモジュールは bundling.externalModules で除外され、Layer から読み込まれる
 */
export const externalModules = [
  // AWS SDK v3 は Node.js 18+ の Lambda ランタイムに含まれている
  "@aws-sdk/client-dynamodb",
  "@aws-sdk/lib-dynamodb",
  // Layer に含めるモジュール
  "@date-fns/tz",
  "date-fns",
  "ulid",
  "papaparse",
];
