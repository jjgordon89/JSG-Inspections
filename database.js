const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use app.getPath('userData') to store the database in a standard location
// This avoids issues with packaged app paths.
// For now, we'll keep it simple and place it in the root.
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
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
});

module.exports = db;