const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  run: (sql, params) => ipcRenderer.invoke('db-run', sql, params),
  get: (sql, params) => ipcRenderer.invoke('db-get', sql, params),
  all: (sql, params) => ipcRenderer.invoke('db-all', sql, params),
  getTemplates: () => ipcRenderer.invoke('get-templates'),
  saveTemplate: (name, template) => ipcRenderer.invoke('save-template', name, template),
  deleteTemplate: (id) => ipcRenderer.invoke('delete-template', id),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  restoreDatabase: () => ipcRenderer.invoke('restore-database'),
});