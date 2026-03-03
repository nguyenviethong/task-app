import { useEffect, useState, useRef, useMemo, useCallback  } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay } from "date-fns";
import Stats from "./Stats.jsx";
import Dashboard from "./Dashboard.jsx";
import Kanban from "./Kanban";
import Analytics from "./Analytics";
import BackupRestore from "./BackupRestore";
import toast, { Toaster } from "react-hot-toast";
import Confetti from "react-confetti";
import VirtualList from "./VirtualList.jsx";
import TaskItem from "./TaskItem.jsx";
import Activation from "../Activation";
import Fuse from "fuse.js";
import "./calendar.css";
import "./appmain.css";
import Login from "./Login";
import { isLoggedIn, loadAuth  } from "./auth";
import AISidebar from "./AISidebar";
import LoginModal from "./LoginModal";
import QuotaPopup from "./QuotaPopup";
import Dashboard2 from "./Dashboard2.jsx";
import useTasks from "./hooks/useTasks";

//import Login from "./pages/Login";

import vi from "date-fns/locale/vi";
const locales = { vi };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
});

const api = window.api;


export default function App() {
	
  //const [user, setUser] = useState(null);
  //if (!user) {
    //return <Login 
	//		onLogin={setUser} 
	//		toast={toast}
	//	   />;
  //}
  
  const [licenseExpired, setLicenseExpired] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [activating, setActivating] = useState(false);
  const [restarting, setRestarting] = useState(false);
  
  
  
  const [usage, setUsage] = useState(0);
  
  const [showActivation, setShowActivation] = useState(false);
  
  const [jumpTo, setJumpTo] = useState(null);
	
  const [showNotify, setShowNotify] = useState(false);
  
  const today = new Date().toISOString().split("T")[0];
  //const [typeFilter, setTypeFilter] = useState("all");
  //const [dateFilter, setDateFilter] = useState(today);
  //const [nameFilter, setNameFilter] = useState("");
  //const [priorityFilter, setPriorityFilter] = useState("all");
  
const {
  tasks,
  filtered,
  load,

  typeFilter,
  setTypeFilter,
  priorityFilter,
  setPriorityFilter,
  nameFilter,
  setNameFilter,
  dateFilter,
  setDateFilter
} = useTasks(api);

	
  const [editing, setEditing] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
	
  const [celebrate, setCelebrate] = useState(false);
  
  const [view, setView] = useState("tasks");
  
  const [notifications, setNotifications] = useState([]);
  
  const [error, setError] = useState("");
  
  //const [tasks, setTasks] = useState([]);
  
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyDate, setCopyDate] = useState("");
  


useEffect(() => {
  setSelectedTasks([]);
  setShowCopyModal(false);
}, [typeFilter, priorityFilter, nameFilter, dateFilter]);
  
  
  const total = filtered.length;
  const done = filtered.filter(t => t.done).length;
  const active = total - done;
  
  const [form, setForm] = useState({
    type: "work",
    title: "",
    startAt: "",
    endAt: "",
	priority: "medium"
  });


	
	
useEffect(() => {
  load();

  api.getLicenseStatus().then(info => {
    setLicenseInfo(info);
	let days = findDays(info);
    if (info.type === "expired" || days <= 0) {
      setLicenseExpired(true);
      //setShowActivation(true);
    }
  });
  
}, []);
//tự kiểm tra license mỗi 60s
useEffect(() => {
  const timer = setInterval(async () => {
    const info = await api.getLicenseStatus();
    setLicenseInfo(info);
	let days = findDays(info);
    if (info.type === "expired" || days <= 0) {
      setLicenseExpired(true);
      //setShowActivation(true);
    }
  }, 60000); // check mỗi 60s

  return () => clearInterval(timer);
}, []);


  const add = async () => {
	  if (!form.title) {
		//toast.success(`Báo lại sau ${minutes} phút!`);
		toast.error("Vui lòng nhập tên công việc");
		setError("");
		return;
	  }

	  if (!form.startAt) {
		  toast.error("Vui lòng chọn thời gian bắt đầu");
		return;
	  }
	  
	  setError("");
	  
	  await api.addTask({
		...form,
		startAt: new Date(form.startAt).getTime(),
		endAt: form.endAt
		  ? new Date(form.endAt).getTime()
		  : null
	  });

	  setForm({ type: "work", title: "", startAt: "", endAt: "", priority: "medium" });
	  load();
	  toast.success("Thêm công việc thành công");
  };
  
  
  //const format = t => t ? new Date(t).toLocaleString() : "—";
  const formatDateVN = t => {
	  if (!t) return "—";

	  const d = new Date(t);

	  if (isNaN(d.getTime())) return "—";

	  return format(d, "dd/MM/yyyy HH:mm:ss");
	};
	

  
  const typeLabel = {
	  personal: "Cá nhân",
	  work: "Công việc",
	  study: "Học tập"
	};
  
