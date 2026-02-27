import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import "./ai-sidebar.css";
import { isLoggedIn, loadAuth  } from "./auth";

export default function AISidebar({ onClose, onUseAI, usage, tasks }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const cancelRef = useRef(null);
  const scrollRef = useRef(null);
  const bottomRef = useRef();

function formatDateTime(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleString("vi-VN");
}

function prepareTasksForAI(tasks) {
  return tasks
    .filter(t => !t.done)
    .map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      type: t.type,
      start: formatDateTime(t.startAt),   // earliest start
      deadline: formatDateTime(t.endAt),  // deadline (có thể null)
      alert: t.alert
    }));
}

const handleSendTasks = async () => {
	if (!tasks || tasks.length === 0) return;
	const aiTasks = prepareTasksForAI(tasks);
	
const taskPrompt = `
VAI TRÒ:
Bạn là AI chuyên lập kế hoạch công việc trong một ngày.

MỤC TIÊU:
Sắp xếp TẤT CẢ công việc trong hôm nay theo thứ tự hợp lý.

KHUNG GIỜ LÀM VIỆC:
- Sáng: 07:30 – 11:30
- Nghỉ trưa: 11:30 – 12:30
- Chiều: 12:30 – 16:30
- Không xếp ngoài khung giờ
- Không xếp trong giờ nghỉ trưa

QUY TẮC ƯỚC LƯỢNG:
1. Không có Duration sẵn.
2. Phải tự ước lượng:
   - Task đơn giản → 30 phút
   - Task trung bình → 60 phút
   - Task phức tạp → 90–120 phút
3. Nếu > 90 phút → chia thành nhiều phiên.
4. Mỗi phiên tối đa 90 phút.

QUY TẮC LẬP LỊCH BẮT BUỘC:

1. Bắt đầu từ 07:30.
2. Sau khi xếp xong 1 task:
   - Thời gian bắt đầu tiếp theo = thời gian kết thúc trước đó + 15 phút nghỉ.
3. Nếu chạm 11:30:
   - Dừng buổi sáng
   - Tiếp tục từ 12:30.
4. Không được bỏ trống thời gian nếu còn công việc.
5. Phải sử dụng tối đa khung giờ làm việc.
6. Nếu buổi sáng không đủ chỗ → tiếp tục xếp sang buổi chiều.
7. Chỉ được dừng khi:
   - Hết công việc
   HOẶC
   - Đã đến 16:30.
8. Không được vượt quá 16:30.

QUY TẮC ƯU TIÊN:
1. Nếu Status = overdue → xếp TRƯỚC TẤT CẢ các công việc khác.
2. Trong nhóm overdue → sắp xếp theo Deadline gần nhất trước.
3. Sau khi hết overdue → sắp xếp theo Deadline gần nhất trước.
4. Nếu cùng Deadline → priority: high > medium > low.
5. Nếu có startAt → không xếp trước thời điểm đó.
6. Không có Deadline → xếp sau cùng.

NGUYÊN TẮC BẮT BUỘC:
- Không chào hỏi
- Không Markdown
- Không giải thích chung
- Không thêm mở đầu/kết luận
- Không thêm text ngoài format bên dưới

FORMAT BẮT BUỘC:

Mỗi công việc gồm 4 dòng:

HH:mm - HH:mm
Tên công việc
Thời lượng ước tính: XX phút
Lý do: ...

Giữa hai công việc phải có một dòng trống thực sự.

Thời lượng phải đúng bằng khoảng chênh lệch giữa giờ bắt đầu và giờ kết thúc.

DANH SÁCH CÔNG VIỆC:
${aiTasks.map(t => `
ID: ${t.id}
Tiêu đề: ${t.title}
Loại: ${t.type}
Ưu tiên: ${t.priority}
Có thể bắt đầu từ: ${t.start || "Bất kỳ lúc nào"}
Deadline: ${t.deadline || "Không có"}
Status: ${t.alert}
`).join("\n")}

BẮT ĐẦU LẬP LỊCH.
`;

const displayText = `
	Đang tối ưu công việc hôm nay:
	${aiTasks.map(t => `
	Tiêu đề: ${t.title}
	Loại: ${t.type}
	Ưu tiên: ${t.priority}
	Có thể bắt đầu từ: ${t.start || "Bất kỳ lúc nào"}
	Deadline: ${t.deadline || "Không có"}
	`).join("\n")}
	`;
  await sendPrompt(taskPrompt,displayText);
};
  
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);


  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);
  
    // -------------------------
  // Load rooms
  // -------------------------
  useEffect(() => {
    loadRooms();
  }, []);
  
  useEffect(() => {
	  if (!currentRoom) return;
	  window.chatStore.loadMsgs(currentRoom).then(setMessages);
	}, [currentRoom]);
	
	
