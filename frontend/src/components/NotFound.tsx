import { detectLanguage, t } from "../lib/i18n";

export default function NotFound() {
  const lang = detectLanguage();

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "4rem", margin: "0", color: "#999" }}>404</h1>
      <h2>{t("notFoundTitle", lang)}</h2>
      <p style={{ color: "#666" }}>{t("notFoundMessage", lang)}</p>
    </div>
  );
}
