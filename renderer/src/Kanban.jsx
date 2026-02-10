import React from "react";
import { useEffect,useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable
} from "@hello-pangea/dnd";

const api = window.api;

export default function Kanban({ tasks, styles, isQuanHan, priorityColor, deadlineText, isLate, onMove, formatDateVN }) {
	
  const late = tasks.filter(t => t.done !== 1 && isQuanHan(t));
  const done = tasks.filter(t => t.done === 1);
  const todo = tasks.filter(t => t.done === 0 && !isQuanHan(t));

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
  }, [tasks]);
  
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

  return (
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
                          <div style={{ color: "red" }}>
                            🔴 Quá hạn
                          </div>
                        )  : t.endAt && (
                          <div style={styles.meta}>
                            ⏰ {deadlineText(t)}
                          </div>
                        )
						}
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
  );
  
}


