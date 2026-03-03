import React from "react";
import ReactDOM from "react-dom";

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
  taskRefs,
  selectedTasks,
  setSelectedTasks
}) {
  // ================================
  // ⏱ TIME TRACKING ENGINE (PRO)
  // ================================
const [now, setNow] = React.useState(Date.now());
const frameRef = React.useRef(null);

const [showSessions, setShowSessions] = React.useState(false);
const [sessions, setSessions] = React.useState([]);
const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
const [hover, setHover] = React.useState(false);



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
  
const toggleSelect = (id) => {
  setSelectedTasks(prev =>
    prev.includes(id)
      ? prev.filter(x => x !== id)
      : [...prev, id]
  );
};

 const isSelected = selectedTasks.includes(t.id);

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


const metaRow = {
  fontSize: 12,
  color: "#888",
  marginTop: 4
};

const inputStyle = {
  flex: 1,
  padding: 6,
  borderRadius: 6,
  border: "1px solid #333",
  background: "#111",
  color: "white"
};

const saveBtn = {
  background: "#00c6ff",
  border: "none",
  padding: "4px 10px",
  borderRadius: 6,
  color: "white"
};

const cancelBtn = {
  background: "#444",
  border: "none",
  padding: "4px 10px",
  borderRadius: 6,
  color: "white"
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const modal = {
  background: "#222",
  padding: 20,
  borderRadius: 12
};
  
	
console.log("done:", t.done, typeof t.done);
console.log("isTracking:", t.isTracking, typeof t.isTracking);

return (
  
    <div 
		key={t.id} 
		ref={el => (taskRefs.current[t.id] = el)}
		onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px",
        borderRadius: 7,
		
		background: t.isTracking ? "lightyellow" : "white",
        
        border: isSelected
          ? "1px solid rgba(0,198,255,0.4)"
          : "1px solid #2a2a2a",
        boxShadow:
          jumpTo === t.id
            ? "0 0 0 2px #00c6ff"
            : "0 6px 18px rgba(0,0,0,0.25)",
        transition: "all 0.2s ease",
        transform: hover ? "translateY(-2px)" : "translateY(0)"
      }}
	>
	
	  {/* Priority Accent */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 7,
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
          background:
            t.priority === "high"
              ? "#ff5252"
              : t.priority === "medium"
              ? "#ffc107"
              : "#4caf50"
        }}
      />
	
      {/* LEFT CONTENT */}
      <div style={{ flex: 1, display: "flex", gap: 12 }}>
		{/* Checkbox */}
		<div
		  onClick={() => toggleSelect(t.id)}
		  style={{
            width: 20,
            height: 20,
            marginTop: 4,
            borderRadius: "50%",
            border: isSelected
              ? "2px solid #00c6ff"
              : "2px solid #555",
            background: isSelected
              ? "#00c6ff"
              : "transparent",
			
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
		>
		  {isSelected && (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "white"
              }}
            />
          )}
		</div>
       {/* MAIN INFO */}
	   <div style={{ flex: 1 }}>
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
				  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					  <b style={{ whiteSpace: "pre-line" }}>
						{i + 1}. {t.title}
					  </b>

					  {Boolean(t.isTracking) && (
						<span
						  style={{
							display: "flex",
							alignItems: "center",
							gap: 4,
							fontSize: 12,
							color: "#00f5a0",
							fontWeight: 600
						  }}
						>
						  <span
							style={{
							  width: 8,
							  height: 8,
							  borderRadius: "50%",
							  background: "#00f5a0",
							  boxShadow: "0 0 8px #00f5a0",
							  animation: "pulseDot 1.5s infinite"
							}}
						  />
						  Tracking
						</span>
					  )}
					</div>
				)}

				
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
	   </div>
	   
	   
	   
	   {showSessions &&
		  ReactDOM.createPortal(
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
			</div>,
			document.body   // 👈 BẮT BUỘC phải có cái này
		  )
		}
	   
	   
        
      {/* ================================
          BUTTON CONTROL PANEL
      ================================= */}
	  {/* RIGHT ACTIONS */}
      <div         
			style={{
			  display: "flex",
			  alignItems: "center",
			  gap: 8,
			  opacity: hover ? 1 : 0.4,
			  transition: "opacity 0.2s"
			}}
	    >
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

        <button title="Xóa công việc" onClick={() => setShowDeleteConfirm(true)}>
		  🗑
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
		
		{showDeleteConfirm && (
		  <div
			style={overlay}
			onClick={(e) => {
			  if (e.target === e.currentTarget) {
				setShowDeleteConfirm(false);
			  }
			}}
		  >
			<div style={modal}>
			  <h3 style={{color: "white",}}>Xác nhận xóa</h3>
			  <p style={{color: "white",}}>Bạn có chắc chắn muốn xóa công việc này?</p>

			  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
				<button
				  onClick={() => setShowDeleteConfirm(false)}
				  style={{
					padding: "6px 12px",
					borderRadius: 6,
					border: "1px solid #ccc",
					background: "#fff"
				  }}
				>
				  Hủy
				</button>

				<button
				  onClick={async () => {
					await api.deleteTask(t.id);
					setShowDeleteConfirm(false);
					load();
				  }}
				  style={{
					padding: "6px 12px",
					borderRadius: 6,
					border: "none",
					background: "#e53935",
					color: "white"
				  }}
				>
				  Xóa
				</button>
			  </div>
			</div>
		  </div>
		)}
		
		
		
		
		
		
      </div>
	  
	  
	  


	  
    </div>
	
	
	
  );
  

  
});

export default TaskItem;
