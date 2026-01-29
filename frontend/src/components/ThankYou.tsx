import { useParams, Link } from "react-router";
import { getAppConfig } from "../lib/apps-config";
import { detectLanguage, t } from "../lib/i18n";

export default function ThankYou() {
  const { appId } = useParams<{ appId: string }>();
  const lang = detectLanguage();

  const appConfig = appId ? getAppConfig(appId) : undefined;
  const appName = appConfig
    ? lang === "ja"
      ? appConfig.name
      : appConfig.nameEn
    : "";

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1>{t("thankYouTitle", lang)}</h1>
      <p style={{ fontSize: "1.2rem", marginBottom: "2rem" }}>
        {t("thankYouMessage", lang)}
      </p>
      {appId && (
        <Link
          to={`/${appId}/form`}
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#007bff",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          {t("backToForm", lang)}
        </Link>
      )}
      {appName && (
        <p style={{ marginTop: "2rem", color: "#666" }}>{appName}</p>
      )}
    </div>
  );
}
