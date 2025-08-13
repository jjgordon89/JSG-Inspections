const { app, BrowserWindow, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const { initializeDatabase } = require('../database');
const fs = require('fs').promises;

let db;

// disable cache
app.commandLine.appendSwitch('disable-http-cache');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl).catch(err => console.log('Failed to load URL:', err));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  db = initializeDatabase(app);
  createWindow();

  // Check for scheduled inspections periodically
  setTimeout(() => {
    setInterval(async () => {
      const today = new Date().toISOString().slice(0, 10);
      const upcomingInspections = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM scheduled_inspections WHERE scheduled_date >= ?', [today], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      if (upcomingInspections.length > 0) {
        new Notification({
          title: 'Upcoming Inspections',
          body: `You have ${upcomingInspections.length} inspection(s) scheduled.`,
        }).show();
      }
    }, 3600000); // Check every hour
  }, 5000); // Defer by 5 seconds

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for database operations
ipcMain.handle('db-run', async (event, sql, params) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID });
      }
    });
  });
});

ipcMain.handle('db-get', async (event, sql, params) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
});

ipcMain.handle('db-all', async (event, sql, params) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('get-templates', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, name, fields FROM inspection_templates', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // Transform the array of rows into an object keyed by template name
        const templates = rows.reduce((acc, row) => {
          acc[row.name] = { id: row.id, ...JSON.parse(row.fields) };
          return acc;
        }, {});
        resolve(templates);
      }
    });
  });
});

ipcMain.handle('save-template', async (event, name, template) => {
  const fields = JSON.stringify(template);
  return new Promise((resolve, reject) => {
    // Use INSERT OR REPLACE to either create a new template or update an existing one based on the unique name
    const sql = `INSERT INTO inspection_templates (name, fields) VALUES (?, ?)
                 ON CONFLICT(name) DO UPDATE SET fields=excluded.fields`;
    db.run(sql, [name, fields], function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID });
      }
    });
  });
});

ipcMain.handle('delete-template', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM inspection_templates WHERE id = ?', [id], function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
});

ipcMain.handle('backup-database', async () => {
  const dbPath = path.join(app.getAppPath(), 'database.db');
  const { filePath } = await dialog.showSaveDialog({
    title: 'Backup Database',
    defaultPath: `database-backup-${new Date().toISOString().slice(0, 10)}.db`,
    filters: [{ name: 'Database Files', extensions: ['db'] }],
  });

  if (filePath) {
    await fs.copyFile(dbPath, filePath);
  }
});

ipcMain.handle('restore-database', async () => {
  const dbPath = path.join(app.getAppPath(), 'database.db');
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Restore Database',
    filters: [{ name: 'Database Files', extensions: ['db'] }],
    properties: ['openFile'],
  });

  if (filePaths && filePaths.length > 0) {
    await fs.copyFile(filePaths, dbPath);
    app.relaunch();
    app.exit();
  }
});