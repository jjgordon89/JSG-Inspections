const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  run: (sql, params) => ipcRenderer.invoke('db-run', sql, params),
  get: (sql, params) => ipcRenderer.invoke('db-get', sql, params),
  all: (sql, params) => ipcRenderer.invoke('db-all', sql, params),
});