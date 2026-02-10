const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getTasks: () => ipcRenderer.invoke('getTasks'),
  addTask: t => ipcRenderer.invoke('addTask', t),
  toggleTask: id => ipcRenderer.invoke('toggleTask', id),
  deleteTask: id => ipcRenderer.invoke('deleteTask', id),
  setReminder: (id, t) => ipcRenderer.invoke('setReminder', id, t),
  updateTask: (id, title) => ipcRenderer.invoke("updateTask", id, title),
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

  restart: () => ipcRenderer.invoke("restart-app")
	
});

contextBridge.exposeInMainWorld('auth', {
  login: (data) => fetch("http://localhost:3001/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  register: (data) => fetch("http://localhost:3001/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then(r => r.json()),

});