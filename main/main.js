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
      preload: path.join(__dirname, '../preload.js')
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
  return db.prepare('SELECT * FROM tasks').all();
});

ipcMain.handle('addTask', (_, task) =>
  db.prepare(`
    INSERT INTO tasks(type,title,startAt,endAt,createdAt,priority,done)
    VALUES (?,?,?,?,?,?,0)
  `).run(task.type, task.title, task.startAt, task.endAt,Date.now(),task.priority)
);

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
    UPDATE tasks SET done=?, completedAt=? WHERE id=?
  `).run(newState, completedAt,id);

  return newState;
  
});

ipcMain.handle('deleteTask', (_, id) => {
  db.prepare('DELETE FROM tasks WHERE id=?').run(id);
});

ipcMain.handle('setReminder', (_, id, time) => {
  db.prepare('UPDATE tasks SET remindAt=? WHERE id=?').run(time, id);
});

ipcMain.handle("updateTask", (_, id, title) => {
  db.prepare(`
    UPDATE tasks SET title=? WHERE id=?
  `).run(title, id);
});

ipcMain.handle("moveTask", (_, id, newState) => {
   
  const completedAt =
    newState === 1 ? Date.now() : null;
  
  db.prepare(`
    UPDATE tasks
    SET done = ?, completedAt = ?
    WHERE id = ?
  `).run(newState, completedAt, id);

  return true;
});

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
