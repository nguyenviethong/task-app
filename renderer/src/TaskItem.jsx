import React from "react";

const TaskItem = React.memo(function TaskItem({
  t,
  i,
  editing,
  editTitle,
  setEditTitle,
  startEdit,
  setEditing,
  
  editStart,        // thêm
  setEditStart,     // thêm
  editEnd,          // thêm
  setEditEnd,       // thêm
  
  load,
  api,
  styles,
  formatDateVN,
  typeLabel,
  isLate,
  deadlineColor,
  deadlineText,
  StatusBadge,
  jumpTo,
  taskRefs
}) {
  // ================================
  // ⏱ TIME TRACKING ENGINE (PRO)
  // ================================
const [now, setNow] = React.useState(Date.now());
const frameRef = React.useRef(null);

const [showSessions, setShowSessions] = React.useState(false);
const [sessions, setSessions] = React.useState([]);


const openSessions = async () => {
  const data = await api.getTrackingSessionsByTask(t.id);
  setSessions(data);
  setShowSessions(true);
};

  // chỉ chạy khi task đang tracking
  React.useEffect(() => {
    if (!t.isTracking || !t.actualStart) return;

    let lastSecond = null;

    const tick = () => {
      const current = Date.now();
      const currentSecond = Math.floor(current / 1000);

      // chỉ update khi qua giây mới → tránh re-render 60fps
      if (currentSecond !== lastSecond) {
        lastSecond = currentSecond;
        setNow(current);
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [t.isTracking, t.actualStart]);

  // ================================
  // ⏳ TÍNH THỜI GIAN LIVE
  // ================================

  const baseTime = Number(t.totalTimeSpent) || 0;

  const liveTime =
    t.isTracking && t.actualStart
      ? baseTime + (now - t.actualStart)
      : baseTime;

  const formatDuration = (ms) => {
    const safeMs = Number(ms) || 0;
    const totalMinutes = Math.floor(safeMs / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };
  
  
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
  
	
console.log("done:", t.done, typeof t.done);
console.log("isTracking:", t.isTracking, typeof t.isTracking);

  return (
  
    <div 
		key={t.id} 
		ref={el => (taskRefs.current[t.id] = el)}
		style={{
			...styles.task,
			...(jumpTo === t.id ? styles.taskHighlight : {})
		}}
	>
	
      <div>

        {editing === t.id ? (
          <div style={styles.editBox}>
            <textarea
  autoFocus
  value={editTitle}
  onChange={e => setEditTitle(e.target.value)}
  onKeyDown={async e => {
    // Enter (không phải Shift+Enter) → Save
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // tránh xuống dòng
      await api.updateTask(t.id, {
        title: editTitle,
        startAt: editStart ? new Date(editStart).getTime() : null,
        endAt: editEnd ? new Date(editEnd).getTime() : null
      });
      setEditing(null);
      load();
    }

    // Escape → Cancel
    if (e.key === "Escape") {
      setEditing(null);
    }
  }}
  rows={2}
  style={{
    ...styles.editInput,
    minHeight: "60px",
    resize: "vertical",
    lineHeight: "1.4"
  }}
/>

            <div style={styles.editActions}>
              <button
                style={styles.saveBtn}
				title="Lưu"
                onClick={async () => {
                  await api.updateTask(t.id, {
						title: editTitle,
						startAt: editStart ? new Date(editStart).getTime() : null,
						endAt: editEnd ? new Date(editEnd).getTime() : null
				  });
                  setEditing(null);
                  load();
                }}
              >
                ✓
              </button>

              <button
                style={styles.cancelBtn}
				title="Huỷ"
                onClick={() => setEditing(null)}
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <b style={{whiteSpace: "pre-line"}} >{i + 1}. {t.title}</b>
        )}

        <div
          style={{
            width: "100%",
            height: 7,
            background: t.priority === "high"
              ? "#ff5252"
              : t.priority === "medium"
              ? "#ffc107"
              : "#4caf50",
            borderRadius: 4
          }}
        />
		
		{/* ===== META ===== */}
		
        <div style={styles.meta}>
          {typeLabel[t.type]} • Tạo {formatDateVN(t.createdAt)}
        </div>
		{/* ===== TIME TRACKING DISPLAY ===== */}
		
		<div
		  style={{
			...styles.meta,
			cursor: "pointer",
			color: "#00c6ff"
		  }}
		  onClick={openSessions}
		>
		  ⏳ Đã làm: {formatDuration(liveTime)}
		</div>
		
		
		{showSessions && (
		  <div style={modalOverlayStyle}>
			<div style={modalStyle}>
			  <h3>📜 Lịch sử Tracking</h3>

			  {sessions.length === 0 && <p>Chưa có dữ liệu</p>}

			  {sessions.map(s => {
				const duration = s.endAt
				  ? s.endAt - s.startAt
				  : Date.now() - s.startAt;

				return (
				  <div key={s.id} style={sessionRowStyle}>
					<div>
					  🕒 {new Date(s.startAt).toLocaleString("vi-VN", { hour12: false })}
					</div>
					<div>
					  ➜ {s.endAt
						? new Date(s.endAt).toLocaleString("vi-VN", { hour12: false })
						: "Đang chạy"}
					</div>
					<div>
					  ⏱ {formatDuration(duration)}
					</div>
				  </div>
				);
			  })}

			  <button onClick={() => setShowSessions(false)}>
				Đóng
			  </button>
			</div>
		  </div>
		)}
		
		
		{/* ===== START / END ===== */}
        {editing === t.id ? (
		  <div style={{ ...styles.meta, display: "flex", gap: 6 }}>
			<input
			  type="datetime-local"
			  value={editStart}
			  onChange={e => setEditStart(e.target.value)}
			  style={{ ...styles.input, width: "-webkit-fill-available" }}
			/>
			→
			<input
			  type="datetime-local"
			  value={editEnd}
			  onChange={e => setEditEnd(e.target.value)}
			  style={{ ...styles.input, width: "-webkit-fill-available" }}
			/>
		  </div>
		) : (
		  <div style={styles.meta}>
			⏰ Thực hiện {formatDateVN(t.startAt)} → {formatDateVN(t.endAt)}
		  </div>
		)}
		 {/* ===== DEADLINE ===== */}
        {t.completedAt ? (
          <div style={styles.meta}>
            ✅ Hoàn thành {formatDateVN(t.completedAt)}
            {isLate(t) && (
              <span style={{ color: "red", marginLeft: 8 }}>
                🔴 Trễ hạn
              </span>
            )}
          </div>
        ) : (
          <div style={{ ...styles.meta, color: deadlineColor(t) }}>
            <b>{deadlineText(t)}</b>
          </div>
        )}
      </div>
      {/* ================================
          BUTTON CONTROL PANEL
      ================================= */}
      <div style={{ display: "flex", gap: 6, alignItems: "center"  }}>
        <StatusBadge state={t.done} />

        <button title="Chỉnh sửa" onClick={() => startEdit(t)}>✏</button>

        <button style={{display: "none"}}
          onClick={async () => {
            await api.toggleTask(t.id);
            load();
          }}
        >
          ✅
        </button>

        <button
		  title="Xóa công việc"
          onClick={() => {
            api.deleteTask(t.id);
            load();
          }}
        >
          ❌
        </button>
		{/* START */}
		{!Boolean(t.isTracking) && !Boolean(t.done) && (
			<button
			  title="Bắt đầu"
			  onClick={async () => {
				await api.startTracking(t.id);
				load();
			  }}
			>
			  ▶
			</button>
		  )}
		  {!!t.isTracking && (
			<button
			  title="Tạm dừng"
			  onClick={async () => {
				await api.pauseTracking(t.id);
				load();
			  }}
			>
			  ⏸
			</button>
		  )}
		  {!Boolean(t.done) && (
			<button
			  title="Dừng và Hoàn thành"
			  onClick={async () => {
				await api.stopTracking(t.id);
				load();
			  }}
			>
			  ⏹
			</button>
		  )}
		
		
		
		
		
		
		
		
		
      </div>
	  
	  
	  


	  
    </div>
	
	
	
  );
  

  
});

export default TaskItem;
