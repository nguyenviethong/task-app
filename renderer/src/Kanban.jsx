import React from "react";
import { useEffect,useState, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable
} from "@hello-pangea/dnd";

const api = window.api;

export default function Kanban({ tasks, styles, isQuanHan, priorityColor, deadlineText, isLate, onMove, formatDateVN, formatVN }) {
  
  const today = new Date().toISOString().split("T")[0];
  const [kanbanDate, setKanbanDate] = useState(today);
  const filtered   = useMemo(() => {
	  const startDay = new Date(kanbanDate);
	  startDay.setHours(0, 0, 0, 0);

	  const endDay = new Date(kanbanDate);
	  endDay.setHours(23, 59, 59, 999);
	  
	  return tasks
		.filter(t => {
		  if (kanbanDate) {
			const start = startDay.getTime();
			const end = endDay.getTime();

			const s = t.startAt;
			const e = t.endAt;

			if (e) {
			  if (!(s <= end && e >= start)) return false;
			} else {
			  if (s >= end) return false;
			}
		  }

		  return true;
		})
		.sort((a, b) => b.createdAt - a.createdAt);
	}, [tasks, kanbanDate]);
  
  const late = filtered.filter(t => t.done !== 1 && isQuanHan(t));
  const done = filtered.filter(t => t.done === 1);
  const todo = filtered.filter(t => t.done === 0 && !isQuanHan(t));

  //const columns = [
  //  { name: "Đang làm (còn hạn)", items: todo },
  //  { name: "Hoàn thành", items: done },
  //  { name: "Quá hạn", items: late }
  //];
  
  const initial = {
	  todo: { name: "Đang làm (còn hạn)", items: todo },
	  done: { name: "Hoàn thành", items: done },
	  late: { name: "Quá hạn", items: late }
  };
  

  const [state, setState] = useState(initial);
  
  useEffect(() => {
	  setState({
		todo: { name: "Đang làm (còn hạn)", items: todo },
		done: { name: "Hoàn thành", items: done },
		late: { name: "Quá hạn", items: late }
	  });
  }, [filtered]);
  
 async function onDragEnd(result) {
    if (!result.destination) return;

    const source = result.source.droppableId;
    const dest = result.destination.droppableId;

    if (source === dest) return;

    const item = state[source].items[result.source.index];

    const newSource = [...state[source].items];
    newSource.splice(result.source.index, 1);

    const newDest = [...state[dest].items];
    newDest.splice(result.destination.index, 0, item);
	
	//update UI trước (optimistic)
    setState({
      ...state,
      [source]: { ...state[source], items: newSource },
      [dest]: { ...state[dest], items: newDest }
    });
	  // mapping column → done state
	const map = { todo: 0, done: 1, late: 2 };
	  
	const newState = map[dest];

	 // 🔥 update App ngay
	onMove(item.id, newState);

	// ưu DB
	await api.moveTask(item.id, newState);
	
  }
  
  function shiftDate(days) {
	  if (!kanbanDate) return;

	  const d = new Date(kanbanDate);
	  d.setDate(d.getDate() + days);

	  const str = d.toISOString().split("T")[0];
	  setKanbanDate(str);
  }

  return (
	<div style={{ marginBottom: 12 }}>
	  <div style={styles.dateRowKanban}>
				 <button
					style={styles.dateBtn}
					onClick={() => shiftDate(-1)}
				  >
					◀
				 </button>
				<div style={{ textAlign: "center" }}>
					

					<input
					  type="date"
					  value={kanbanDate}
					  onChange={e => setKanbanDate(e.target.value)}
					  style={styles.input}
					/>
					<div style={styles.datePreview}>
					  {formatVN(kanbanDate)}
					</div>
				 </div>
				 
				
				  <button
				style={styles.dateBtn}
				onClick={() => shiftDate(1)}
			  >
				▶
			  </button>

	</div>
	
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={styles.kanbanBoard}>
        {Object.entries(state).map(([id, col]) => (
          <Droppable droppableId={id} key={id}>
            {provided => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={styles.kanbanColumn}
              >
                <h3>{col.name}</h3>

                {col.items.map((t, i) => (
                  <Draggable
                    draggableId={String(t.id)}
                    index={i}
                    key={t.id}
                  >
                    {provided => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...styles.kanbanCard,
                          ...provided.draggableProps.style,
                          borderLeft: `6px solid ${priorityColor(t.priority)}`
                        }}
                      >
                        <b>{t.title}</b>
						<div style={styles.meta}>
						  ⏰ Thực hiện {formatDateVN(t.startAt)} → {formatDateVN(t.endAt)}
						</div>
                        
	
                        {isLate(t) ? (
						  <>
							{t.done && (
							  <div style={styles.meta}>
								⏰ Hoàn thành {formatDateVN(t.completedAt)}
							  </div>
							  
							)}
							<div style={{ color: "red" }}>🔴 Quá hạn</div>
						  </>
						) : t.endAt ? (
						  <div style={styles.meta}>
							{t.done ? "⏰ Hoàn thành " + formatDateVN(t.completedAt) : deadlineText(t)}
						  </div>
						) : null}
						
						
						
                      </div>
                    )}
                  </Draggable>
                ))}

                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
	
	</div>
  );
  
}


