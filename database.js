const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const MigrationManager = require('./src/database/migrationManager');

let db;

// Database schema version tracking
const CURRENT_SCHEMA_VERSION = 5;

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
  },

  2: (db, callback) => {
    console.log('Running migration 2: Phase 2 CMMS enhancements');
    db.serialize(() => {
      let pendingOperations = 0;
      let completedOperations = 0;
      let hasError = false;
      
      const checkComplete = (err) => {
        if (err && !hasError) {
          hasError = true;
          return callback(err);
        }
        completedOperations++;
        if (completedOperations === pendingOperations && !hasError) {
          callback(null);
        }
      };

      // 1. Add scheduled_inspection_id to inspections table
      pendingOperations++;
      db.all("PRAGMA table_info(inspections)", (err, columns) => {
        if (err) return checkComplete(err);
        
        const columnNames = columns.map(col => col.name);
        if (!columnNames.includes('scheduled_inspection_id')) {
          db.run('ALTER TABLE inspections ADD COLUMN scheduled_inspection_id INTEGER REFERENCES scheduled_inspections(id)', (err) => {
            if (err) {
              console.error('Error adding scheduled_inspection_id column:', err);
              return checkComplete(err);
            }
            console.log('Added scheduled_inspection_id column to inspections table');
            checkComplete();
          });
        } else {
          console.log('scheduled_inspection_id column already exists, skipping');
          checkComplete();
        }
      });

      // 2. Add inspection_date_date column for normalized date filtering
      pendingOperations++;
      db.all("PRAGMA table_info(inspections)", (err, columns) => {
        if (err) return checkComplete(err);
        
        const columnNames = columns.map(col => col.name);
        if (!columnNames.includes('inspection_date_date')) {
          db.run('ALTER TABLE inspections ADD COLUMN inspection_date_date TEXT', (err) => {
            if (err) {
              console.error('Error adding inspection_date_date column:', err);
              return checkComplete(err);
            }
            console.log('Added inspection_date_date column to inspections table');
            
            // Populate inspection_date_date from existing inspection_date values
            db.run(`UPDATE inspections SET inspection_date_date = date(inspection_date) WHERE inspection_date IS NOT NULL`, (err) => {
              if (err) {
                console.error('Error populating inspection_date_date:', err);
                return checkComplete(err);
              }
              console.log('Populated inspection_date_date column');
              checkComplete();
            });
          });
        } else {
          console.log('inspection_date_date column already exists, skipping');
          checkComplete();
        }
      });

      // 3. Create inspection_items table for itemized inspection results
      pendingOperations++;
      db.run(`CREATE TABLE IF NOT EXISTS inspection_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inspection_id INTEGER NOT NULL,
        standard_ref TEXT,
        item_text TEXT NOT NULL,
        critical BOOLEAN DEFAULT 0,
        result TEXT CHECK(result IN ('pass', 'fail', 'na')),
        notes TEXT,
        photos TEXT, -- JSON array of photo data
        component TEXT,
        priority TEXT CHECK(priority IN ('Critical', 'Major', 'Minor')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inspection_id) REFERENCES inspections (id) ON DELETE CASCADE ON UPDATE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Error creating inspection_items table:', err);
          return checkComplete(err);
        }
        console.log('Created inspection_items table');
        checkComplete();
      });

      // 4. Create deficiencies table for deficiency lifecycle management
      pendingOperations++;
      db.run(`CREATE TABLE IF NOT EXISTS deficiencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_id INTEGER NOT NULL,
        inspection_item_id INTEGER,
        severity TEXT CHECK(severity IN ('critical', 'major', 'minor')) NOT NULL,
        remove_from_service BOOLEAN DEFAULT 0,
        description TEXT NOT NULL,
        component TEXT,
        corrective_action TEXT,
        due_date TEXT,
        status TEXT CHECK(status IN ('open', 'in_progress', 'verified', 'closed')) DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        verification_signature TEXT,
        verification_timestamp DATETIME,
        FOREIGN KEY (equipment_id) REFERENCES equipment (id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (inspection_item_id) REFERENCES inspection_items (id) ON DELETE SET NULL ON UPDATE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Error creating deficiencies table:', err);
          return checkComplete(err);
        }
        console.log('Created deficiencies table');
        checkComplete();
      });

      // 5. Create signatures table for e-signatures
      pendingOperations++;
      db.run(`CREATE TABLE IF NOT EXISTS signatures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL, -- 'inspection', 'deficiency', 'work_order'
        entity_id INTEGER NOT NULL,
        signature_type TEXT NOT NULL, -- 'inspector', 'supervisor', 'verification'
        signatory_name TEXT NOT NULL,
        signature_data TEXT NOT NULL, -- base64 image data
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating signatures table:', err);
          return checkComplete(err);
        }
        console.log('Created signatures table');
        checkComplete();
      });

      // 6. Add indexes for new tables
      pendingOperations++;
      db.serialize(() => {
        db.run('CREATE INDEX IF NOT EXISTS idx_inspections_scheduled_id ON inspections (scheduled_inspection_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_inspections_date_date ON inspections (inspection_date_date)');
        db.run('CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection_id ON inspection_items (inspection_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_inspection_items_result ON inspection_items (result)');
        db.run('CREATE INDEX IF NOT EXISTS idx_inspection_items_critical ON inspection_items (critical)');
        db.run('CREATE INDEX IF NOT EXISTS idx_deficiencies_equipment_id ON deficiencies (equipment_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_deficiencies_status ON deficiencies (status)');
        db.run('CREATE INDEX IF NOT EXISTS idx_deficiencies_severity ON deficiencies (severity)');
        db.run('CREATE INDEX IF NOT EXISTS idx_signatures_entity ON signatures (entity_type, entity_id)');
        console.log('Created indexes for Phase 2 tables');
        checkComplete();
      });

      // 7. Add standard_ref and critical columns to compliance_standards
      pendingOperations++;
      db.all("PRAGMA table_info(compliance_standards)", (err, columns) => {
        if (err) return checkComplete(err);
        
        const columnNames = columns.map(col => col.name);
        let subOperations = 0;
        let subCompleted = 0;
        
        const checkSubComplete = (err) => {
          if (err && !hasError) {
            hasError = true;
            return callback(err);
          }
          subCompleted++;
          if (subCompleted === subOperations && !hasError) {
            checkComplete();
          }
        };
        
        if (!columnNames.includes('code')) {
          subOperations++;
          db.run('ALTER TABLE compliance_standards ADD COLUMN code TEXT', (err) => {
            if (err) {
              console.error('Error adding code column to compliance_standards:', err);
              return checkSubComplete(err);
            }
            console.log('Added code column to compliance_standards table');
            checkSubComplete();
          });
        }
        
        if (!columnNames.includes('clause')) {
          subOperations++;
          db.run('ALTER TABLE compliance_standards ADD COLUMN clause TEXT', (err) => {
            if (err) {
              console.error('Error adding clause column to compliance_standards:', err);
              return checkSubComplete(err);
            }
            console.log('Added clause column to compliance_standards table');
            checkSubComplete();
          });
        }
        
        if (subOperations === 0) {
          console.log('compliance_standards columns already exist, skipping');
          checkComplete();
        }
      });
    });
  },

  3: (db, callback) => {
    console.log('Running migration 3: Asset hierarchy and work orders');
    db.serialize(() => {
      let pendingOperations = 0;
      let completedOperations = 0;
      let hasError = false;
      
      const checkComplete = (err) => {
        if (err && !hasError) {
          hasError = true;
          return callback(err);
        }
        completedOperations++;
        if (completedOperations === pendingOperations && !hasError) {
          callback(null);
        }
      };

      // 1. Add asset hierarchy columns to equipment table
      pendingOperations++;
      db.all("PRAGMA table_info(equipment)", (err, columns) => {
        if (err) return checkComplete(err);
        
        const columnNames = columns.map(col => col.name);
        let subOperations = 0;
        let subCompleted = 0;
        
        const checkSubComplete = (err) => {
          if (err && !hasError) {
            hasError = true;
            return callback(err);
          }
          subCompleted++;
          if (subCompleted === subOperations && !hasError) {
            checkComplete();
          }
        };
        
        if (!columnNames.includes('parent_id')) {
          subOperations++;
          db.run('ALTER TABLE equipment ADD COLUMN parent_id INTEGER REFERENCES equipment(id)', (err) => {
            if (err) {
              console.error('Error adding parent_id column:', err);
              return checkSubComplete(err);
            }
            console.log('Added parent_id column to equipment table');
            checkSubComplete();
          });
        }
        
        if (!columnNames.includes('site')) {
          subOperations++;
          db.run('ALTER TABLE equipment ADD COLUMN site TEXT', (err) => {
            if (err) {
              console.error('Error adding site column:', err);
              return checkSubComplete(err);
            }
            console.log('Added site column to equipment table');
            checkSubComplete();
          });
        }
        
        if (!columnNames.includes('building')) {
          subOperations++;
          db.run('ALTER TABLE equipment ADD COLUMN building TEXT', (err) => {
            if (err) {
              console.error('Error adding building column:', err);
              return checkSubComplete(err);
            }
            console.log('Added building column to equipment table');
            checkSubComplete();
          });
        }
        
        if (!columnNames.includes('bay')) {
          subOperations++;
          db.run('ALTER TABLE equipment ADD COLUMN bay TEXT', (err) => {
            if (err) {
              console.error('Error adding bay column:', err);
              return checkSubComplete(err);
            }
            console.log('Added bay column to equipment table');
            checkSubComplete();
          });
        }
        
        if (subOperations === 0) {
          console.log('Equipment hierarchy columns already exist, skipping');
          checkComplete();
        }
      });

      // 2. Create work_orders table
      pendingOperations++;
      db.run(`CREATE TABLE IF NOT EXISTS work_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_id INTEGER NOT NULL,
        wo_number TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        work_type TEXT CHECK(work_type IN ('preventive', 'corrective', 'emergency', 'project')) NOT NULL,
        priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
        status TEXT CHECK(status IN ('draft', 'approved', 'assigned', 'in_progress', 'completed', 'closed', 'cancelled')) DEFAULT 'draft',
        assigned_to TEXT,
        estimated_hours REAL,
        actual_hours REAL,
        parts_cost REAL DEFAULT 0,
        labor_cost REAL DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        scheduled_date TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        closed_at DATETIME,
        deficiency_id INTEGER,
        pm_schedule_id INTEGER,
        completion_notes TEXT,
        verification_signature TEXT,
        FOREIGN KEY (equipment_id) REFERENCES equipment (id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (deficiency_id) REFERENCES deficiencies (id) ON DELETE SET NULL ON UPDATE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Error creating work_orders table:', err);
          return checkComplete(err);
        }
        console.log('Created work_orders table');
        checkComplete();
      });

      // 3. Create pm_templates table for preventive maintenance
      pendingOperations++;
      db.run(`CREATE TABLE IF NOT EXISTS pm_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        equipment_type TEXT NOT NULL,
        description TEXT,
        frequency_type TEXT CHECK(frequency_type IN ('calendar', 'usage', 'condition')) NOT NULL,
        frequency_value INTEGER NOT NULL, -- days for calendar, hours/cycles for usage
        frequency_unit TEXT, -- 'days', 'hours', 'cycles', etc.
        estimated_duration REAL, -- hours
        instructions TEXT,
        required_skills TEXT, -- JSON array
        required_parts TEXT, -- JSON array
        safety_notes TEXT,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating pm_templates table:', err);
          return checkComplete(err);
        }
        console.log('Created pm_templates table');
        checkComplete();
      });

      // 4. Create pm_schedules table
      pendingOperations++;
      db.run(`CREATE TABLE IF NOT EXISTS pm_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_id INTEGER NOT NULL,
        pm_template_id INTEGER NOT NULL,
        next_due_date TEXT,
        next_due_usage REAL,
        last_completed_date TEXT,
        last_completed_usage REAL,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (equipment_id) REFERENCES equipment (id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (pm_template_id) REFERENCES pm_templates (id) ON DELETE CASCADE ON UPDATE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Error creating pm_schedules table:', err);
          return checkComplete(err);
        }
        console.log('Created pm_schedules table');
        checkComplete();
      });

      // 5. Create meter_readings table for usage tracking
      pendingOperations++;
      db.run(`CREATE TABLE IF NOT EXISTS meter_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_id INTEGER NOT NULL,
        meter_type TEXT NOT NULL, -- 'hours', 'cycles', 'distance', etc.
        reading_value REAL NOT NULL,
        reading_date TEXT NOT NULL,
        recorded_by TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (equipment_id) REFERENCES equipment (id) ON DELETE CASCADE ON UPDATE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Error creating meter_readings table:', err);
          return checkComplete(err);
        }
        console.log('Created meter_readings table');
        checkComplete();
      });

      // 6. Add indexes for new tables
      pendingOperations++;
      db.serialize(() => {
        db.run('CREATE INDEX IF NOT EXISTS idx_equipment_parent_id ON equipment (parent_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_equipment_site ON equipment (site)');
        db.run('CREATE INDEX IF NOT EXISTS idx_work_orders_equipment_id ON work_orders (equipment_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders (status)');
        db.run('CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders (priority)');
        db.run('CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders (assigned_to)');
        db.run('CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_date ON work_orders (scheduled_date)');
        db.run('CREATE INDEX IF NOT EXISTS idx_pm_templates_equipment_type ON pm_templates (equipment_type)');
        db.run('CREATE INDEX IF NOT EXISTS idx_pm_schedules_equipment_id ON pm_schedules (equipment_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_pm_schedules_next_due_date ON pm_schedules (next_due_date)');
        db.run('CREATE INDEX IF NOT EXISTS idx_meter_readings_equipment_id ON meter_readings (equipment_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_meter_readings_date ON meter_readings (reading_date)');
        console.log('Created indexes for migration 3 tables');
        checkComplete();
      });
    });
  },

  4: (db, callback) => {
    console.log('Running migration 4: Crane-specific compliance features');
    db.serialize(() => {
      let pendingOperations = 0;
      let completedOperations = 0;
      let hasError = false;
      
      const checkComplete = (err) => {
        if (err && !hasError) {
          hasError = true;
          return callback(err);
        }
        completedOperations++;
        if (completedOperations === pendingOperations && !hasError) {
          callback(null);
        }
      };

      // 1. Create load_tests table for crane load testing
      pendingOperations++;
      db.run(`CREATE TABLE IF NOT EXISTS load_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_id INTEGER NOT NULL,
        test_date TEXT NOT NULL,
        test_type TEXT CHECK(test_type IN ('annual', 'periodic', 'initial', 'after_repair')) NOT NULL,
        test_load_percentage INTEGER NOT NULL, -- e.g., 100, 110, 125
        rated_capacity REAL NOT NULL,
        test_load REAL NOT NULL,
        test_duration INTEGER, -- minutes
        inspector TEXT NOT NULL,
        test_results TEXT CHECK(test_results IN ('pass', 'fail')) NOT NULL,
        deficiencies_found TEXT,
        corrective_actions TEXT,
        next_test_due TEXT,
        certificate_number TEXT,
        certificate_path TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (equipment_id) REFERENCES equipment (id) ON DELETE CASCADE ON UPDATE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Error creating load_tests table:', err);
          return checkComplete(err);
        }
        console.log('Created load_tests table');
        checkComplete();
      });

      // 2. Create calibrations table for instrument calibration
      pendingOperations++;
      db.run(`CREATE TABLE IF NOT EXISTS calibrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_id INTEGER NOT NULL,
        instrument_type TEXT NOT NULL, -- 'load_block', 'pressure_gauge', 'torque_wrench', etc.
        calibration_date TEXT NOT NULL,
        calibration_due_date TEXT NOT NULL,
        calibrated_by TEXT NOT NULL,
        calibration_agency TEXT,
        certificate_number TEXT,
        certificate_path TEXT,
        calibration_results TEXT CHECK(calibration_results IN ('pass', 'fail', 'limited')) NOT NULL,
        accuracy_tolerance TEXT,
        actual_accuracy TEXT,
        adjustments_made TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (equipment_id) REFERENCES equipment (id) ON DELETE CASCADE ON UPDATE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Error creating calibrations table:', err);
          return checkComplete(err);
        }
        console.log('Created calibrations table');
        checkComplete();
      });

      // 3. Create credentials table for operator/inspector qualifications
      pendingOperations++;
      db.run(`CREATE TABLE IF NOT EXISTS credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_name TEXT NOT NULL,
        credential_type TEXT NOT NULL, -- 'operator', 'inspector', 'rigger', etc.
        equipment_types TEXT, -- JSON array of equipment types qualified for
        certification_body TEXT,
        certificate_number TEXT,
        issue_date TEXT NOT NULL,
        expiration_date TEXT NOT NULL,
        renewal_required BOOLEAN DEFAULT 1,
        status TEXT CHECK(status IN ('active', 'expired', 'suspended', 'revoked')) DEFAULT 'active',
        certificate_path TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating credentials table:', err);
          return checkComplete(err);
        }
        console.log('Created credentials table');
        checkComplete();
      });

      // 4. Create template_items table for inspection template standardization
      pendingOperations++;
      db.run(`CREATE TABLE IF NOT EXISTS template_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        standard_id INTEGER,
        item_order INTEGER NOT NULL,
        standard_ref TEXT, -- e.g., "ASME B30.2-2016 2-1.3.1"
        item_text TEXT NOT NULL,
        critical BOOLEAN DEFAULT 0,
        component TEXT,
        inspection_method TEXT, -- 'visual', 'functional', 'measurement', etc.
        acceptance_criteria TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES inspection_templates (id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (standard_id) REFERENCES compliance_standards (id) ON DELETE SET NULL ON UPDATE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Error creating template_items table:', err);
          return checkComplete(err);
        }
        console.log('Created template_items table');
        checkComplete();
      });

      // 5. Add enhanced compliance columns to compliance_standards
      pendingOperations++;
      db.all("PRAGMA table_info(compliance_standards)", (err, columns) => {
        if (err) return checkComplete(err);
        
        const columnNames = columns.map(col => col.name);
        let subOperations = 0;
        let subCompleted = 0;
        
        const checkSubComplete = (err) => {
          if (err && !hasError) {
            hasError = true;
            return callback(err);
          }
          subCompleted++;
          if (subCompleted === subOperations && !hasError) {
            checkComplete();
          }
        };
        
        if (!columnNames.includes('inspection_frequency_days')) {
          subOperations++;
          db.run('ALTER TABLE compliance_standards ADD COLUMN inspection_frequency_days INTEGER', (err) => {
            if (err) {
              console.error('Error adding inspection_frequency_days column:', err);
              return checkSubComplete(err);
            }
            console.log('Added inspection_frequency_days column to compliance_standards table');
            checkSubComplete();
          });
        }
        
        if (!columnNames.includes('load_test_frequency_days')) {
          subOperations++;
          db.run('ALTER TABLE compliance_standards ADD COLUMN load_test_frequency_days INTEGER', (err) => {
            if (err) {
              console.error('Error adding load_test_frequency_days column:', err);
              return checkSubComplete(err);
            }
            console.log('Added load_test_frequency_days column to compliance_standards table');
            checkSubComplete();
          });
        }
        
        if (subOperations === 0) {
          console.log('Enhanced compliance columns already exist, skipping');
          checkComplete();
        }
      });

      // 6. Add indexes for new tables
      pendingOperations++;
      db.serialize(() => {
        db.run('CREATE INDEX IF NOT EXISTS idx_load_tests_equipment_id ON load_tests (equipment_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_load_tests_test_date ON load_tests (test_date)');
        db.run('CREATE INDEX IF NOT EXISTS idx_load_tests_next_due ON load_tests (next_test_due)');
        db.run('CREATE INDEX IF NOT EXISTS idx_calibrations_equipment_id ON calibrations (equipment_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_calibrations_due_date ON calibrations (calibration_due_date)');
        db.run('CREATE INDEX IF NOT EXISTS idx_credentials_person_name ON credentials (person_name)');
        db.run('CREATE INDEX IF NOT EXISTS idx_credentials_expiration ON credentials (expiration_date)');
        db.run('CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials (status)');
        db.run('CREATE INDEX IF NOT EXISTS idx_template_items_template_id ON template_items (template_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_template_items_order ON template_items (template_id, item_order)');
        console.log('Created indexes for migration 4 tables');
        checkComplete();
      });
    });
  },

  5: (db, callback) => {
    console.log('Running migration 5: Security, governance, and document integrity');
    db.serialize(() => {
      let pendingOperations = 0;
      let completedOperations = 0;
      let hasError = false;
      
      const checkComplete = (err) => {
        if (err && !hasError) {
          hasError = true;
          return callback(err);
        }
        completedOperations++;
        if (completedOperations === pendingOperations && !hasError) {
          callback(null);
        }
      };

      // 1. Create users table for RBAC
      pendingOperations++;
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        role TEXT CHECK(role IN ('admin', 'inspector', 'reviewer', 'viewer')) NOT NULL,
        active BOOLEAN DEFAULT 1,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          return checkComplete(err);
        }
        console.log('Created users table');
        checkComplete();
      });

      // 2. Create audit_log table for compliance tracking
      pendingOperations++;
      db.run(`CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT NOT NULL,
        action TEXT NOT NULL, -- 'create', 'update', 'delete', 'approve', 'sign'
        entity_type TEXT NOT NULL, -- 'equipment', 'inspection', 'deficiency', 'work_order', etc.
        entity_id INTEGER NOT NULL,
        old_values TEXT, -- JSON of previous values
        new_values TEXT, -- JSON of new values
        ip_address TEXT,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Error creating audit_log table:', err);
          return checkComplete(err);
        }
        console.log('Created audit_log table');
        checkComplete();
      });

      // 3. Create certificates table for compliance certificates
      pendingOperations++;
      db.run(`CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        certificate_number TEXT UNIQUE NOT NULL,
        certificate_type TEXT NOT NULL, -- 'inspection', 'load_test', 'calibration'
        equipment_id INTEGER NOT NULL,
        entity_id INTEGER NOT NULL, -- ID of inspection, load_test, or calibration
        issue_date TEXT NOT NULL,
        expiration_date TEXT,
        issued_by TEXT NOT NULL,
        qr_code_data TEXT, -- QR code for verification
        certificate_hash TEXT, -- SHA256 hash for integrity
        certificate_path TEXT,
        status TEXT CHECK(status IN ('active', 'expired', 'revoked')) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (equipment_id) REFERENCES equipment (id) ON DELETE CASCADE ON UPDATE CASCADE
      )`, (err) => {
        if (err) {
          console.error('Error creating certificates table:', err);
          return checkComplete(err);
        }
        console.log('Created certificates table');
        checkComplete();
      });

      // 4. Add document integrity columns to documents table
      pendingOperations++;
      db.all("PRAGMA table_info(documents)", (err, columns) => {
        if (err) return checkComplete(err);
        
        const columnNames = columns.map(col => col.name);
        let subOperations = 0;
        let subCompleted = 0;
        
        const checkSubComplete = (err) => {
          if (err && !hasError) {
            hasError = true;
            return callback(err);
          }
          subCompleted++;
          if (subCompleted === subOperations && !hasError) {
            checkComplete();
          }
        };
        
        if (!columnNames.includes('hash')) {
          subOperations++;
          db.run('ALTER TABLE documents ADD COLUMN hash TEXT', (err) => {
            if (err) {
              console.error('Error adding hash column to documents:', err);
              return checkSubComplete(err);
            }
            console.log('Added hash column to documents table');
            checkSubComplete();
          });
        }
        
        if (!columnNames.includes('size')) {
          subOperations++;
          db.run('ALTER TABLE documents ADD COLUMN size INTEGER', (err) => {
            if (err) {
              console.error('Error adding size column to documents:', err);
              return checkSubComplete(err);
            }
            console.log('Added size column to documents table');
            checkSubComplete();
          });
        }
        
        if (!columnNames.includes('uploaded_by')) {
          subOperations++;
          db.run('ALTER TABLE documents ADD COLUMN uploaded_by TEXT', (err) => {
            if (err) {
              console.error('Error adding uploaded_by column to documents:', err);
              return checkSubComplete(err);
            }
            console.log('Added uploaded_by column to documents table');
            checkSubComplete();
          });
        }
        
        if (!columnNames.includes('uploaded_at')) {
          subOperations++;
          db.run('ALTER TABLE documents ADD COLUMN uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP', (err) => {
            if (err) {
              console.error('Error adding uploaded_at column to documents:', err);
              return checkSubComplete(err);
            }
            console.log('Added uploaded_at column to documents table');
            checkSubComplete();
          });
        }
        
        if (subOperations === 0) {
          console.log('Document integrity columns already exist, skipping');
          checkComplete();
        }
      });

      // 5. Add enhanced status enum to equipment table
      pendingOperations++;
      db.all("PRAGMA table_info(equipment)", (err, columns) => {
        if (err) return checkComplete(err);
        
        const columnNames = columns.map(col => col.name);
        if (!columnNames.includes('tagged_out')) {
          db.run('ALTER TABLE equipment ADD COLUMN tagged_out BOOLEAN DEFAULT 0', (err) => {
            if (err) {
              console.error('Error adding tagged_out column to equipment:', err);
              return checkComplete(err);
            }
            console.log('Added tagged_out column to equipment table');
            checkComplete();
          });
        } else {
          console.log('tagged_out column already exists, skipping');
          checkComplete();
        }
      });

      // 6. Add indexes for new tables
      pendingOperations++;
      db.serialize(() => {
        db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)');
        db.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)');
        db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log (user_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log (timestamp)');
        db.run('CREATE INDEX IF NOT EXISTS idx_certificates_equipment_id ON certificates (equipment_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates (certificate_number)');
        db.run('CREATE INDEX IF NOT EXISTS idx_certificates_expiration ON certificates (expiration_date)');
        db.run('CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents (hash)');
        console.log('Created indexes for migration 5 tables');
        checkComplete();
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
