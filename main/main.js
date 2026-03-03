const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { db, exportTasks, importTasks } = require('./db');
const allowed = ["login", "register", "activate"];
//const fetch = require("node-fetch")
const { fingerprint } = require("./machine");
const { saveLicense, verifyLicense  } = require("./license");
const { checkTrial } = require("./trial");
const { autoUpdater } = require('electron-updater');
const os = require("os");
const fs = require("fs");
const file = path.join(app.getPath("userData"), "auth.json");
const chatdb  = require('./chatdb');
const { Parser } = require("json2csv");

require('./reminder');


app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
});

autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update available',
    message: 'Đang tải phiên bản mới...'
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update ready',
    message: 'Cập nhật xong. App sẽ restart.',
  }).then(() => {
    autoUpdater.quitAndInstall();
  });
});

let win;
let activationWin;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 750,
	icon: path.join(__dirname, "assets/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
    }
  });
  //Menu.setApplicationMenu(null);
  const isDev = !app.isPackaged;
  
  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    //win.loadFile("dist/index.html");
	win.loadFile(path.join(app.getAppPath(), "dist/index.html"));
  }
  win.on("closed", () => (win = null));
}

function createActivationWindow() {
  activationWin = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload.js"),
      contextIsolation: true
    }
  });

  activationWin.loadFile("activation.html");

  activationWin.on("closed", () => {
    activationWin = null;
  });
}

//app.whenReady().then(createWindow);
app.whenReady().then(() => {
  const lic = verifyLicense();
  const trial = checkTrial();

  ////if (!lic.valid && !trial.valid) {
  //tạm thời đóng lại
  if (!lic.valid && !trial.valid) {
	
    createActivationWindow();
  } else {
    createWindow();
  }

});

ipcMain.handle('getTasks', () => {
  return db.prepare(`SELECT * FROM tasks where syncStatus != 'deleted' `).all();
});

ipcMain.handle('addTask', (_, task) => {

  const now = Date.now();
  const uuid = crypto.randomUUID();
  const info = db.prepare(`
    INSERT INTO tasks(type,title,startAt,endAt,createdAt,updatedAt,syncStatus,priority,uuid,done)
    VALUES (?,?,?,?,?,?,'dirty',?,?,0)
  `).run(task.type, task.title, task.startAt, task.endAt,now,now,task.priority,uuid);
  
   //return db.prepare("SELECT * FROM tasks WHERE id = ?")
   //        .get(info.lastInsertRowid);
});

ipcMain.handle('toggleTask', (_, id) => {
  //db.prepare('UPDATE tasks SET done = NOT done WHERE id=?').run(id);
  
    const task = db.prepare(`
    SELECT * FROM tasks WHERE id=?
  `).get(id);

  if (!task) return;

  let newState = 0;
  let completedAt = null;
  const now = Date.now();

  if (task.done === 0) {
	// đang làm → hoàn thành
    completedAt = now;
    // nếu quá hạn → overdue
    if (task.endAt && task.endAt < now) {
      //newState = 2;
	  newState = 1;
    } else {
      newState = 1; // hoàn thành
    }
  } else if (task.done === 1) {
    newState = 0; // quay lại đang làm
	completedAt = null;
  } else if (task.done === 2) {
    newState = 1; // overdue → hoàn thành
	completedAt = now;
  }

  db.prepare(`
    UPDATE tasks SET done=?, completedAt=? 
	
    WHERE id=?
  `).run(newState, completedAt,id);

  return newState;
  
});

ipcMain.handle('deleteTask', (_, id) => {
  db.prepare('DELETE FROM tracking_sessions WHERE taskId=?').run(id);
  
  db.prepare('DELETE FROM tasks WHERE id=?').run(id);
  
    //const now = Date.now();

	  //db.prepare(`
		//UPDATE tasks
		//SET deletedAt = ?,
		//	syncStatus = 'deleted'
		//WHERE id = ?
	  //`).run(now, id);
  
});