const eventsCalendar = useMemo(() =>
  tasks.map(t => ({
    title: t.title,
    start: new Date(t.startAt),
    end: t.endAt ? new Date(t.endAt) : new Date(t.startAt)
  }))
, [tasks]);
  
  const prevOverdueRef = useRef([]);
  useEffect(() => {
	  //const overdue = tasks.filter(t =>
		//t.endAt && t.endAt < Date.now() && !t.done
	  //);
	  //setNotifications(overdue);
	  
	  const updateNotifications = () => {
		const alerts  = getTaskAlerts(tasks);
		
		alerts.forEach(t => {
		  if (!prevOverdueRef.current.find(p => p.id === t.id)) {

			if (t.alert === "overdue") {
			  toast.error(`⚠ ${t.title} quá hạn!`);
			}

			if (t.alert === "today") {
			  toast(`📌 Hôm nay: ${t.title}`);
			}

		  }
		});
		
		prevOverdueRef.current = alerts;
		setNotifications(alerts);
	  };

	  updateNotifications(); // run ngay

	  //const timer = setInterval(updateNotifications, 10000); // mỗi 10s

	  //return () => clearInterval(timer);
	  
	}, [tasks]);
	
	//const todayTasks = getTaskAlerts(tasks).filter(t => t.alert === "today");
	const todayTasks = getTaskAlerts(tasks);
	
	const mapState = {
			0: { text: "Đang làm", color: "#FFA500", icon: "🔄" },
			1: { text: "Hoàn thành", color: "#4CAF50", icon: "✅" },
			2: { text: "Quá hạn", color: "#F44336", icon: "⚠" }
		  };
	
	function StatusBadge({ state }) {
		  

		  const s = mapState[state];

		  return (
			<span
			  style={{
				background: s.color,
				color: "#fff",
				padding: "4px 8px",
				borderRadius: 12,
				marginLeft: 10,
				animation: "pulse 1s ease"
			  }}
			>
			  {s.icon} {s.text}
			</span>
		  );
	}
		
	function Progress({ tasks }) {
		  const done = tasks.filter(t => t.done === 1).length;
		  const percent = tasks.length
			? Math.round((done / tasks.length) * 100)
			: 0;

		  return (
			<div style={{ fontSize: 24, margin: 10 }}>
			  🎯 Tiến độ: {percent}%
			</div>
		  );
	}
	
	const toDateTimeLocal = (dateString) => {
	  if (!dateString) return "";
	  const d = new Date(dateString);
	  const pad = (n) => n.toString().padStart(2, "0");

	  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	};
		
	function startEdit(task) {
		  setEditing(task.id);
		  setEditTitle(task.title);
		  //setEditStart(task.startAt?.slice(0,16) || "");
		  //setEditEnd(task.endAt?.slice(0,16) || "");
		  
		  setEditStart(toDateTimeLocal(task.startAt));
          setEditEnd(toDateTimeLocal(task.endAt));
	}
	
	function normalizeVN(str = "") {
	  return str
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "") // remove accents
		.toLowerCase();
	}
	
	function getTaskAlerts(tasks) {
	  const now = Date.now();
	  
	  const startOfToday = new Date();
	  startOfToday.setHours(0, 0, 0, 0);
	  
	  const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

	  return tasks
		.filter(t => !t.done)
		.map(t => {
		  const s = t.startAt;
		  const e = t.endAt;

		  // có endAt
		  if (e) {
			if (e < now) return { ...t, alert: "overdue" };

			const isToday =
			  s <= endOfToday.getTime() &&
			  e >= startOfToday.getTime();

			if (isToday) return { ...t, alert: "today" };
		  }

		  // không có endAt
		  if (!e && now >= s) {
			return { ...t, alert: "today" };
		  }

		  return null;
		})
		.filter(Boolean);
	}
	
	function snoozeTask(id, minutes = 1) {
	  const until = Date.now() + minutes;
	  api.snooze(id, until);
	  toast.success(`Báo lại sau ${minutes} phút!`);
	  load();
	}
	
	function priorityColor(p) {
	  return {
		high: "#ff5252",
		medium: "#ffc107",
		low: "#4caf50"
	  }[p] || "#ccc";
	}
	
	function deadlineText(t) {
	  if (!t.endAt) return "";

	  const diff = t.endAt - Date.now();
	  if (diff <= 0) return "⚠ Quá hạn";

	  const h = Math.floor(diff / 3600000);
	  const m = Math.floor((diff % 3600000) / 60000);

	  return `⏳ ${h}h ${m}m`;
	}
	function deadlineColor(t) {
	  if (!t.endAt) return "#666";

	  const diff = t.endAt - Date.now();

	  if (diff < 0) return "red";
	  if (diff < 3600000) return "orange"; // < 1h

	  return "#666";
	}
	
