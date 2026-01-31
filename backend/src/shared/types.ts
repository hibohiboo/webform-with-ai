/**
 * DynamoDB に保存されるフィードバック回答の型定義
 */
export interface FeedbackResponse {
  /** パーティションキー: RESPONSE#{responseId} */
  PK: string;
  /** ソートキー: {appId}#{submittedAt} */
  SK: string;
  /** ULID形式の回答ID */
  responseId: string;
  /** アプリケーションID */
  appId: string;
  /** 送信日時（ISO 8601 UTC） */
  submittedAt: string;
  /** 回答者名（任意） */
  name?: string;
  /** 評価（1-3、任意） */
  rating?: number;
  /** 自由記述コメント（任意） */
  comment?: string;
  /** スキーマ進化に対応するための追加フィールド */
  [key: string]: unknown;
}

/**
 * POST /api/{appId}/responses のレスポンス型
 */
export interface SubmitResponseResult {
  responseId: string;
  submittedAt: string;
}

/**
 * API Gateway Lambda イベントからのリクエストボディ型
 */
export interface SubmitResponseBody {
  name?: string;
  rating?: number;
  comment?: string;
  [key: string]: unknown;
}

/**
 * 日付範囲クエリパラメータ型
 * CSV ダウンロード API で使用
 */
export interface DateRangeParams {
  /** 開始日 (YYYY-MM-DD形式) */
  from?: string;
  /** 終了日 (YYYY-MM-DD形式) */
  to?: string;
}

/**
 * 日付バリデーションエラー型 (FR-007a)
 */
export interface DateValidationError {
  /** エラーコード */
  error: 'INVALID_DATE_FORMAT' | 'INVALID_DATE';
  /** エラーメッセージ */
  message: string;
}
