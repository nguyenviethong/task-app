import React from "react";

const TaskItem = React.memo(function TaskItem({
  t,
  i,
  editing,
  editTitle,
  setEditTitle,
  startEdit,
  setEditing,
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
            <input
              autoFocus
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={async e => {
                if (e.key === "Enter") {
                  await api.updateTask(t.id, editTitle);
                  setEditing(null);
                  load();
                }
                if (e.key === "Escape") {
                  setEditing(null);
                }
              }}
              style={styles.editInput}
            />

            <div style={styles.editActions}>
              <button
                style={styles.saveBtn}
				title="Lưu"
                onClick={async () => {
                  await api.updateTask(t.id, editTitle);
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
          <b>{i + 1}. {t.title}</b>
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

        <div style={styles.meta}>
          {typeLabel[t.type]} • Tạo {formatDateVN(t.createdAt)}
        </div>

        <div style={styles.meta}>
          ⏰ Thực hiện {formatDateVN(t.startAt)} → {formatDateVN(t.endAt)}
        </div>

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

      <div style={{ display: "flex", gap: 6 }}>
        <StatusBadge state={t.done} />

        <button onClick={() => startEdit(t)}>✏</button>

        <button
          onClick={async () => {
            await api.toggleTask(t.id);
            load();
          }}
        >
          ✅
        </button>

        <button
          onClick={() => {
            api.deleteTask(t.id);
            load();
          }}
        >
          ❌
        </button>
      </div>
    </div>
  );
});

export default TaskItem;