useEffect(() => {
	const ok = onUseAI(); // App trả true nếu login OK
	if (ok){
	   setChatOpen(ok);
	}
}, []);
	
  // -------------------------
  // Create new room
  // -------------------------
  const user_key = localStorage.getItem("apiKey");
  const user = localStorage.getItem("us");
  const createRoom = async () => {
	if(!user_key){
		return;
	}
    const id = await window.chatStore.createRoom({
		title: "New chat",
		user_key: user_key
	  });
    loadRooms();
	switchRoom(id);
  };
  
    // 👉 gọi App để check login
  function handleUseAI() {
    const ok = onUseAI(); // App trả true nếu login OK
    if (ok){
		setChatOpen(ok);
	}
  }
  
 
  
function loadRooms() {
  if(!user_key){
	return;
  }
  window.chatStore.listRooms(user_key)
    .then(setRooms)
    .catch(console.error);
}
  
function switchRoom(id) {
  setCurrentRoom(id);

  window.chatStore.loadMsgs(id)
    .then(setMessages)
    .catch(console.error);
}

async function deleteRoom(id) {
  await window.chatStore.roomDelete({
    id,
    user_key
  });
  loadRooms();

  if (currentRoom === id) {
    setCurrentRoom(null);
    setMessages([]);
  }
}

const [editingRoom, setEditingRoom] = useState(null);
const [editTitle, setEditTitle] = useState("");

const saveRename = async (roomId) => {
  if (!editTitle.trim()) {
    setEditingRoom(null);
    return;
  }

  await window.chatStore.renameRoom(roomId, editTitle.trim());
  setEditingRoom(null);
  loadRooms();
};

async function ensureRoom(promptText) {
  if (currentRoom) return currentRoom;

  // tạo room mới
  const newRoom = {
    title: promptText.slice(0, 30),
    user_key: user_key
  };

  const roomId = await window.chatStore.createRoom(newRoom);

  setCurrentRoom(roomId);
  loadRooms();
  return roomId;
}

async function sendPrompt(promptText, displayText = null) {
  if (!promptText.trim()) return;
  
  // 👇 đảm bảo có room trước
  const promptTextMain = displayText || promptText;// dùng displayText nếu có
  const roomId = await ensureRoom(promptTextMain);
  
  const userMsg = {
    room_id: roomId,
    role: "user",
    text: promptTextMain, 
    time: Date.now()
  };

  userMsg.id = await window.chatStore.saveMsg(userMsg);
  setMessages(m => [...m, userMsg]);

  setLoading(true);

  try {
    const token = localStorage.getItem("token");
    const apiKey = localStorage.getItem("apiKey");

    const res = await window.authStore.ai(
      { prompt: promptText },
      token,
      apiKey
    );
	
	let responseText = res.response;
	
    const aiMsg = {
      room_id: roomId,
      role: "ai",
      text: responseText,
      time: Date.now()
    };

    aiMsg.id = await window.chatStore.saveMsg(aiMsg);
    setMessages(m => [...m, aiMsg]);
	
  } catch (e) {
    setMessages(m => [
      ...m,
      { room_id: roomId, role: "ai", text: "⚠ Lỗi AI" }
    ]);
  }

  setLoading(false);
}


async function send() {
  if (!input.trim()) return;

  const prompt = input;
  setInput("");
  await sendPrompt(prompt);
}

async function sendOld() {
  if (!input.trim()) return;

  const prompt = input;
  setInput("");
  
  //const userMsg = { role: "user", text: prompt };
  
  const userMsg = {
	  room_id: currentRoom,
	  role: "user",
	  text: prompt,
	  time: Date.now()
	};
  userMsg.id = await window.chatStore.saveMsg(userMsg);
  setMessages(m => [...m, userMsg]);
  //window.chatStore.save(userMsg);
  setLoading(true);

  try {
	const token = localStorage.getItem("token");
    const apiKey = localStorage.getItem("apiKey");
    const res = await window.authStore.ai(
      { prompt },
      token,
	  apiKey
    );
	const aiMsg = { room_id: currentRoom, role: "ai", text: "AI reply: " + res.response,time: Date.now() };
	aiMsg.id = await window.chatStore.saveMsg(aiMsg);
    setMessages(m => [...m, aiMsg]);
	//window.chatStore.save(aiMsg);

  } catch (e) {
    setMessages(m => [
      ...m,
      { room_id: currentRoom, role: "ai", text: "⚠ Lỗi AI" }
    ]);
  }

  setLoading(false);
}

  // -------------------------
  // Delete
  // -------------------------
  const del = async id => {
    await window.chatStore.deleteMsg(id);
    setMessages(m => m.filter(x => x.id !== id));
  };

  // -------------------------
  // Edit
  // -------------------------
  const edit = async msg => {
    const text = prompt("Edit message:", msg.text);
    if (!text) return;

    await window.chatStore.editMsg(msg.id, text);

    setMessages(m =>
      m.map(x => (x.id === msg.id ? { ...x, text } : x))
    );
  };
  
  // -------------------------
  // Search
  // -------------------------
  const doSearch = async () => {
    const res = await window.chatStore.search(search);
    alert(JSON.stringify(res, null, 2));
  };
  

  function cancel() {
    cancelRef.current?.();
    setLoading(false);
  }
