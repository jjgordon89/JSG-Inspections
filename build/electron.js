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
      try {
        const today = new Date().toISOString().slice(0, 10);
        const upcomingInspections = await executeSecureOperation('scheduledInspections', 'getTodayAndLater', { today });

        if (upcomingInspections && upcomingInspections.length > 0) {
          const notification = new Notification({
            title: 'Upcoming Inspections',
            body: `You have ${upcomingInspections.length} inspection(s) scheduled.`,
          });
          
          // Add click handler to focus the application window
          notification.on('click', () => {
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
              const mainWindow = windows[0];
              if (mainWindow.isMinimized()) mainWindow.restore();
              mainWindow.focus();
            }
          });
          
          notification.show();
        }
      } catch (error) {
        console.error('Failed to check for upcoming inspections:', error);
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
  
  // Validate parameters (pass userDataPath for document operations)
  const userDataPath = category === 'documents' ? app.getPath('userData') : null;
  if (!operationDef.validate(params, userDataPath)) {
    throw new Error(`Invalid parameters for operation: ${category}.${operation}`);
  }
  
  // Build parameter array in correct order
  const paramArray = operationDef.params.map(paramName => params[paramName]);
  const sql = operationDef.sql;
  const returnType = operationDef.returnType;
  
  return new Promise((resolve, reject) => {
    // Dispatch based on returnType
    switch (returnType) {
      case 'write':
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
        break;
        
      case 'one':
        db.get(sql, paramArray, (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
        break;
        
      case 'many':
        db.all(sql, paramArray, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
        break;
        
      case 'scalar':
        db.get(sql, paramArray, (err, row) => {
          if (err) {
            reject(err);
          } else {
            // For scalar queries, return the first column value
            resolve(row ? Object.values(row)[0] : null);
          }
        });
        break;
        
      default:
        reject(new Error(`Invalid returnType: ${returnType} for operation: ${category}.${operation}`));
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

// Managed document import with hash validation
ipcMain.handle('import-document', async (event, equipmentId, sourceFilePath) => {
  try {
    if (!equipmentId || typeof equipmentId !== 'string') {
      throw new Error('Invalid equipment ID');
    }
    
    // Validate source file exists and is accessible
    try {
      await fs.access(sourceFilePath);
    } catch (err) {
      throw new Error('Source file does not exist or is not accessible');
    }
    
    // Create managed documents directory structure
    const documentsDir = path.join(app.getPath('userData'), 'documents', equipmentId);
    await fs.mkdir(documentsDir, { recursive: true });
    
    // Generate destination path with original filename
    const originalFileName = path.basename(sourceFilePath);
    const destinationPath = path.join(documentsDir, originalFileName);
    
    // Copy file to managed location
    await fs.copyFile(sourceFilePath, destinationPath);
    
    // Calculate SHA256 hash
    const crypto = require('crypto');
    const fileBuffer = await fs.readFile(destinationPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    return {
      storedPath: destinationPath,
      fileName: originalFileName,
      hash: hash,
      size: fileBuffer.length
    };
  } catch (error) {
    console.error('Document import failed:', error);
    throw error;
  }
});

// Legacy IPC handlers have been removed for security
// All database operations now use secure-db-operation

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