function isQuanHan(t) {
	  if (!t.endAt) return false;
	  
	  let dates = Date.now();
	  if(t.completedAt){
		  dates = t.completedAt;
	  }
	  const diff = t.endAt - dates;
	  if (diff <= 0) return true;
}
	
function isLate(task) {
	  return task.completedAt && task.endAt && task.completedAt > task.endAt;
}

function updateTaskState(id, newState) {
  setTasks(prev =>
    prev.map(t =>
      t.id === id ? { ...t, done: newState } : t
    )
  );
}


const [pomodoroSec, setPomodoroSec] = useState(1500);
const [pomodoroRunning, setPomodoroRunning] = useState(false);

//Pomodoro Focus Mode
function Pomodoro({ task, sec, setSec, running, setRunning }) {
  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setSec(s => {
        if (s <= 1) {
          setRunning(false);
          alert("🍅 Hoàn thành!");
          return 1500;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running]);

  const m = Math.floor(sec / 60);
  const s = sec % 60;

  return (
    <div style={styles.card}>
      <h3>Focus: {task?.title}</h3>

      <div style={{ fontSize: 48 }}>
        {m}:{s.toString().padStart(2, "0")}
      </div>

      <button onClick={() => setRunning(!running)}>
        {running ? "Pause" : "Start"}
      </button>
    </div>
  );
}


function getStreak(tasks) {
  const days = new Set(
    tasks
      .filter(t => t.completedAt)
      .map(t =>
        new Date(t.completedAt).toDateString()
      )
  );

  return days.size;
}

function suggestTask(tasks) {
  const active = tasks.filter(t => t.done === 0);

  active.sort((a, b) => a.endAt - b.endAt);

  return active[0];
}

const next = suggestTask(filtered);

const taskRefs = useRef({});

useEffect(() => {
  if (!jumpTo) return;

  const el = taskRefs.current[jumpTo];
  if (el) {
    el.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  const timer = setTimeout(() => setJumpTo(null), 2000);
  return () => clearTimeout(timer);
}, [jumpTo]);

function shiftDate(days) {
  if (!dateFilter) return;

  const d = new Date(dateFilter);
  d.setDate(d.getDate() + days);

  const str = d.toISOString().split("T")[0];
  setDateFilter(str);
}

function formatVN(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN");
}

function findDays(info){
	let days = info.days;
	try{
		if(info.exp){
			const now = Date.now();
			const end = new Date(info.exp+ "T07:59:59").getTime();
			days = Math.max(
			  0,
			  Math.ceil((end - now) / (1000 * 60 * 60 * 24))
			);
		}
	}catch(e){	
	}
	return days;
}

async function activateLicense() {
  if (!licenseKey.trim()) {
    toast.error("Vui lòng nhập key");
    return;
  }

  setActivating(true);

  try {
    const res = await api.activateOnline(licenseKey);

    if (res.ok) {
      toast.success("Kích hoạt thành công 🎉");
      setLicenseInfo(await api.getLicenseStatus());
      setLicenseKey("");
	    setRestarting(true);

		  setTimeout(() => {
			api.restart();
		  }, 1200); // delay 1.2s cho mượt
		  
    } else {
      toast.error(res.message || "Key không hợp lệ");
    }
  } catch (e) {
    toast.error("Lỗi kích hoạt license");
  }

  setActivating(false);
}


function NotifyItem({ t }) {
  return (
    <div
      style={styles.notifyItem}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      onClick={() => {
        setView("tasks");
        setTypeFilter("all");
        setPriorityFilter("all");
        setNameFilter("");
        setDateFilter(new Date(t.startAt).toISOString().split("T")[0]);
        setShowNotify(false);
        setJumpTo(t.id);
      }}
    >
      {t.title} <span style={{
		  background: t.alert === "overdue" ? "#ef4444" : "#22c55e",
		  padding: "2px 8px",
		  borderRadius: 999,
		  marginLeft: 6,
		  fontSize: 12
		}}>
		  {t.alert === "overdue" ? "Quá hạn" : "Hôm nay"}
		</span>

    </div>
  );
}

const [collapse, setCollapse] = useState({
  overdue: false,
  today: false
});

const grouped = {
  overdue: notifications.filter(t => t.alert === "overdue"),
  today: notifications.filter(t => t.alert === "today")
};

const notifyStats = useMemo(() => {
  let today = 0;
  let overdue = 0;

  notifications.forEach(n => {
    if (n.status === "today") today++;
    if (n.status === "overdue") overdue++;
  });

  return {
    today,
    overdue,
    all: notifications.length
  };
}, [notifications]);

function GroupHeader({ type, title, count }) {
  const closed = collapse[type];

  return (
    <div
      style={styles.notifyHeader}
      onClick={() =>
        setCollapse(prev => ({
          ...prev,
          [type]: !prev[type]
        }))
      }
    >
      {closed ? "▶" : "▼"} {title} ({count})
    </div>
  );
}


useEffect(() => {
  async function init() {
    const auth = await loadAuth();

    if (auth) {
      localStorage.setItem("token", auth.token);
      localStorage.setItem("apiKey", auth.apiKey);
    }
  }

  init();
}, []);

const [showLogin, setShowLogin] = useState(false);
const [quotaWarn, setQuotaWarn] = useState(false);
const [showAI, setShowAI] = useState(false);

const handleLoginSuccess = (userInfo) => {
    setShowLogin(false);
};

async function callAI() {
  const token = localStorage.getItem("token");
  const apiKey = localStorage.getItem("apiKey");
  const result = await window.authStore.ai(
    { prompt: "Hello AI" },
    token,
	apiKey
  );

  console.log(result);
}

function useAI() {
  if (!isLoggedIn()) {
    setShowLogin(true);
    return false;
  }
  //callAI();
  //if (usage > 80) setQuotaWarn(true);
  return true; // 👈 login OK → mở chat
}

const handleOpenAI = () => {
  if (!isLoggedIn()) {
    setShowLogin(true);
	setShowAI(false);
    return;
  }

  setShowAI(true);
};



// 🔒 khóa app nếu license hết hạn
if (licenseExpired) {
  return (
    <div style={styles.lockScreen}>
      <h2>🔒 License đã hết hạn</h2>
      <p>Vui lòng nhập key để tiếp tục sử dụng</p>

      <button
        style={styles.button}
        onClick={() => setShowActivation(true)}
      >
        Nhập License
      </button>
	  
	  

      {showActivation && (
        <Activation
          onSuccess={async () => {
            setLicenseExpired(false);
            setLicenseInfo(await api.getLicenseStatus());
          }}
        />
      )}
    </div>
  );
}


const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999
};

const modalStyle = {
  background: "#1e1e1e",
  padding: 20,
  borderRadius: 12,
  width: 500,
  maxHeight: "70vh",
  overflowY: "auto",
  color: "white"
};

const sessionRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid #333",
  fontSize: 13
};

