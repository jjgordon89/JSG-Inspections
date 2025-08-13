const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const MigrationManager = require('./src/database/migrationManager');

let db;

// Database schema version tracking
const CURRENT_SCHEMA_VERSION = 1;

// Migration functions
const migrations = {
  1: (db, callback) => {
    console.log('Running migration 1: Adding summary_comments and signature columns to inspections table');
    db.serialize(() => {
      // Check if columns already exist before adding them
      db.all("PRAGMA table_info(inspections)", (err, columns) => {
        if (err) {
          console.error('Error checking table info:', err);
          return callback(err);
        }
        
        const columnNames = columns.map(col => col.name);
        const hasComments = columnNames.includes('summary_comments');
        const hasSignature = columnNames.includes('signature');
        
        let pendingOperations = 0;
        let completedOperations = 0;
        
        const checkComplete = () => {
          completedOperations++;
          if (completedOperations === pendingOperations) {
            callback(null);
          }
        };
        
        if (!hasComments) {
          pendingOperations++;
          db.run('ALTER TABLE inspections ADD COLUMN summary_comments TEXT', (err) => {
            if (err) {
              console.error('Error adding summary_comments column:', err);
              return callback(err);
            }
            console.log('Added summary_comments column to inspections table');
            checkComplete();
          });
        }
        
        if (!hasSignature) {
          pendingOperations++;
          db.run('ALTER TABLE inspections ADD COLUMN signature TEXT', (err) => {
            if (err) {
              console.error('Error adding signature column:', err);
              return callback(err);
            }
            console.log('Added signature column to inspections table');
            checkComplete();
          });
        }
        
        if (pendingOperations === 0) {
          console.log('Migration 1: Columns already exist, skipping');
          callback(null);
        }
      });
    });
  }
};

function initializeDatabase(app) {
  const dbPath = path.join(app.getPath('userData'), 'database.db');
  console.log('Database path:', dbPath);

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Database connection error:', err.message);
    } else {
      console.log('Connected to the SQLite database.');
    }
  });

  // Enable foreign key constraints
  db.run('PRAGMA foreign_keys = ON', (err) => {
    if (err) {
      console.error('Error enabling foreign key constraints:', err.message);
    } else {
      console.log('Foreign key constraints enabled.');
    }
  });

  db.serialize(() => {
    // Create equipment table
    db.run(`CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id TEXT UNIQUE,
      type TEXT,
      manufacturer TEXT,
      model TEXT,
      serial_number TEXT,
      capacity REAL,
      installation_date TEXT,
      location TEXT,
      status TEXT,
      qr_code_data TEXT
    )`);

    // Create inspections table
    db.run(`CREATE TABLE IF NOT EXISTS inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      inspector TEXT,
      inspection_date TEXT,
      findings TEXT,
      corrective_actions TEXT,
      FOREIGN KEY (equipment_id) REFERENCES equipment (id) ON DELETE CASCADE ON UPDATE CASCADE
    )`);

    // Create documents table
    db.run(`CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      file_name TEXT,
      file_path TEXT,
      FOREIGN KEY (equipment_id) REFERENCES equipment (id) ON DELETE CASCADE ON UPDATE CASCADE
    )`);

    // Create scheduled_inspections table
    db.run(`CREATE TABLE IF NOT EXISTS scheduled_inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      scheduled_date TEXT,
      assigned_inspector TEXT,
      status TEXT, -- e.g., 'scheduled', 'in-progress', 'completed'
      FOREIGN KEY (equipment_id) REFERENCES equipment (id) ON DELETE CASCADE ON UPDATE CASCADE
    )`);

    // Create compliance_standards table
    db.run(`CREATE TABLE IF NOT EXISTS compliance_standards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      authority TEXT -- e.g., OSHA, ANSI
    )`);

    // Create equipment_type_compliance table
    db.run(`CREATE TABLE IF NOT EXISTS equipment_type_compliance (
      equipment_type TEXT NOT NULL,
      standard_id INTEGER NOT NULL,
      PRIMARY KEY (equipment_type, standard_id),
      FOREIGN KEY (standard_id) REFERENCES compliance_standards (id) ON DELETE CASCADE ON UPDATE CASCADE
    )`);

    // Create inspection_templates table
    db.run(`CREATE TABLE IF NOT EXISTS inspection_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      fields TEXT
    )`);

    // Add indexes for performance
    db.run('CREATE INDEX IF NOT EXISTS idx_equipment_id ON equipment (equipment_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment (type)');
    db.run('CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment (status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_inspections_equipment_id ON inspections (equipment_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections (inspection_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_inspections_inspector ON inspections (inspector)');
    db.run('CREATE INDEX IF NOT EXISTS idx_documents_equipment_id ON documents (equipment_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_scheduled_inspections_equipment_id ON scheduled_inspections (equipment_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_scheduled_inspections_date ON scheduled_inspections (scheduled_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_scheduled_inspections_status ON scheduled_inspections (status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_scheduled_inspections_inspector ON scheduled_inspections (assigned_inspector)');
    db.run('CREATE INDEX IF NOT EXISTS idx_compliance_standards_authority ON compliance_standards (authority)');
    db.run('CREATE INDEX IF NOT EXISTS idx_equipment_type_compliance_type ON equipment_type_compliance (equipment_type)');
    db.run('CREATE INDEX IF NOT EXISTS idx_equipment_type_compliance_standard ON equipment_type_compliance (standard_id)');

    // Run database migrations after table creation using MigrationManager
    const migrationManager = new MigrationManager(app);
    
    migrationManager.runMigrations(db, migrations, CURRENT_SCHEMA_VERSION)
      .then((result) => {
        if (result.success) {
          console.log('Database migrations completed successfully');
          if (result.backupPath) {
            console.log(`Backup created at: ${result.backupPath}`);
          }
          
          // Cleanup old backups (keep last 10)
          migrationManager.cleanupOldBackups(10);
        } else {
          console.error('Database migration failed:', result.error);
        }
      })
      .catch((err) => {
        console.error('Database migration process failed:', err);
      });
  });

  return db;
}

module.exports = { initializeDatabase };
