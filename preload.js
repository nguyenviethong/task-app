const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getTasks: () => ipcRenderer.invoke('getTasks'),
  addTask: t => ipcRenderer.invoke('addTask', t),
  toggleTask: id => ipcRenderer.invoke('toggleTask', id),
  deleteTask: id => ipcRenderer.invoke('deleteTask', id),
  setReminder: (id, t) => ipcRenderer.invoke('setReminder', id, t),
  updateTask: (id, data) => ipcRenderer.invoke("updateTask", id, data),
  snooze: (id, until) => ipcRenderer.invoke("snooze", id, until),
  moveTask: (id, state) => ipcRenderer.invoke("moveTask", id, state),
  exportTasks: () => ipcRenderer.invoke("exportTasks"),
  importTasks: () => ipcRenderer.invoke("importTasks"),
  
  secure: (channel, ...args) =>
    ipcRenderer.invoke("secure", channel, ...args),

  activateOnline: key =>
    ipcRenderer.invoke("activate-online", key),

  activate: payload =>
    ipcRenderer.invoke("activate-license", payload),
	
  getLicenseStatus: () =>
    ipcRenderer.invoke("get-license-status"),

  restart: () => ipcRenderer.invoke("restart-app"),
  
  getTrackingSessionsByTask: (id) => ipcRenderer.invoke("getTrackingSessionsByTask", id),
  startTracking: (id) => ipcRenderer.invoke("startTracking", id),
  pauseTracking: (id) => ipcRenderer.invoke("pauseTracking", id),
  stopTracking: (id) => ipcRenderer.invoke("stopTracking", id),
  
  getDailyReport: (date) => ipcRenderer.invoke("getDailyReport", date),
  getWeeklyReport: () => ipcRenderer.invoke("getWeeklyReport"),
  getMonthlyReport: () => ipcRenderer.invoke("getMonthlyReport"),
  getLast7DaysChart: () => ipcRenderer.invoke("getLast7DaysChart"),
  getDashboardStats: () => ipcRenderer.invoke("getDashboardStats"),
  getWeeklyComparison: () => ipcRenderer.invoke("getWeeklyComparison"),
  exportCSV: () => ipcRenderer.invoke("exportCSV"),
	
});

contextBridge.exposeInMainWorld("authStore", {
  save: data => ipcRenderer.invoke("auth-save", data),
  load: () => ipcRenderer.invoke("auth-load"),
  clear: () => ipcRenderer.invoke("auth-clear"),
  ai: (payload, token, apiKey ) => ipcRenderer.invoke("ai", { payload, token, apiKey }),
  
});

contextBridge.exposeInMainWorld("chatStore", {
  save: msg => ipcRenderer.invoke("chat-save", msg),
  load: () => ipcRenderer.invoke("chat-load"),
  
  //new
  createRoom: (data) => ipcRenderer.invoke("room-create", data ),
  listRooms: user_key => ipcRenderer.invoke("room-list", user_key),

  saveMsg: msg => ipcRenderer.invoke("msg-save", msg),
  loadMsgs: id => ipcRenderer.invoke("msg-load", id),

  deleteMsg: id => ipcRenderer.invoke("msg-delete", id),
  editMsg: (id, text) => ipcRenderer.invoke("msg-edit", { id, text }),

  search: keyword => ipcRenderer.invoke("msg-search", keyword),
  
  roomDelete: (data) => ipcRenderer.invoke("room-delete", data),
  renameRoom: (id, title) => ipcRenderer.invoke("room-rename", { id, title }),
  
});


