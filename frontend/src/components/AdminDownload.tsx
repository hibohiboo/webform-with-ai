import { useState } from "react";

export default function AdminDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const response = await fetch("/api/responses/csv");

      if (response.status === 204) {
        setError("ダウンロードするデータがありません");
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Blobとしてレスポンスを取得
      const blob = await response.blob();

      // ダウンロードリンクを作成
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "feedback.csv";
      document.body.appendChild(a);
      a.click();

      // クリーンアップ
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
      setError("ダウンロードに失敗しました");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>管理画面</h1>
        <p style={styles.description}>
          フィードバック回答データをCSV形式でダウンロードできます。
        </p>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          style={{
            ...styles.button,
            ...(isDownloading ? styles.buttonDisabled : {}),
          }}
        >
          {isDownloading ? "ダウンロード中..." : "CSVをダウンロード"}
        </button>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.info}>
          <h2 style={styles.infoTitle}>CSVの内容</h2>
          <ul style={styles.infoList}>
            <li>responseId: 回答ID</li>
            <li>appId: アプリID</li>
            <li>submittedAt: 送信日時</li>
            <li>name: 名前</li>
            <li>rating: 評価（1-3）</li>
            <li>comment: コメント</li>
            <li>その他、送信されたすべてのフィールド</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    padding: "20px",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    padding: "40px",
    maxWidth: "500px",
    width: "100%",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "16px",
    color: "#333",
  },
  description: {
    fontSize: "16px",
    color: "#666",
    marginBottom: "24px",
  },
  button: {
    width: "100%",
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#fff",
    backgroundColor: "#1976d2",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
  },
  error: {
    marginTop: "16px",
    padding: "12px",
    backgroundColor: "#ffebee",
    color: "#c62828",
    borderRadius: "4px",
    fontSize: "14px",
  },
  info: {
    marginTop: "32px",
    padding: "16px",
    backgroundColor: "#f5f5f5",
    borderRadius: "4px",
  },
  infoTitle: {
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "12px",
    color: "#333",
  },
  infoList: {
    margin: 0,
    paddingLeft: "20px",
    fontSize: "14px",
    color: "#666",
    lineHeight: "1.8",
  },
};