return (



	
<div style={styles.app}>

	{licenseInfo && licenseInfo.type === "license" && (
	  <>
	  
	  <button
		  className="ai-bubble"
		  onClick={handleOpenAI}
		>
		  
		  🤖
		</button>
		
	  {/* AI Sidebar */}
	  {showAI && (
		<AISidebar
		  onClose={() => setShowAI(false)}
		  onUseAI={useAI}
		  usage={usage}
		  tasks={todayTasks}
		/>
	  )}

	  {/* Login popup */}
	  {showLogin && (
		<LoginModal
		  onSuccess={handleLoginSuccess}
		  
		  onClose={() => setShowLogin(false)}
		  toast={toast}
		/>
	  )}

	  {/* Quota popup */}
	  {quotaWarn && (
		<QuotaPopup
		  usage={usage}
		  onClose={() => setQuotaWarn(false)}
		/>
	  )}
		
		
		
		
	  </>
	)}


			{licenseInfo && (
			  <div style={{
				padding: "6px 12px",
				borderRadius: 8,
				background:
				  licenseInfo.type === "license"
					? "#22c55e"
					: "#f59e0b",
				color: "white",
				fontWeight: "bold"
			  }}>
				XIN CHÀO {licenseInfo.user ?? "User"} —{" "}
				{licenseInfo.type === "license"
				  ? `PRO • Exp ${licenseInfo.exp}`
				  : `Trial • ${licenseInfo.days} ngày`}
				  
			  </div>
			)}

				<Toaster position="top-right" />
				{celebrate && <Confetti recycle={false} />}

				<header style={styles.header_sticky}>
				  <h1>📋 Quản lý công việc</h1>
					
				  <div style={{ display: "flex", gap: 10 }}>
					
					
					<div style={styles.navGroup}>
					  <button
						style={view === "tasks" ? styles.navActive : styles.navBtn}
						onClick={() => setView("tasks")}
					  >
						📋 Công việc
					  </button>

					  <button
						style={view === "dashboard" ? styles.navActive : styles.navBtn}
						onClick={() => setView("dashboard")}
					  >
						📊 Thống kê
					  </button>

					  <button
						style={view === "kanban" ? styles.navActive : styles.navBtn}
						onClick={() => setView("kanban")}
					  >
						🧱 Kanban
					  </button>
					  
					  
					  <button
						style={view === "analytics" ? styles.navActive : styles.navBtn}
						onClick={() => setView("analytics")}
					  >
						📈 Analytics
					  </button>
					  
					  
					  <button
						  style={{
							...(view === "focus" ? styles.navActive : styles.navBtn),
							display: "none"
						  }}
						onClick={() => setView("focus")}
					  >
						Focus
					  </button>
					  
					  <button
						style={view === "backuprestore" ? styles.navActive : styles.navBtn}
						onClick={() => setView("backuprestore")}
					  >
						BackupRestore
					  </button>
					  
					  <button
						  style={styles.navBtn}
						  onClick={() => setShowActivation(true)}
						>
						  🔑 License
						</button>
					  
					</div>
					
					<div style={styles.notifyWrapper}>
						<button
						  style={styles.bell}
						  onClick={() => setShowNotify(!showNotify)}
						>
						  🔔
						  {notifications.length > 0 && (
							<span style={styles.badge}>{notifications.length}</span>
						  )}
						</button>
						
						{showNotify && (
						  <div style={styles.notifyDropdown}>
							<h3>Thông báo</h3>

							{notifications.length === 0 && (
							  <div style={{ opacity: 0.6 }}>Không có thông báo</div>
							)}

							{grouped.overdue.length > 0 && (
							  <>
								<GroupHeader
								  type="overdue"
									title="⚠ Quá hạn"
								  count={grouped.overdue.length}
								/>

								{!collapse.overdue &&
								  grouped.overdue.map(t => (
									<NotifyItem key={t.id} t={t} />
								  ))}
							  </>
							)}

							{grouped.today.length > 0 && (
							  <>
								<GroupHeader
								  type="today"
								  title="📌 Hôm nay"
								  count={grouped.today.length}
								/>

								{!collapse.today &&
								  grouped.today.map(t => (
									<NotifyItem key={t.id} t={t} />
								  ))}
							  </>
							)}
							
							
							
						  </div>
						)}
						
					</div>

					
					
					
				  </div>
				</header>


				<header style={styles.header}>
					<h3> Gợi ý: {next ? next.title : "Nghỉ ngơi"}</h3>
					
					<div>🔥 Streak: {getStreak(tasks)} ngày</div>
				</header>
				
			  
				{view === "tasks" && (
				  <div style={styles.layout}>

					{/* LEFT PANEL */}
					<div style={styles.left}>

					  <div style={styles.card}>
						<h3>➕ Thêm công việc</h3>

						<select
						  value={form.type}
						  onChange={e => setForm({ ...form, type: e.target.value })}
						  style={styles.input}
						>
						  <option value="personal">Cá nhân</option>
						  <option value="work">Công việc</option>
						  <option value="study">Học tập</option>
						</select>
						
						<select
						  value={form.priority}
						  onChange={e => setForm({ ...form, priority: e.target.value })}
						  style={styles.input}
						>
						  <option value="high">🔴 Cao</option>
						  <option value="medium">🟡 Trung</option>
						  <option value="low">🟢 Thấp</option>
						</select>

						<textarea
						  placeholder="Nhập tên công việc..."
						  value={form.title}
						  onChange={e => setForm({ ...form, title: e.target.value })}
						  rows={3}
						  style={{
							...styles.input,
							minHeight: "90px",
							borderRadius: "10px",
							padding: "10px",
							fontSize: "14px",
							lineHeight: "1.5",
							resize: "vertical"
						  }}
						/>

						<input
						  type="datetime-local"
						  value={form.startAt}
						  onChange={e => setForm({ ...form, startAt: e.target.value })}
						  style={styles.input}
						/>
						

						<input
						  type="datetime-local"
						  value={form.endAt}
						  onChange={e => setForm({ ...form, endAt: e.target.value })}
						  style={styles.input}
						/>

						{error && <div style={styles.error}>⚠ {error}</div>}

						<button onClick={add} style={styles.button}>
						  Thêm công việc
						</button>
					  </div>

					  <div style={styles.card}>
						<h3>🔍 Bộ lọc</h3>

						<select
						  value={typeFilter}
						  onChange={e => setTypeFilter(e.target.value)}
						  style={styles.input}
						>
						  <option value="all">Tất cả loại</option>
						  <option value="work">Công việc</option>
						  <option value="study">Học tập</option>
						  <option value="personal">Cá nhân</option>
						</select>
						
						<select
						  value={priorityFilter}
						  onChange={e => setPriorityFilter(e.target.value)}
						  style={styles.input}
						>
						  <option value="all">Phân loại</option>
						  <option value="high">🔴 Cao</option>
						  <option value="medium">🟡 Trung</option>
						  <option value="low">🟢 Thấp</option>
						</select>
						<div style={styles.dateRow}>
							 <button
								style={styles.dateBtn}
								onClick={() => shiftDate(-1)}
							  >
								◀
							 </button>
							 <div style={{ flex: 1 }}>
								<input
								  type="date"
								  value={dateFilter}
								  onChange={e => setDateFilter(e.target.value)}
								  style={{ ...styles.input, width: "-webkit-fill-available" }}
								/>
								<div style={styles.datePreview}>
								  {formatVN(dateFilter)}
								</div>
							 </div>
							 
							
							  <button
							style={styles.dateBtn}
							onClick={() => shiftDate(1)}
						  >
							▶
						  </button>

						</div>
						

						<input
						  placeholder="Tìm công việc..."
						  value={nameFilter}
						  onChange={e => setNameFilter(e.target.value)}
						  style={styles.input}
						/>
					  </div>

					  <Progress tasks={filtered} />

					</div>

					{/* RIGHT PANEL */}
					<div style={styles.right}>
						
					  
						  <div style={styles.card}>
							<Calendar
							  culture="vi"
							  localizer={localizer}
							  events={eventsCalendar}
							  startAccessor="start"
							  endAccessor="end"
							  style={{ height: 400 }}
							/>
						  </div>
					  

					  <div style={styles.card}>
						  
						<div style={{
						  display: "flex",
						  justifyContent: "space-between",
						  alignItems: "center",
						  marginBottom: 12
						}}>
						  <h3 style={{ margin: 0 }}>📌 Danh sách công việc</h3>

						  {selectedTasks.length > 0 && (
							<button
							  onClick={() => setShowCopyModal(true)}
							  style={{
								padding: "6px 12px",
								borderRadius: 6,
								background: "#2196f3",
								color: "white",
								border: "none",
								cursor: "pointer"
							  }}
							>
							  📋 Copy ({selectedTasks.length})
							</button>
						  )}
						</div>
						
						
						<div style={styles.list}>						

						  
						  {filtered.map((t, i) => (
								<TaskItem
								  key={t.id}
								  t={t}
								  i={i}
								  editing={editing}
								  editTitle={editTitle}
								  setEditTitle={setEditTitle}
								  startEdit={startEdit}
								  setEditing={setEditing}
								  
								  editStart={editStart}          // thêm
								  setEditStart={setEditStart}    // thêm
								  editEnd={editEnd}              // thêm
								  setEditEnd={setEditEnd}        // thêm
								  
								  load={load}
								  api={api}
								  styles={styles}
								  formatDateVN={formatDateVN}
								  typeLabel={typeLabel}
								  isLate={isLate}
								  deadlineColor={deadlineColor}
								  deadlineText={deadlineText}
								  StatusBadge={StatusBadge}
								  jumpTo={jumpTo}
								  taskRefs={taskRefs}
								  selectedTasks={selectedTasks}
								  setSelectedTasks={setSelectedTasks}
								/>
						  ))}
						  
						  
						</div>
						
						{showCopyModal && (
							  <div style={modalOverlayStyle}>
								<div style={modalStyle}>
								  <h3>📅 Copy công việc sang ngày khác</h3>
								  
								      {/* PREVIEW */}
									  <div style={{
										maxHeight: 150,
										overflowY: "auto",
										marginBottom: 16,
										padding: 10,
										background: "#1e1e1e",
										borderRadius: 8
									  }}>
										{filtered
										  .filter(t => selectedTasks.includes(t.id))
										  .map(t => (
											<div key={t.id} style={{ marginBottom: 6 }}>
											  ✓ {t.title}
											</div>
										))}
									  </div>

								      {/* DATE */}
									  <div style={{ marginBottom: 12 }}>
										<input
										  type="date"
										  value={copyDate}
										  onChange={e => setCopyDate(e.target.value)}
										  style={{
											
											padding: 8,
											borderRadius: 8,
											border: "1px solid #333",
											
										  }}
										/>
									  </div>
									  
									  

								  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
									<button onClick={() => setShowCopyModal(false)}>
									  Hủy
									</button>

									<button
									  onClick={async () => {
										if (!copyDate || selectedTasks.length === 0) {
										  toast.error("Vui lòng chọn task và ngày copy");
										  return;
										}
										try {
											await api.copyTasks(selectedTasks, copyDate);
											
											//setSelectedTasks([]);
											setShowCopyModal(true);
											load();
											toast.success("Copy thành công");
										} catch (error) {
										  toast.error("Copy thất bại ❌");
										}
										
									  }}
									  style={{
										background: "#4caf50",
										color: "white",
										border: "none",
										padding: "6px 12px",
										borderRadius: 6
									  }}
									>
									  Copy
									</button>
								  </div>
								</div>
							  </div>
							)}
						
						
						
					  </div>

					</div>
				  </div>
				)}

				{view === "dashboard" && (
				  <>
					<Dashboard2 api={api} />
					<Dashboard tasks={tasks} />
				  </>
				  
				)}
				{view === "kanban" && (
				  <Kanban 
					tasks={tasks}
					styles={styles}
					isQuanHan={isQuanHan}
					priorityColor={priorityColor}
					deadlineText={deadlineText}
					isLate={isLate}
					onMove={updateTaskState}
					formatDateVN={formatDateVN}
					formatVN={formatVN}
				  />
				)}
				{view === "analytics" && (
				  <Analytics 
					tasks={filtered}
					styles={styles}
				  />
				)}
				{view === "focus" && (
					<Pomodoro
						task={next}
						sec={pomodoroSec}
						setSec={setPomodoroSec}
						running={pomodoroRunning}
						setRunning={setPomodoroRunning}
					  />
				)}
				{view === "backuprestore" && (
				  <BackupRestore
					styles={styles}
					onReload={load}
					toast={toast}
				  />
				)}
				
				
			{showActivation && (
			  <div style={styles.modalOverlay}>
				<div style={styles.modal}>
				  <h3>🔑 Kích hoạt License</h3>

				  <input
					placeholder="Nhập license key..."
					value={licenseKey}
					onChange={e => setLicenseKey(e.target.value)}
					style={styles.input}
				  />

				  <div style={{ display: "flex", gap: 10 }}>
					<button onClick={activateLicense} style={styles.button}>
					  Kích hoạt
					</button>

					<button
					  onClick={() => setShowActivation(false)}
					  style={styles.cancelBtn}
					>
					  Đóng
					</button>
				  </div>
				</div>
			  </div>
			)}

			{restarting && (
			  <div style={styles.restartOverlay}>
				<div style={styles.restartBox}>
				  🔄 Đang khởi động lại...
				</div>
			  </div>
			)}






</div>
  
  
  
);



}

