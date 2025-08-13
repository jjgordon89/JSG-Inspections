const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class MigrationManager {
  constructor(app) {
    this.app = app;
    this.dbPath = path.join(app.getPath('userData'), 'database.db');
    this.backupDir = path.join(app.getPath('userData'), 'backups');
    this.logPath = path.join(app.getPath('userData'), 'migration.log');
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    console.log(message);
    
    try {
      fs.appendFileSync(this.logPath, logEntry);
    } catch (err) {
      console.error('Failed to write to migration log:', err);
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `database-backup-${timestamp}.db`);
    
    try {
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, backupPath);
        this.log(`Database backup created: ${backupPath}`);
        return backupPath;
      } else {
        this.log('No existing database found, skipping backup');
        return null;
      }
    } catch (err) {
      this.log(`Failed to create backup: ${err.message}`);
      throw new Error(`Backup creation failed: ${err.message}`);
    }
  }

  async rollback(backupPath) {
    if (!backupPath || !fs.existsSync(backupPath)) {
      throw new Error('Backup file not found for rollback');
    }

    try {
      fs.copyFileSync(backupPath, this.dbPath);
      this.log(`Database rolled back from: ${backupPath}`);
    } catch (err) {
      this.log(`Rollback failed: ${err.message}`);
      throw new Error(`Rollback failed: ${err.message}`);
    }
  }

  async getCurrentSchemaVersion(db) {
    return new Promise((resolve, reject) => {
      db.get('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1', (err, row) => {
        if (err) {
          // If schema_version table doesn't exist, assume version 0
          if (err.message.includes('no such table')) {
            resolve(0);
          } else {
            reject(err);
          }
        } else {
          resolve(row ? row.version : 0);
        }
      });
    });
  }

  async updateSchemaVersion(db, version) {
    return new Promise((resolve, reject) => {
      db.run('INSERT OR REPLACE INTO schema_version (version) VALUES (?)', [version], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async runMigration(db, version, migrationFunction) {
    return new Promise((resolve, reject) => {
      this.log(`Starting migration ${version}`);
      
      migrationFunction(db, (err) => {
        if (err) {
          this.log(`Migration ${version} failed: ${err.message}`);
          reject(err);
        } else {
          this.log(`Migration ${version} completed successfully`);
          resolve();
        }
      });
    });
  }

  async runMigrations(db, migrations, targetVersion) {
    let backupPath = null;
    
    try {
      // Create schema_version table if it doesn't exist
      await new Promise((resolve, reject) => {
        db.run(`CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY
        )`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const currentVersion = await this.getCurrentSchemaVersion(db);
      this.log(`Current schema version: ${currentVersion}, Target version: ${targetVersion}`);

      if (currentVersion >= targetVersion) {
        this.log('Database is already up to date');
        return { success: true, backupPath: null };
      }

      // Create backup before running migrations
      backupPath = await this.createBackup();

      // Run migrations sequentially
      for (let version = currentVersion + 1; version <= targetVersion; version++) {
        if (migrations[version]) {
          try {
            await this.runMigration(db, version, migrations[version]);
            await this.updateSchemaVersion(db, version);
            this.log(`Schema version updated to ${version}`);
          } catch (err) {
            this.log(`Migration ${version} failed, initiating rollback`);
            
            if (backupPath) {
              // Close the database connection before rollback
              await new Promise((resolve) => {
                db.close((closeErr) => {
                  if (closeErr) {
                    this.log(`Warning: Error closing database: ${closeErr.message}`);
                  }
                  resolve();
                });
              });
              
              await this.rollback(backupPath);
              this.log('Rollback completed');
            }
            
            throw new Error(`Migration failed at version ${version}: ${err.message}`);
          }
        }
      }

      this.log('All migrations completed successfully');
      return { success: true, backupPath };

    } catch (err) {
      this.log(`Migration process failed: ${err.message}`);
      return { success: false, error: err.message, backupPath };
    }
  }

  async cleanupOldBackups(maxBackups = 10) {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('database-backup-') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          mtime: fs.statSync(path.join(this.backupDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (files.length > maxBackups) {
        const filesToDelete = files.slice(maxBackups);
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          this.log(`Deleted old backup: ${file.name}`);
        }
      }
    } catch (err) {
      this.log(`Failed to cleanup old backups: ${err.message}`);
    }
  }

  getBackupInfo() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('database-backup-') && file.endsWith('.db'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.mtime
          };
        })
        .sort((a, b) => b.created - a.created);

      return files;
    } catch (err) {
      this.log(`Failed to get backup info: ${err.message}`);
      return [];
    }
  }
}

module.exports = MigrationManager;