//if (user == null) return null;
return createPortal(
  <div className="ai-overlay" onClick={onClose}>
    <div className="ai-panel" onClick={(e) => e.stopPropagation()}>

      {/* HEADER */}
      <div className="ai-top">
        <div className="ai-title">
          <span className="ai-icon">🤖</span>
          <span className="ai-text">AI Assistant</span>
        </div>
        <button className="ai-close" onClick={onClose}>✕</button>
      </div>

      <div className="ai-body">
		
        {/* ===== LEFT: ROOMS ===== */}
        <div className="ai-rooms">
		{chatOpen && (
		  <>
			  
			<button
			  className={`optimize-btn ${loading ? "loading" : ""}`}
			  onClick={handleSendTasks}
			  disabled={loading}
			>
			  {loading ? (
				<>
				  <span className="spinner"></span>
				  Đang tối ưu AI...
				</>
			  ) : (
				<>
				  <span className="icon">⚡</span>
				  Tối ưu công việc hôm nay
				</>
			  )}
			</button>
			
			<button
				className="room-new"
				onClick={createRoom}
			  >
				+ New chat
			</button>

			  <input
				className="room-search"
				placeholder="Search..."
				value={search}
				onChange={e => setSearch(e.target.value)}
			  />

			  <div className="room-list">
				{rooms
				  .filter(r =>
					  (r.title || "")
						.toLowerCase()
						.includes((search || "").toLowerCase())
					)
				  .map(r => (
					  <div
						key={r.id}
						className={`room ${r.id === currentRoom ? "active" : ""}`}
						onClick={() => {
						  if (editingRoom !== r.id) {
							switchRoom(r.id);
						  }
						}}
					  >
					 {editingRoom === r.id ? (
					  <input
						autoFocus
						value={editTitle}
						onChange={(e) => setEditTitle(e.target.value)}
						onBlur={() => saveRename(r.id)}
						onKeyDown={(e) => {
						  if (e.key === "Enter") saveRename(r.id);
						  if (e.key === "Escape") setEditingRoom(null);
						}}
						onClick={(e) => e.stopPropagation()}
					  />
					) : (
					  <span
						onDoubleClick={(e) => {
						  e.stopPropagation();
						  setEditingRoom(r.id);
						  setEditTitle(r.title);
						}}
					  >
						{r.title}
					  </span>
					)}
					  <button
						title="Xóa chat"
						className="room-delete"
						onClick={(e) => {
						  e.stopPropagation();
						  deleteRoom(r.id);
						}}
					  >
						🗑
					  </button>
					</div>
				  ))}
			  </div>
			</>
		)}

		  

        </div>
		
		

        {/* ===== RIGHT: CHAT ===== */}
        <div className="ai-chat-area">

          {!chatOpen ? (
            <button className="ai-btn" onClick={handleUseAI}>
              Sử dụng AI
            </button>
          ) : (
            <>
			   <div>
				  Xin chào {user}
			  </div>
              <div className="ai-chat" ref={scrollRef}>
                {messages.map((m) => (
                  <div key={m.id} className={`msg ${m.role}`}>
                    <div className="msg-text">{m.text}</div>
                    <div className="msg-time">
                      {new Date(m.time).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                {loading && <div className="typing">AI đang trả lời…</div>}
              </div>
			  
              <div className="ai-input">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && send()}
                  placeholder="Hỏi AI..."
                />

                {loading ? (
                  <button onClick={cancel}>Stop</button>
                ) : (
                  <button onClick={send}>Send</button>
                )}
              </div>
            </>
          )}

        </div>

      </div>

      {/* FOOTER */}
      <div className="ai-usage">
        <div className="usage-bar">
          <div className="usage-fill" style={{ width: `${usage}%` }} />
        </div>
        <div className="usage-text">{usage}% quota</div>
      </div>

    </div>
  </div>,
  document.getElementById("overlay-root")
);



}