ipcMain.handle('copyTasks', async (event, { taskIds, targetDate }) => {
  const target = new Date(targetDate);
  const now = Date.now();
  
  const getStmt = db.prepare(`
    SELECT * FROM tasks WHERE id = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO tasks(type,title,startAt,endAt,createdAt,updatedAt,syncStatus,priority,uuid,done)
    VALUES (?,?,?,?,?,?,'dirty',?,?,0)
  `);

  for (let id of taskIds) {

    const task = getStmt.get(id);
    if (!task) continue;

    // ===== Giữ nguyên giờ =====
    let newStart = null;
    let newEnd = null;

    if (task.startAt) {
      const originalStart = new Date(task.startAt);
      newStart = new Date(target);
      newStart.setHours(
        originalStart.getHours(),
        originalStart.getMinutes()
      );
    }

    if (task.endAt) {
      const originalEnd = new Date(task.endAt);
      newEnd = new Date(target);
      newEnd.setHours(
        originalEnd.getHours(),
        originalEnd.getMinutes()
      );
    }

    insertStmt.run(
      task.type,
      task.title,
      newStart ? newStart.getTime() : null,
      newEnd ? newEnd.getTime() : null,
      now,
      now,
      task.priority,
      crypto.randomUUID()
    );
  }

  return true;
});

ipcMain.handle('setReminder', (_, id, time) => {
  db.prepare('UPDATE tasks SET remindAt=? WHERE id=?').run(time, id);
});

ipcMain.handle("updateTask", (_, id, data) => {
  const { title, startAt, endAt } = data;
  db.prepare(`
    UPDATE tasks
    SET title = ?,
        startAt = ?,
        endAt = ?,
		updatedAt = ?,
        syncStatus = 'dirty'
    WHERE id = ?
  `).run(title, startAt || null, endAt || null, Date.now(), id);

  return true;
});

ipcMain.handle("moveTask", (_, id, newState) => {
   
  const completedAt =
    newState === 1 ? Date.now() : null;
  
  db.prepare(`
    UPDATE tasks
    SET done = ?, completedAt = ?, updatedAt = ?, syncStatus = 'dirty'
    WHERE id = ?
  `).run(newState, completedAt, Date.now(), id);

  return true;
});

let isSyncing = false;

async function syncToServer() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const dirtyTasks = db.prepare(`
      SELECT * FROM tasks
      WHERE syncStatus != 'synced'
    `).all();

    if (dirtyTasks.length === 0) {
      isSyncing = false;
      return;
    }

    const response = await fetch(url + "/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: dirtyTasks })
    });

    if (!response.ok) throw new Error("Server error");

    const result = await response.json();

    if (result.successIds?.length) {
      const stmt = db.prepare(`
        UPDATE tasks SET syncStatus = 'synced'
        WHERE id = ?
      `);

      const transaction = db.transaction((ids) => {
        ids.forEach(id => stmt.run(id));
      });

      transaction(result.successIds);
    }

    console.log("Sync success");

  } catch (err) {
    console.log("Sync failed:", err.message);
  }

  isSyncing = false;
}

//setInterval(syncToServer, 10000);

ipcMain.handle("snooze", (_, id, until) => {
  db.prepare(`
    UPDATE tasks
    SET snoozeUntil = ?
    WHERE id = ?
  `).run(until, id);
});

ipcMain.handle("exportTasks", async () => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: "tasks-backup.json"
  });

  if (!filePath) return;

  exportTasks(filePath);
});

ipcMain.handle("importTasks", async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }]
  });

  if (!filePaths[0]) return;

  importTasks(filePaths[0]);
  return true;
});




ipcMain.handle("get-license-status", () => {
  const lic = verifyLicense();
  const trial = checkTrial();
  
  if (lic?.valid && lic?.data) {
	const { plan, exp, user } = lic.data;
	  
	  let days = null;
	  if (plan === "trial" && exp) {
		const now = Date.now();
		const end = new Date(exp).getTime();

		days = Math.max(
		  0,
		  Math.ceil((end - now) / (1000 * 60 * 60 * 24))
		);
	  }
    return {
		type: plan === "pro" ? "license" : "trial",
		plan,
		exp,
		user,
		days:days
    };
  }

  return {
    type: "trial",
    days: trial.days
  };
});

ipcMain.handle("activate-online", async (_, key) => {
  try {
	let url = findURL();
    const res = await fetch(url + "/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        user:os.userInfo().username,
        machine: fingerprint()
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Activation failed");
    }

    const license = await res.json();

    saveLicense(license);
	//mở app chính
    return { ok: true};

  } catch (e) {
    console.error("Activation error:", e.message);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle("activate-license", async (_, licensePayload) => {
  saveLicense(licensePayload);
  const lic = verifyLicense();

  if (lic.valid) {
	
    if (activationWin) activationWin.close();
    createWindow();
    return true;
  }

  return false;
});


const handlers = {
  login: async (user, pass) => {
    return authLogin(user, pass);
  },

  register: async (user, pass) => {
    return authRegister(user, pass);
  },

  activate: async user => {
    return activateLicense(user);
  }
};

async function authLogin(user, pass) {
  const row = db.getUser(user);
  if (!row) return false;
  return bcrypt.compare(pass, row.hash);
}

async function authRegister(user, pass) {
  const hash = await bcrypt.hash(pass, 10);
  db.saveUser(user, hash);
  return true;
}

async function activateLicense(user) {
  let url = findURL();
  const res = await fetch(url + "/license", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user,
      machine: fingerprint()
    })
  });

  const license = await res.json();
  saveLicense(license);

  return true;
}