const styles = {
  app: {
    padding: 30,
    fontFamily: "Segoe UI",
    background: "#f4f6f8",
    height: "100vh"
  },

  
  title: {
    marginBottom: 20
  },
  card: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    marginBottom: 20,
    display: "grid",
    gap: 10
  },
  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ddd"
  },
  button: {
    padding: 12,
    borderRadius: 6,
    border: "none",
    background: "#4CAF50",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer"
  },
  list: {
    display: "grid",
    gap: 10,
	borderRadius: 10,
	maxHeight: 400,
	
	  overflowY: "auto",
	  border: "1px solid #333",
	  padding: 5,
	    maxHeight: "100vh",
  overflowY: "auto",
  scrollbarWidth: "thin"
  },
  task: {
    background: "white",
    padding: 15,
    borderRadius: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
  },
  meta: {
    fontSize: 12,
    color: "#666"
  },
  
  dashboard: {
  display: "flex",
  gap: 20,
  marginBottom: 20
  },
  
  navBtn: {
	  padding: "8px 16px",
	  borderRadius: 8,
	  background: "#2196F3",
	  color: "#fff",
	  border: "none",
	  cursor: "pointer",
	  marginBottom: 20
 },
 
 
 notifyWrapper: {
  position: "relative",
  display: "inline-block"
},

