import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Stats({ tasks }) {
  const done = tasks.filter(t => t.done === 1).length;
  const overdue = tasks.filter(t =>
    t.endAt && t.endAt < Date.now() && t.done === 0
  ).length;
  const active = tasks.length - done - overdue;

  const data = {
    labels: ["Đã xong", "Đang làm", "Quá hạn"],
    datasets: [
      {
        data: [done, active, overdue],
        backgroundColor: ["#4CAF50", "#2196F3", "#F44336"]
      }
    ]
  };

  return (
    <div style={{ width: 300, margin: "20px auto" }}>
      <Pie data={data} />
    </div>
  );
}
