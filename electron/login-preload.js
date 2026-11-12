const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('laCarteAuth', {
  login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
});