bell: {
  fontSize: 22,
  cursor: "pointer",
  background: "none",
  border: "none",
  position: "relative"
},

badge: {
  position: "absolute",
  top: -6,
  right: -6,
  background: "red",
  color: "white",
  borderRadius: "50%",
  fontSize: 12,
  padding: "2px 6px"
},

notifyDropdown: {
  position: "absolute",
  left: 0,
  top: 36,
  width: 260,
  maxHeight: 400,
  overflowY: "auto",
  background: "lightgray",
  border: "1px solid #333",
  borderRadius: 8,
  padding: 10,
  zIndex: 999,
  boxShadow: "0 6px 20px rgba(0,0,0,0.4)"
  
},




header: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20
},

layout: {
  display: "grid",
  gridTemplateColumns: "320px 1fr",
  gap: 20,
  
    
  
},

left: {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  overflowY: "auto",
  minHeight: 0,
  
  
},

right: {
  display: "grid",
  gap: 20
},

error: {
  color: "red",
  fontWeight: "bold"
},

navGroup: {
  display: "flex",
  gap: 10,
  marginBottom: 20
},

navActive: {
  padding: "8px 16px",
  borderRadius: 8,
  background: "#4CAF50",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold"
},


kanbanBoard: {
  display: "flex",
  gap: 20
},

