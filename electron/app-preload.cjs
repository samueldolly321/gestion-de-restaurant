// Pont sécurisé fenêtre principale ↔ processus principal (application desktop uniquement).
// Utilisé par Paramètres → « Licence & activation ». Absent dans la version web.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('restopiloteDesktop', {
  licence: {
    info: () => ipcRenderer.invoke('desktop-licence:info'),
    activate: (key) => ipcRenderer.invoke('desktop-licence:activate', key),
  },
});
