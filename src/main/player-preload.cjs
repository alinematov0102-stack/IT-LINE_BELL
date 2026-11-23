const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("playerBridge", {
  onPlay: (cb) => ipcRenderer.on("player:play", (_e,data)=>cb(data)),
  onStop: (cb) => ipcRenderer.on("player:stop", ()=>cb())
});