/**
 * API クライアント
 */

export interface SubmitResponseResult {
  responseId: string;
  submittedAt: string;
}

export interface SubmitResponseBody {
  name?: string;
  rating?: number;
  comment?: string;
  [key: string]: unknown;
}

/**
 * フィードバック回答を送信
 */
export async function submitResponse(
  appId: string,
  body: SubmitResponseBody,
): Promise<SubmitResponseResult> {
  const response = await fetch(`/api/${appId}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit response: ${response.status}`);
  }

  return response.json();
}

/**
 * CSVダウンロード
 */
export async function downloadCsv(): Promise<void> {
  const response = await fetch("/api/responses/csv");

  if (response.status === 204) {
    throw new Error("No data available");
  }

  if (!response.ok) {
    throw new Error(`Failed to download CSV: ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "feedback.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
