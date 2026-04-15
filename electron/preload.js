const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getClients:    ()       => ipcRenderer.invoke('clients:getAll'),
  createClient:  (data)   => ipcRenderer.invoke('clients:create', data),
  updateClient:  (data)   => ipcRenderer.invoke('clients:update', data),
  deleteClient:  (id)     => ipcRenderer.invoke('clients:delete', id),
});
