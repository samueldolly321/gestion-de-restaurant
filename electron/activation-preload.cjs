// Pont sécurisé entre la fenêtre d'activation et le processus principal.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('licence', {
  info: () => ipcRenderer.invoke('licence:info'),
  activate: (key) => ipcRenderer.invoke('licence:activate', key),
  copy: (text) => ipcRenderer.invoke('licence:copy', text),
  continueTrial: () => ipcRenderer.invoke('licence:continue'),
  quit: () => ipcRenderer.invoke('licence:quit'),
});
