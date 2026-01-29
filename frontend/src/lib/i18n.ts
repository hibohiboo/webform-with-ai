/**
 * 言語設定
 */
export type Language = "ja" | "en";

/**
 * ブラウザの言語設定から言語を検出
 */
export function detectLanguage(): Language {
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith("ja") ? "ja" : "en";
}

/**
 * UI テキストの翻訳
 */
export const translations = {
  ja: {
    loading: "読み込み中...",
    submitting: "送信中...",
    thankYouTitle: "送信完了",
    thankYouMessage: "フィードバックをお送りいただきありがとうございました。",
    backToForm: "フォームに戻る",
    notFoundTitle: "ページが見つかりません",
    notFoundMessage: "お探しのページは存在しないか、移動した可能性があります。",
    errorTitle: "エラーが発生しました",
    errorMessage: "送信中にエラーが発生しました。もう一度お試しください。",
  },
  en: {
    loading: "Loading...",
    submitting: "Submitting...",
    thankYouTitle: "Submission Complete",
    thankYouMessage: "Thank you for your feedback.",
    backToForm: "Back to Form",
    notFoundTitle: "Page Not Found",
    notFoundMessage: "The page you are looking for does not exist or has been moved.",
    errorTitle: "Error",
    errorMessage: "An error occurred while submitting. Please try again.",
  },
} as const;

/**
 * 翻訳テキストを取得
 */
export function t(key: keyof typeof translations.ja, lang: Language): string {
  return translations[lang][key];
}