kanbanColumn: {
  flex: 1,
  background: "#eee",
  padding: 10,
  borderRadius: 10,
  minHeight: 400
},

kanbanCard: {
  background: "white",
  padding: 10,
  borderRadius: 8,
  marginBottom: 10,
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  transition: "transform 0.2s ease"
},

//new
  app: {
    padding: 20,
    fontFamily: "Inter, Segoe UI, sans-serif",
    background: "#f1f3f6",
  },
  
  header_sticky: {
    position: "sticky",
	top: 0,
	zIndex: 5,
	paddingBottom: 8,
	borderBottom: "1px solid #eee",
	  
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    background: "#111827",
    color: "white",
    borderRadius: 12,
    marginBottom: 16
  },
  
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    background: "#111827",
    color: "white",
    borderRadius: 12,
    marginBottom: 16
  },
    button: {
    padding: 12,
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "white",
    fontWeight: 600,
    cursor: "pointer"
  },
    navGroup: {
    display: "flex",
    gap: 10
  },

  navBtn: {
    padding: "8px 14px",
    borderRadius: 8,
    background: "#374151",
    color: "#fff",
    border: "none",
    cursor: "pointer"
  },

  navActive: {
    padding: "8px 14px",
    borderRadius: 8,
    background: "#22c55e",
    color: "#fff",
    border: "none",
    fontWeight: "bold"
  },

  bell: {
    fontSize: 22,
    cursor: "pointer",
    background: "none",
    border: "none",
    position: "relative",
    color: "white"
  },

  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    background: "red",
    color: "white",
    borderRadius: "50%",
    fontSize: 12,
    padding: "2px 6px"
  },

  notifyDropdown: {
      position: "absolute",
	  right: 0,
	  top: 36,
	  width: 280,
	  maxHeight: 300,
	  overflowY: "auto",
	  background: "#111827",
	  color: "white",
	  borderRadius: 12,
	  padding: 10,
	  zIndex: 999,
	  boxShadow: "0 12px 28px rgba(0,0,0,0.5)"
	
	
  },

  notifyItem: {
	  padding: 8,
	  borderBottom: "1px solid #333",
	  fontSize: 14,
	  cursor: "pointer",
	  transition: "0.15s",
	},

	notifyItemHover: {
	  background: "rgba(255,255,255,0.1)"
	},
  
	notifyWrapper: {
	  position: "relative",
	  display: "inline-block"
	},
	
	editBox: {
  display: "flex",
  gap: 8,
  alignItems: "center",
  width: "100%"
},

