import { useEffect, useState } from "react";

export default function App() {
  const [message, setMessage] = useState<string>("loading...");

  useEffect(() => {
    fetch("/api/app1/responses", { method: "POST" })
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("hello (API not available)"));
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Webform Sample</h1>
      <p>API Response: {message}</p>
    </div>
  );
}
