import { useState } from "react";

export default function ProductivityChart({ api }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    const file = await api.exportCSV();
    setLoading(false);

    if (file) {
      alert("Đã xuất thành công:\n" + file);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px",
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 600,
        background: loading
          ? "#999"
          : "linear-gradient(135deg, #00c6ff, #0072ff)",
        color: "white",
        boxShadow: "0 4px 12px rgba(0, 114, 255, 0.3)",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={e => {
        if (!loading)
          e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {loading ? "⏳ Đang xuất..." : "📥 Xuất CSV"}
    </button>
  );
}