/**
 * SurveyJS フォーム定義
 * 名前、評価（1-3）、自由記述の3フィールド
 * すべて任意入力
 */
export const formDefinition = {
  title: {
    default: "フィードバックフォーム",
    en: "Feedback Form",
  },
  description: {
    default: "ご意見・ご感想をお聞かせください",
    en: "Please share your feedback",
  },
  showQuestionNumbers: false,
  elements: [
    {
      type: "text",
      name: "name",
      title: {
        default: "お名前",
        en: "Your Name",
      },
      isRequired: false,
      maxLength: 100,
    },
    {
      type: "rating",
      name: "rating",
      title: {
        default: "評価",
        en: "Rating",
      },
      isRequired: false,
      rateMin: 1,
      rateMax: 3,
      minRateDescription: {
        default: "悪い",
        en: "Poor",
      },
      maxRateDescription: {
        default: "良い",
        en: "Good",
      },
    },
    {
      type: "comment",
      name: "comment",
      title: {
        default: "ご意見・ご感想",
        en: "Comments",
      },
      isRequired: false,
      maxLength: 1000,
      rows: 4,
    },
  ],
  completeText: {
    default: "送信",
    en: "Submit",
  },
  showCompletedPage: false,
};
