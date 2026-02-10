import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement
} from "chart.js";

import ChartDataLabels from "chartjs-plugin-datalabels";
import { Pie, Bar, Line } from "react-chartjs-2";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import { useState } from "react";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { DateRange } from "react-date-range";
import { vi } from "date-fns/locale";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ChartDataLabels
);

export default function Dashboard({ tasks }) {

  const [range, setRange] = useState([
	  {
		startDate: new Date(),
		endDate: new Date(),
		key: "selection"
	  }
	]);

	const startDate = new Date(range[0].startDate);
	startDate.setHours(0, 0, 0, 0);

	const endDate = new Date(range[0].endDate);
	endDate.setHours(23, 59, 59, 999);

	const start = startDate.getTime();
	const end = endDate.getTime();
	
  
  const filtered = tasks.filter(t => {
	    const time = t.endAt || t.startAt;
		  if (!time) return false;
		  return time >= start && time <= end;
	});

  const now = Date.now();

  const done = filtered.filter(t => t.done === 1).length;
  const overdue = filtered.filter(
    t => t.endAt && t.endAt < now && t.done === 0
  ).length;
  const active = filtered.length - done - overdue;

  const productivity = filtered.length
    ? Math.round((done / filtered.length) * 100)
    : 0;

  // Weekly stats
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(now - i * 86400000);
    const label = day.toLocaleDateString();
    const count = filtered.filter(t =>
      t.done === 1 &&
      new Date(t.endAt).toDateString() === day.toDateString()
    ).length;
    return { label, count };
  }).reverse();
  
  const byType = filtered.reduce((acc, t) => {
	  acc[t.type] = (acc[t.type] || 0) + 1;
	  return acc;
	}, {});
	
  const columns = {
	  personal: filtered.filter(t => t.type === "personal"),
	  work: filtered.filter(t => t.type === "work"),
	  study: filtered.filter(t => t.type === "study")
	};
	
	const typeLabel = {
	  personal: "Cá nhân",
	  work: "Công việc",
	  study: "Học tập"
	};
	
	
	const typeData = {
	  labels: Object.keys(byType),
	  datasets: [{
		data: Object.values(byType),
		backgroundColor: ["#2196F3", "#4CAF50", "#FF9800"]
	  }]
	};


  const pieData = {
    labels: ["Hoàn thành", "Đang làm", "Quá hạn"],
    datasets: [
      {
        data: [done, active, overdue],
        backgroundColor: ["#4CAF50", "#2196F3", "#F44336"]
      }
    ]
  };

  const barData = {
    labels: last7.map(d => d.label),
    datasets: [
      {
        label: "Công việc hoàn thành",
        data: last7.map(d => d.count),
        backgroundColor: "#9C27B0"
      }
    ]
  };

  const lineData = {
    labels: last7.map(d => d.label),
    datasets: [
      {
        label: "Trend",
        data: last7.map(d => d.count),
        borderColor: "#FF9800",
        tension: 0.4
      }
    ]
  };

  const heatmapData = last7.map(d => ({
    date: d.label,
    count: d.count
  }));
  
  function formatVN(dateStr) {
	  if (!dateStr) return "";
	  const d = new Date(dateStr);
	  return d.toLocaleDateString("vi-VN");
	}
	
	function setPreset(days) {
  const now = new Date();
  const past = new Date(Date.now() - days * 86400000);

  setRange([
    {
      startDate: past,
      endDate: now,
      key: "selection"
    }
  ]);
}

  return (
    <div style={{
	  width: "1000px",
	  maxWidth: "95%",
	  margin: "20px auto",
	  padding: 20,
	  background: "#111",
	  color: "#fff",
	  borderRadius: 12,
	  boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
	}}>
      <h2>📊 Thống kê</h2>
	  
		 
			<div style={{
			  background: "#222",
			  padding: 10,
			  borderRadius: 8,
			  marginBottom: 20
			}}>

				  <div style={{ marginBottom: 10 }}>
					<button onClick={() => setPreset(1)}>Today</button>
					<button onClick={() => setPreset(7)}>7 days</button>
					<button onClick={() => setPreset(30)}>30 days</button>
				  </div>

				  <DateRange
					editableDateInputs
					onChange={item => setRange([item.selection])}
					moveRangeOnFirstSelection={false}
					ranges={range}
					locale={vi}
				  />

			</div>
		
		
	  <div style={{ display: "flex", gap: 20 }}>

		  {Object.entries(columns).map(([type, list]) => (
			<div key={type} style={styles.column}>
			  <h3>{<span>{typeLabel[type]}</span>}</h3>

			  {list.map(t => (
				<div key={t.id} style={styles.card}>
				  {t.title}
				</div>
			  ))}
			</div>
		  ))}
		</div>


      <h3>🔥 Tỉ lệ: {productivity}%</h3>
	  

      <div style={{ display: "flex", gap: 40 }}>
        <div style={{ width: 250 }}>
		  <Pie data={typeData} />
		  
          <Pie data={pieData} />
		  
        </div>

        <div style={{ flex: 1 }}>
          <Bar data={barData} />
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
        <Line data={lineData} />
      </div>


      
      
    </div>
  );
}

const styles = {
column: {
  flex: 1,
  background: "#222",
  padding: 10,
  borderRadius: 8
},

card: {
  background: "#333",
  padding: 8,
  marginBottom: 6,
  borderRadius: 6
}
	
};
