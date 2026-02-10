import { useState } from "react";

export default function Activation({ onSuccess }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function activate() {
    setLoading(true);
    setStatus(null);
	if (!text.trim()) {
		setStatus("invalid");
		return;
	 }
    try {
      const res = await api.activateOnline(text);

      if (res.ok) {
        setStatus("success");
        setTimeout(onSuccess, 1500);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("invalid");
    }

    setLoading(false);
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>

        <h2>🔐 Activate Pro</h2>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste license here..."
          style={styles.textarea}
        />

        <button
          onClick={activate}
          disabled={loading}
          style={styles.button}
        >
          {loading ? "Activating..." : "Activate"}
        </button>

        {status === "success" && (
          <div style={{ ...styles.msg, color: "#22c55e" }}>
            ✔ Activated successfully!
          </div>
        )}

        {status === "error" && (
          <div style={{ ...styles.msg, color: "#ef4444" }}>
            ❌ License invalid
          </div>
        )}

        {status === "invalid" && (
          <div style={{ ...styles.msg, color: "#f59e0b" }}>
            ⚠ Invalid format
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  wrap: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0f172a"
  },

  card: {
    background: "#111827",
    padding: 30,
    borderRadius: 16,
    width: 420,
    display: "grid",
    gap: 14,
    color: "white",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    animation: "fadeIn 0.4s ease"
  },

  textarea: {
    height: 120,
    padding: 12,
    borderRadius: 10,
    border: "1px solid #333",
    background: "#020617",
    color: "white",
    fontFamily: "monospace"
  },

  button: {
    padding: 12,
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer"
  },

  msg: {
    fontWeight: "bold",
    textAlign: "center",
    animation: "pop 0.3s ease"
  }
};