function findURL() {
  const isDev = !app.isPackaged;
  let url = "http://localhost:3000";
  //let url = "https://tasks.titansportpq.vn";
  if (!isDev) {
	  url = "https://tasks.titansportpq.vn";
  }
  if (!url.startsWith("http")) {
    throw new Error("URL không hợp lệ");
  }
  return url;
}



ipcMain.handle("secure", async (_, channel, ...args) => {
  if (!allowed.includes(channel))
    throw new Error("Blocked IPC");

  return handlers[channel](...args);
});

ipcMain.handle("restart-app", () => {
  app.relaunch();
  app.exit(0);
});

// ===== IPC
ipcMain.handle("auth-save", (_, data) => {
  fs.writeFileSync(file, JSON.stringify(data));
  return true;
});

ipcMain.handle("auth-load", () => {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file));
});

ipcMain.handle("auth-clear", () => {
  if (fs.existsSync(file)) fs.unlinkSync(file);
  return true;
});

//const AI_BASE = "http://localhost:3001";
const AI_BASE = "https://ai.titansportpq.vn";

ipcMain.handle("ai", async (_, { payload, token, apiKey }) => {
  const r = await fetch(`${AI_BASE}/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token,
      "x-api-key": apiKey
    },
    body: JSON.stringify(payload)
  });

  return await r.json();
});

ipcMain.handle("chat-save", (_, msg) => {
  chatdb.prepare(`
    INSERT INTO chats (role, text, time)
    VALUES (?, ?, ?)
  `).run(msg.role, msg.text, Date.now());
});

ipcMain.handle("chat-load", () => {
  return chatdb.prepare(`
    SELECT role, text FROM chats
    ORDER BY id ASC
  `).all();
});


//ai
ipcMain.handle("room-create", (_, { title, user_key }) => {
  if (!title || !user_key) {
    throw new Error("Missing title or user_key");
  }
  const info = chatdb.prepare(`
    INSERT INTO rooms (title, created, user_key)
    VALUES (?, ?, ?)
  `).run(title, Date.now(), user_key);

  return info.lastInsertRowid;
});

ipcMain.handle("room-list", (_, user_key) => {
  return chatdb.prepare(`
    SELECT * FROM rooms WHERE user_key=? ORDER BY id DESC
  `).all(user_key);
});

ipcMain.handle("room-delete", (_, { id, user_key }) => {
  if (!id || !user_key) {
    throw new Error("Missing id or user_key");
  }

  // đảm bảo room thuộc user
  const room = chatdb.prepare(`
    SELECT id FROM rooms
    WHERE id=? AND user_key=?
  `).get(id, user_key);

  if (!room) {
    throw new Error("Unauthorized delete");
  }

  const trx = chatdb.transaction(() => {
    chatdb.prepare(`DELETE FROM messages WHERE room_id=?`).run(id);
    chatdb.prepare(`DELETE FROM rooms WHERE id=?`).run(id);
  });

  trx();

  return true;
});

ipcMain.handle("room-rename", (_, { id, title }) => {
  if (!id || !title) {
    throw new Error("Missing id or title");
  }

  chatdb.prepare(`
    UPDATE rooms
    SET title = ?
    WHERE id = ?
  `).run(title, id);

  return true;
});

ipcMain.handle("msg-save", (_, msg) => {
  const info = chatdb.prepare(`
    INSERT INTO messages (room_id, role, text, time)
    VALUES (?, ?, ?, ?)
  `).run(msg.room_id, msg.role, msg.text, Date.now());

  return info.lastInsertRowid;
});

ipcMain.handle("msg-load", (_, roomId) => {
  if (roomId == null) {
    console.error("❌ msg-load: invalid roomId:", roomId);
    return [];
  }
  return chatdb.prepare(`
    SELECT * FROM messages
    WHERE room_id=?
    ORDER BY id ASC
  `).all(roomId);
});

ipcMain.handle("msg-delete", (_, id) => {
  chatdb.prepare(`DELETE FROM messages WHERE id=?`).run(id);
});

ipcMain.handle("msg-edit", (_, { id, text }) => {
  chatdb.prepare(`
    UPDATE messages SET text=? WHERE id=?
  `).run(text, id);
});

ipcMain.handle("msg-search", (_, keyword) => {
  return chatdb.prepare(`
    SELECT * FROM messages
    WHERE text LIKE ?
    ORDER BY time DESC
  `).all(`%${keyword}%`);
});

ipcMain.handle("getTrackingSessionsByTask", (_, taskId) => {
  return db.prepare(`
    SELECT id, startAt, endAt
    FROM tracking_sessions
    WHERE taskId = ?
    ORDER BY startAt DESC
  `).all(taskId);
});

//Logic Tracking
ipcMain.handle("startTracking", (_, taskId) => {
	
  const task = db.prepare(`SELECT * FROM tasks WHERE id=?`).get(taskId);
  if (!task) return;

  if (task.isTracking) return;
  
  const now = Date.now();

  db.prepare(`
    UPDATE tasks
    SET actualStart = ?,
        isTracking = 1
    WHERE id = ?
  `).run(now, taskId);
});

ipcMain.handle("pauseTracking", (_, taskId) => {
  const task = db.prepare(`SELECT * FROM tasks WHERE id=?`).get(taskId);

  if (!task || !task.actualStart) return;

  const now = Date.now();
  const duration = now - task.actualStart;

  const trx = db.transaction(() => {

    // lưu session
    db.prepare(`
      INSERT INTO tracking_sessions (taskId, startAt, endAt)
      VALUES (?, ?, ?)
    `).run(taskId, task.actualStart, now);

    // update task
    db.prepare(`
      UPDATE tasks
      SET totalTimeSpent = totalTimeSpent + ?,
          actualStart = NULL,
          isTracking = 0
      WHERE id = ?
    `).run(duration, taskId);

  });

  trx();
});

function getLatestTrackingSessionByTaskId(taskId) {
  return db.prepare(`
    SELECT id, startAt, endAt
    FROM tracking_sessions
    WHERE taskId = ?
    ORDER BY startAt DESC
    LIMIT 1
  `).get(taskId);
}

ipcMain.handle("stopTracking", (_, taskId) => {
  const task = db.prepare(`SELECT * FROM tasks WHERE id=?`).get(taskId);
  if (!task) return;
    const now = Date.now();

	  const trx = db.transaction(() => {
		
		let duration = 0;
		let actualStartSave = null;
		if (task.isTracking && task.actualStart) {
		  duration = now - task.actualStart;
		  actualStartSave = task.actualStart;		  
		}else{
			//tìm xem đã có tracking hay chưa
			const latestTracking = getLatestTrackingSessionByTaskId(taskId);
			actualStartSave = task.startAt;
			if(latestTracking){
				actualStartSave = latestTracking.endAt ?? latestTracking.startAt;
			}
			duration = now - actualStartSave;
		}
		db.prepare(`
			INSERT INTO tracking_sessions (taskId, startAt, endAt)
			VALUES (?, ?, ?)
		  `).run(taskId, actualStartSave, now);

		db.prepare(`
			UPDATE tasks
			SET totalTimeSpent = totalTimeSpent + ?,
			  actualStart=NULL,
			  isTracking=0,
			  done=1,
			  completedAt=?,
			  actualEnd = ?
			WHERE id = ?
		  `).run(duration, now, now, taskId);

	  });

	  trx();
  
  /*
  
	  let total = task.totalTimeSpent;

	  if (task.actualStart) {
		total += Date.now() - task.actualStart;
	  }

	  db.prepare(`
		UPDATE tasks
		SET totalTimeSpent = ?,
			actualStart = NULL,
			actualEnd = ?,
			isTracking = 0,
			done = 1,
			completedAt=?
		WHERE id = ?
	  `).run(total, Date.now(), Date.now(), id);
  
  */
  
});

ipcMain.handle("getDailyReport", (_, date) => {

  const start = new Date(date);
  start.setHours(0,0,0,0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return db.prepare(`
    SELECT SUM(endAt - startAt) as total
    FROM tracking_sessions
    WHERE startAt >= ? AND startAt < ?
  `).get(start.getTime(), end.getTime());

});

ipcMain.handle("getWeeklyReport", () => {

  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);

  const monday = new Date(now.setDate(diff));
  monday.setHours(0,0,0,0);

  const nextWeek = new Date(monday);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return db.prepare(`
    SELECT SUM(endAt - startAt) as total
    FROM tracking_sessions
    WHERE startAt >= ? AND startAt < ?
  `).get(monday.getTime(), nextWeek.getTime());

});

ipcMain.handle("getMonthlyReport", () => {

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return db.prepare(`
    SELECT SUM(endAt - startAt) as total
    FROM tracking_sessions
    WHERE startAt >= ? AND startAt < ?
  `).get(start.getTime(), end.getTime());

});

ipcMain.handle("getLast7DaysChart", () => {

  const results = [];

  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(0,0,0,0);

    const next = new Date(day);
    next.setDate(next.getDate() + 1);

    const row = db.prepare(`
      SELECT SUM(endAt - startAt) as total
      FROM tracking_sessions
      WHERE startAt >= ? AND startAt < ?
    `).get(day.getTime(), next.getTime());

    results.push({
      date: day.toISOString().slice(0,10),
      total: row.total || 0
    });
  }

  return results;
});

ipcMain.handle("getDashboardStats", () => {

  const now = new Date();

  // ===== TODAY =====
  const startToday = new Date();
  startToday.setHours(0,0,0,0);

  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);

  const today = db.prepare(`
    SELECT SUM(endAt - startAt) as total
    FROM tracking_sessions
    WHERE startAt >= ? AND startAt < ?
  `).get(startToday.getTime(), endToday.getTime());

  // ===== WEEK =====
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);

  const monday = new Date(now.setDate(diff));
  monday.setHours(0,0,0,0);

  const nextWeek = new Date(monday);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const week = db.prepare(`
    SELECT SUM(endAt - startAt) as total
    FROM tracking_sessions
    WHERE startAt >= ? AND startAt < ?
  `).get(monday.getTime(), nextWeek.getTime());

  // ===== MONTH =====
  const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

  const month = db.prepare(`
    SELECT SUM(endAt - startAt) as total
    FROM tracking_sessions
    WHERE startAt >= ? AND startAt < ?
  `).get(startMonth.getTime(), nextMonth.getTime());

  // ===== TOP TASK =====
  const topTask = db.prepare(`
    SELECT t.title, SUM(s.endAt - s.startAt) as total
    FROM tracking_sessions s
    JOIN tasks t ON s.taskId = t.id
    GROUP BY s.taskId
    ORDER BY total DESC
    LIMIT 1
  `).get();

  // ===== COMPLETED COUNT =====
  const completed = db.prepare(`
    SELECT COUNT(*) as count
    FROM tasks
    WHERE done=1
  `).get();

  return {
    today: today.total || 0,
    week: week.total || 0,
    month: month.total || 0,
    topTask: topTask || null,
    completed: completed.count || 0
  };
});

ipcMain.handle("getWeeklyComparison", () => {
  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0,0,0,0);

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfWeek.getDate() - 7);

  const endOfLastWeek = new Date(startOfWeek);

  const thisWeek = db.prepare(`
    SELECT SUM(totalTimeSpent) as total
    FROM tasks
    WHERE actualEnd >= ?
  `).get(startOfWeek.getTime());

  const lastWeek = db.prepare(`
    SELECT SUM(totalTimeSpent) as total
    FROM tasks
    WHERE actualEnd >= ? AND actualEnd < ?
  `).get(startOfLastWeek.getTime(), endOfLastWeek.getTime());

  return {
    thisWeek: thisWeek.total || 0,
    lastWeek: lastWeek.total || 0
  };
});


ipcMain.handle("exportCSV", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  // mở hộp thoại chọn nơi lưu
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Xuất báo cáo CSV",
    defaultPath: "task-report.csv",
    filters: [
      { name: "CSV Files", extensions: ["csv"] }
    ]
  });

  if (canceled || !filePath) return null;

  const tasks = db.prepare(`
    SELECT title, totalTimeSpent, done, startAt, endAt
    FROM tasks
  `).all();

  let csv = "Title,Hours,Done,Start Date,End Date\n";

  tasks.forEach(t => {
    const hours = (t.totalTimeSpent || 0) / 3600000;

    const startDate = t.startAt
      ? new Date(t.startAt).toLocaleString("vi-VN")
      : "";

    const endDate = t.endAt
      ? new Date(t.endAt).toLocaleString("vi-VN")
      : "";

    csv += `"${t.title}",${hours.toFixed(2)},${t.done ? "Yes" : "No"},"${startDate}","${endDate}"\n`;
  });

  // 🔥 thêm BOM để Excel nhận UTF-8
  const BOM = "\uFEFF";

  fs.writeFileSync(filePath, BOM + csv, {
    encoding: "utf8"
  });

  return filePath;
});
