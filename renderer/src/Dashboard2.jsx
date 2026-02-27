import React, { useEffect, useState } from "react";
import ProductivityChart from "./ProductivityChart.jsx";
import ExportButton  from "./ExportButton.jsx";

const formatHours = (ms) =>
  (ms / 3600000).toFixed(2);

export default function Dashboard2({ api }) {

  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  //const [compare, setCompare] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const s = await api.getDashboardStats();
    const chart = await api.getLast7DaysChart();
	
	//const data = await api.getWeeklyComparison();
    //setCompare(data);

    setStats(s);
    setChartData(
      chart.map(d => ({
        date: d.date,
        hours: (d.total / 3600000).toFixed(2)
      }))
    );
  };
  


  if (!stats) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>

      <h2>📊 Thời gian thực hiện</h2>
		<>
		  <ExportButton api={api} />
		</>
      {/* KPI CARDS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 16,
        marginBottom: 30
      }}>
        <Card title="🔥 Hôm nay" value={formatHours(stats.today) + " h"} />
        <Card title="📅 Tuần này" value={formatHours(stats.week) + " h"} />
        <Card title="📆 Tháng này" value={formatHours(stats.month) + " h"} />
        <Card title="✅ Đã hoàn thành (ALL)" value={stats.completed} />
      </div>
	  
	  

      {/* TOP TASK */}
      {stats.topTask && (
        <div style={{
          padding: 16,
          borderRadius: 12,
          background: "#f5f5f5",
          marginBottom: 30
        }}>
          🏆 Task nhiều thời gian nhất:
          <b> {stats.topTask.title}</b>
          {" (" + formatHours(stats.topTask.total) + " h)"}
        </div>
      )}

      {/* CHART */}
      <h3>📈 7 ngày gần nhất</h3>
      <ProductivityChart data={chartData} />

    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={{
      padding: 20,
      borderRadius: 16,
      background: "#ffffff",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
    }}>
      <div style={{ fontSize: 14, opacity: 0.6 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: "bold" }}>{value}</div>
    </div>
  );
}