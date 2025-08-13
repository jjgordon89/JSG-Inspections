const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

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
      equipment_id INTEGER,
      inspector TEXT,
      inspection_date TEXT,
      findings TEXT,
      corrective_actions TEXT,
      FOREIGN KEY (equipment_id) REFERENCES equipment (id)
    )`);

    // Create documents table
    db.run(`CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER,
      file_name TEXT,
      file_path TEXT,
      FOREIGN KEY (equipment_id) REFERENCES equipment (id)
    )`);

    // Create scheduled_inspections table
    db.run(`CREATE TABLE IF NOT EXISTS scheduled_inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER,
      scheduled_date TEXT,
      assigned_inspector TEXT,
      status TEXT, -- e.g., 'scheduled', 'in-progress', 'completed'
      FOREIGN KEY (equipment_id) REFERENCES equipment (id)
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
      equipment_type TEXT,
      standard_id INTEGER,
      PRIMARY KEY (equipment_type, standard_id),
      FOREIGN KEY (standard_id) REFERENCES compliance_standards (id)
    )`);

    // Create inspection_templates table
    db.run(`CREATE TABLE IF NOT EXISTS inspection_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      fields TEXT
    )`);

    // Add indexes for performance
    db.run('CREATE INDEX IF NOT EXISTS idx_equipment_id ON equipment (equipment_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_inspections_equipment_id ON inspections (equipment_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections (inspection_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_documents_equipment_id ON documents (equipment_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_scheduled_inspections_equipment_id ON scheduled_inspections (equipment_id)');
  });

  return db;
}

module.exports = { initializeDatabase };