editInput: {
  flex: 1,
  padding: 8,
  borderRadius: 8,
  border: "1px solid #ddd",
  fontSize: 14
},

editActions: {
  display: "flex",
  gap: 6
},

saveBtn: {
  background: "#22c55e",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: "bold"
},

cancelBtn: {
  background: "#ef4444",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: "bold"
},
taskHighlight: {
  outline: "3px solid #f44336",
  background: "#fff5f5",
  transition: "0.3s ease"
},
dateRow: {
  display: "flex",
  gap: 6,
  alignItems: "center"
},

dateBtn: {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#f9fafb",
  cursor: "pointer",
  fontSize: 14
},
datePreview: {
  fontSize: 12,
  color: "#666",
  marginTop: 4,
  textAlign: "center"
},


modalOverlay: {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999
},

modal: {
  background: "white",
  padding: 24,
  borderRadius: 12,
  width: 400,
  display: "grid",
  gap: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
},

restartOverlay: {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 99999,
  animation: "fadeIn 0.5s ease"
},

restartBox: {
  background: "#111827",
  color: "white",
  padding: 30,
  borderRadius: 14,
  fontSize: 20,
  fontWeight: "bold",
  boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
},


lockScreen: {
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: 16,
  background: "#111827",
  color: "white",
  fontSize: 18
},


notifyHeader: {
  fontSize: 13,
  opacity: 0.8,
  padding: "6px 6px",
  borderBottom: "1px solid #333",
  marginTop: 6,
  cursor: "pointer",
  fontWeight: "bold",
  userSelect: "none"
},


dateRowKanban: {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12
},


trackingBtn: {
  padding: "4px 8px",
  borderRadius: 4,
  cursor: "pointer"
}

};