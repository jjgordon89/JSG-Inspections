const { app, BrowserWindow, ipcMain, Notification, dialog, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { initializeDatabase } = require('../database');
const { secureOperations, validateFilePath } = require('../src/database/secureOperations');
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

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;

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

/**
 * Executes a secure database operation with validation
 * @param {string} category - Operation category (e.g., 'equipment', 'inspections')
 * @param {string} operation - Operation name (e.g., 'getAll', 'create')
 * @param {Object} params - Parameters for the operation
 * @returns {Promise} - Database operation result
 */
async function executeSecureOperation(category, operation, params = {}) {
  const operationDef = secureOperations[category]?.[operation];
  
  if (!operationDef) {
    throw new Error(`Invalid operation: ${category}.${operation}`);
  }
  
  // Validate parameters
  if (!operationDef.validate(params)) {
    throw new Error(`Invalid parameters for operation: ${category}.${operation}`);
  }
  
  // Build parameter array in correct order
  const paramArray = operationDef.params.map(paramName => params[paramName]);
  
  return new Promise((resolve, reject) => {
    // Determine operation type based on SQL
    const sql = operationDef.sql;
    const isWrite = sql.trim().toUpperCase().startsWith('INSERT') || 
                   sql.trim().toUpperCase().startsWith('UPDATE') || 
                   sql.trim().toUpperCase().startsWith('DELETE');
    
    if (isWrite) {
      db.run(sql, paramArray, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ 
            lastID: this.lastID, 
            changes: this.changes 
          });
        }
      });
    } else if (sql.includes('COUNT(*)') || operationDef.params.length === 0) {
      // Use db.all for queries that might return multiple rows or aggregates
      db.all(sql, paramArray, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    } else {
      // Use db.get for single row queries
      db.get(sql, paramArray, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    }
  });
}

// Secure IPC handlers for database operations
ipcMain.handle('secure-db-operation', async (event, category, operation, params) => {
  try {
    return await executeSecureOperation(category, operation, params);
  } catch (error) {
    console.error(`Secure DB operation failed: ${category}.${operation}`, error);
    throw error;
  }
});

// File operations with path validation
ipcMain.handle('open-file-path', async (event, filePath) => {
  try {
    if (!validateFilePath(filePath)) {
      throw new Error('Invalid file path');
    }
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      throw new Error('File does not exist or is not accessible');
    }
    
    // Use shell.openPath instead of file:// links for security
    const result = await shell.openPath(filePath);
    if (result) {
      throw new Error(`Failed to open file: ${result}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('File open operation failed:', error);
    throw error;
  }
});

// Legacy IPC handlers (deprecated - will be removed in future versions)
ipcMain.handle('db-run', async (event, sql, params) => {
  console.warn('DEPRECATED: db-run is deprecated. Use secure-db-operation instead.');
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
  console.warn('DEPRECATED: db-get is deprecated. Use secure-db-operation instead.');
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
  console.warn('DEPRECATED: db-all is deprecated. Use secure-db-operation instead.');
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
  const dbPath = path.join(app.getPath('userData'), 'database.db');
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
  const dbPath = path.join(app.getPath('userData'), 'database.db');
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Restore Database',
    filters: [{ name: 'Database Files', extensions: ['db'] }],
    properties: ['openFile'],
  });

  if (filePaths && filePaths.length > 0) {
    await fs.copyFile(filePaths[0], dbPath);
    app.relaunch();
    app.exit();
  }
});
