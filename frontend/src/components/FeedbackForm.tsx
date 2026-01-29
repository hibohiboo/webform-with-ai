import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/defaultV2.min.css";
import { getAppConfig } from "../lib/apps-config";
import { formDefinition } from "../lib/form-definition";
import { detectLanguage, t } from "../lib/i18n";
import { submitResponse } from "../lib/api";

export default function FeedbackForm() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lang = detectLanguage();

  // アプリ設定を取得
  const appConfig = appId ? getAppConfig(appId) : undefined;

  // 存在しないappIdの場合は404へ
  useEffect(() => {
    if (appId && !appConfig) {
      navigate("/not-found", { replace: true });
    }
  }, [appId, appConfig, navigate]);

  if (!appId || !appConfig) {
    return null;
  }

  // SurveyJS モデルを作成
  const survey = new Model(formDefinition);
  survey.locale = lang === "ja" ? "default" : "en";

  // 送信ハンドラ
  survey.onComplete.add(async (sender) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await submitResponse(appId, sender.data);
      navigate(`/${appId}/thank-you`);
    } catch (err) {
      console.error("Submit error:", err);
      setError(t("errorMessage", lang));
      setIsSubmitting(false);
    }
  });

  const appName = lang === "ja" ? appConfig.name : appConfig.nameEn;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "1rem" }}>
      <h1 style={{ textAlign: "center", marginBottom: "1rem" }}>{appName}</h1>
      {error && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            backgroundColor: "#fee",
            border: "1px solid #f00",
            borderRadius: "4px",
            color: "#c00",
          }}
        >
          {error}
        </div>
      )}
      {isSubmitting ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          {t("submitting", lang)}
        </div>
      ) : (
        <Survey model={survey} />
      )}
    </div>
  );
}
