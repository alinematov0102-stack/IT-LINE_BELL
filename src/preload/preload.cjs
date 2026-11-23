const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("smartBell", {
  status: () => ipcRenderer.invoke("app:status"),
  createBackup: () => ipcRenderer.invoke("backup:create"),
  onSystemResume: (callback) => { const listener=(_event,data)=>callback(data); ipcRenderer.on("system:resumed",listener); return ()=>ipcRenderer.removeListener("system:resumed",listener); },
  listSchedules: () => ipcRenderer.invoke("schedule:list"),
  saveSchedule: (item) => ipcRenderer.invoke("schedule:save", item),
  deleteSchedule: (id) => ipcRenderer.invoke("schedule:delete", id),
  toggleSchedule: (data) => ipcRenderer.invoke("schedule:toggle", data),
  importAudio: () => ipcRenderer.invoke("audio:import"),
  listAudio: () => ipcRenderer.invoke("audio:list"),
  renameAudio: (data) => ipcRenderer.invoke("audio:rename", data),
  deleteAudio: (id) => ipcRenderer.invoke("audio:delete", id),
  playAudio: (data) => ipcRenderer.invoke("audio:play", data),
  stopAudio: () => ipcRenderer.invoke("audio:stop"),
  listHistory: () => ipcRenderer.invoke("history:list"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSetting: (data) => ipcRenderer.invoke("settings:set", data),
  onBellEvent: (callback) => { const listener=(_event,data)=>callback(data); ipcRenderer.on("bell:event",listener); return ()=>ipcRenderer.removeListener("bell:event",listener); }
});