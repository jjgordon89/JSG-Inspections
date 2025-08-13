/**
 * Phase 8 - Task 17: Integration Tests (DB)
 * Tests for schema migrations, foreign key constraint enforcement, and equipment+documents linking
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Test database path
const TEST_DB_PATH = './test-integration.db';

// Clean up function
function cleanup() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
}

// Initialize test database with schema
function initializeTestDatabase(callback) {
  const db = new sqlite3.Database(TEST_DB_PATH, (err) => {
    if (err) {
      return callback(err);
    }
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        return callback(err);
      }
      
      // Create initial schema (pre-migration state)
      db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS equipment (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          equipment_id TEXT UNIQUE NOT NULL,
          type TEXT NOT NULL,
          location TEXT,
          manufacturer TEXT,
          model TEXT,
          serial_number TEXT,
          installation_date DATE,
          last_inspection DATE,
          next_inspection DATE,
          status TEXT DEFAULT 'active',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          equipment_id INTEGER,
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER,
          mime_type TEXT,
          uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS inspections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          equipment_id INTEGER NOT NULL,
          inspector_name TEXT NOT NULL,
          inspection_date DATE NOT NULL,
          checklist_data TEXT,
          overall_status TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS schema_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version INTEGER UNIQUE NOT NULL,
          description TEXT,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          callback(err, db);
        });
      });
    });
  });
}

// Migration functions
function applyMigration001(db, callback) {
  console.log('Applying migration 001: Add summary_comments and signature columns');
  
  // Check if columns already exist
  db.all("PRAGMA table_info(inspections)", (err, columns) => {
    if (err) {
      console.error('❌ Migration 001 failed:', err.message);
      return callback(false);
    }
    
    const columnNames = columns.map(col => col.name);
    const hasComments = columnNames.includes('summary_comments');
    const hasSignature = columnNames.includes('signature');
    
    let pendingOperations = 0;
    let completedOperations = 0;
    
    const checkComplete = (success = true) => {
      completedOperations++;
      if (completedOperations === pendingOperations) {
        if (success) {
          // Record migration
          db.run(`INSERT OR IGNORE INTO schema_migrations (version, description) VALUES (?, ?)`, 
            [1, 'Add summary_comments and signature columns to inspections'], (err) => {
              if (err) {
                console.error('❌ Migration 001 failed to record:', err.message);
                return callback(false);
              }
              console.log('✅ Migration 001 applied successfully');
              callback(true);
            });
        } else {
          callback(false);
        }
      }
    };
    
    if (!hasComments) {
      pendingOperations++;
      db.run('ALTER TABLE inspections ADD COLUMN summary_comments TEXT', (err) => {
        if (err) {
          console.error('Error adding summary_comments column:', err.message);
          return checkComplete(false);
        }
        console.log('Added summary_comments column to inspections table');
        checkComplete();
      });
    }
    
    if (!hasSignature) {
      pendingOperations++;
      db.run('ALTER TABLE inspections ADD COLUMN signature TEXT', (err) => {
        if (err) {
          console.error('Error adding signature column:', err.message);
          return checkComplete(false);
        }
        console.log('Added signature column to inspections table');
        checkComplete();
      });
    }
    
    if (pendingOperations === 0) {
      console.log('Migration 001: Columns already exist, skipping');
      // Still record the migration
      db.run(`INSERT OR IGNORE INTO schema_migrations (version, description) VALUES (?, ?)`, 
        [1, 'Add summary_comments and signature columns to inspections'], (err) => {
          if (err) {
            console.error('❌ Migration 001 failed to record:', err.message);
            return callback(false);
          }
          console.log('✅ Migration 001 applied successfully');
          callback(true);
        });
    }
  });
}

function applyMigration002(db, callback) {
  console.log('Applying migration 002: Add indexes for performance');
  
  db.serialize(() => {
    db.run('CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type)');
    db.run('CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_documents_equipment_id ON documents(equipment_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_inspections_equipment_id ON inspections(equipment_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date)', (err) => {
      if (err) {
        console.error('❌ Migration 002 failed:', err.message);
        return callback(false);
      }
      
      // Record migration
      db.run(`INSERT OR IGNORE INTO schema_migrations (version, description) VALUES (?, ?)`, 
        [2, 'Add performance indexes'], (err) => {
          if (err) {
            console.error('❌ Migration 002 failed to record:', err.message);
            return callback(false);
          }
          console.log('✅ Migration 002 applied successfully');
          callback(true);
        });
    });
  });
}

// Test functions
function testSchemaMigrations(callback) {
  console.log('\n🧪 Testing Schema Migrations...');
  
  let passed = 0;
  let total = 0;
  
  initializeTestDatabase((err, db) => {
    if (err) {
      console.error('❌ Schema migration tests failed:', err.message);
      return callback({ passed, total });
    }
    
    // Test 1: Initial schema should not have new columns
    total++;
    db.all("PRAGMA table_info(inspections)", (err, columns) => {
      if (err) {
        console.error('❌ Test 1 failed:', err.message);
        db.close();
        return callback({ passed, total });
      }
      
      const columnNames = columns.map(col => col.name);
      const hasInitialColumns = columnNames.includes('summary_comments') || columnNames.includes('signature');
      
      if (!hasInitialColumns) {
        console.log('✅ Test 1 passed: Initial schema does not have new columns');
        passed++;
      } else {
        console.log('❌ Test 1 failed: Initial schema unexpectedly has new columns');
      }
      
      // Test 2: Apply migration 001
      total++;
      applyMigration001(db, (success) => {
        if (success) {
          db.all("PRAGMA table_info(inspections)", (err, postColumns) => {
            if (err) {
              console.error('❌ Test 2 failed:', err.message);
              db.close();
              return callback({ passed, total });
            }
            
            const postColumnNames = postColumns.map(col => col.name);
            const hasNewColumns = postColumnNames.includes('summary_comments') && postColumnNames.includes('signature');
            
            if (hasNewColumns) {
              console.log('✅ Test 2 passed: Migration 001 added required columns');
              passed++;
            } else {
              console.log('❌ Test 2 failed: Migration 001 did not add required columns');
            }
            
            // Test 3: Migration should be idempotent
            total++;
            applyMigration001(db, (success2) => {
              if (success2) {
                console.log('✅ Test 3 passed: Migration 001 is idempotent');
                passed++;
              } else {
                console.log('❌ Test 3 failed: Migration 001 is not idempotent');
              }
              
              // Test 4: Apply migration 002 (indexes)
              total++;
              applyMigration002(db, (success3) => {
                if (success3) {
                  console.log('✅ Test 4 passed: Migration 002 applied successfully');
                  passed++;
                } else {
                  console.log('❌ Test 4 failed: Migration 002 application failed');
                }
                
                // Test 5: Check migration records
                total++;
                db.all('SELECT * FROM schema_migrations ORDER BY version', (err, migrations) => {
                  if (err) {
                    console.error('❌ Test 5 failed:', err.message);
                  } else if (migrations.length >= 2 && migrations[0].version === 1 && migrations[1].version === 2) {
                    console.log('✅ Test 5 passed: Migration records are correct');
                    passed++;
                  } else {
                    console.log('❌ Test 5 failed: Migration records are incorrect');
                  }
                  
                  db.close();
                  console.log(`\n📊 Schema Migration Tests: ${passed}/${total} passed`);
                  callback({ passed, total });
                });
              });
            });
          });
        } else {
          console.log('❌ Test 2 failed: Migration 001 application failed');
          db.close();
          callback({ passed, total });
        }
      });
    });
  });
}

function testForeignKeyConstraints(callback) {
  console.log('\n🧪 Testing Foreign Key Constraint Enforcement...');
  
  let passed = 0;
  let total = 0;
  
  initializeTestDatabase((err, db) => {
    if (err) {
      console.error('❌ Foreign key constraint tests failed:', err.message);
      return callback({ passed, total });
    }
    
    // Insert test equipment
    db.run(`INSERT INTO equipment (equipment_id, type, location) VALUES (?, ?, ?)`, 
      ['TEST-001', 'Crane', 'Warehouse A'], function(err) {
        if (err) {
          console.error('❌ Failed to insert test equipment:', err.message);
          db.close();
          return callback({ passed, total });
        }
        
        const equipmentId = this.lastID;
        
        // Test 1: Valid foreign key should work
        total++;
        db.run(`INSERT INTO documents (equipment_id, filename, original_name, file_path, file_size, mime_type) 
                VALUES (?, ?, ?, ?, ?, ?)`, 
          [equipmentId, 'manual.pdf', 'Equipment Manual.pdf', '/docs/manual.pdf', 1024, 'application/pdf'], 
          (err) => {
            if (err) {
              console.log('❌ Test 1 failed: Valid foreign key insertion failed:', err.message);
            } else {
              console.log('✅ Test 1 passed: Valid foreign key insertion works');
              passed++;
            }
            
            // Test 2: Invalid foreign key should fail
            total++;
            db.run(`INSERT INTO documents (equipment_id, filename, original_name, file_path, file_size, mime_type) 
                    VALUES (?, ?, ?, ?, ?, ?)`, 
              [99999, 'invalid.pdf', 'Invalid.pdf', '/docs/invalid.pdf', 1024, 'application/pdf'], 
              (err) => {
                if (err && err.message.includes('FOREIGN KEY constraint failed')) {
                  console.log('✅ Test 2 passed: Invalid foreign key insertion correctly failed');
                  passed++;
                } else if (err) {
                  console.log('❌ Test 2 failed: Wrong error type:', err.message);
                } else {
                  console.log('❌ Test 2 failed: Invalid foreign key insertion should have failed');
                }
                
                // Test 3: CASCADE delete should work
                total++;
                db.run(`INSERT INTO inspections (equipment_id, inspector_name, inspection_date, overall_status) 
                        VALUES (?, ?, ?, ?)`, 
                  [equipmentId, 'John Doe', '2025-08-13', 'passed'], (err) => {
                    if (err) {
                      console.log('❌ Test 3 failed: Failed to insert inspection:', err.message);
                      db.close();
                      return callback({ passed, total });
                    }
                    
                    // Count documents and inspections before delete
                    db.get('SELECT COUNT(*) as count FROM documents WHERE equipment_id = ?', [equipmentId], (err, docsBefore) => {
                      if (err) {
                        console.log('❌ Test 3 failed: Error counting documents:', err.message);
                        db.close();
                        return callback({ passed, total });
                      }
                      
                      db.get('SELECT COUNT(*) as count FROM inspections WHERE equipment_id = ?', [equipmentId], (err, inspectionsBefore) => {
                        if (err) {
                          console.log('❌ Test 3 failed: Error counting inspections:', err.message);
                          db.close();
                          return callback({ passed, total });
                        }
                        
                        // Delete equipment
                        db.run('DELETE FROM equipment WHERE id = ?', [equipmentId], (err) => {
                          if (err) {
                            console.log('❌ Test 3 failed: Error deleting equipment:', err.message);
                            db.close();
                            return callback({ passed, total });
                          }
                          
                          // Check that related records were deleted
                          db.get('SELECT COUNT(*) as count FROM documents WHERE equipment_id = ?', [equipmentId], (err, docsAfter) => {
                            if (err) {
                              console.log('❌ Test 3 failed: Error counting documents after delete:', err.message);
                              db.close();
                              return callback({ passed, total });
                            }
                            
                            db.get('SELECT COUNT(*) as count FROM inspections WHERE equipment_id = ?', [equipmentId], (err, inspectionsAfter) => {
                              if (err) {
                                console.log('❌ Test 3 failed: Error counting inspections after delete:', err.message);
                              } else if (docsBefore.count > 0 && docsAfter.count === 0 && inspectionsBefore.count > 0 && inspectionsAfter.count === 0) {
                                console.log('✅ Test 3 passed: CASCADE delete works correctly');
                                passed++;
                              } else {
                                console.log('❌ Test 3 failed: CASCADE delete did not work correctly');
                                console.log(`  Documents: ${docsBefore.count} -> ${docsAfter.count}`);
                                console.log(`  Inspections: ${inspectionsBefore.count} -> ${inspectionsAfter.count}`);
                              }
                              
                              db.close();
                              console.log(`\n📊 Foreign Key Constraint Tests: ${passed}/${total} passed`);
                              callback({ passed, total });
                            });
                          });
                        });
                      });
                    });
                  });
              });
          });
      });
  });
}

function testEquipmentDocumentLinking(callback) {
  console.log('\n🧪 Testing Equipment+Documents Linking Sequence...');
  
  let passed = 0;
  let total = 0;
  
  initializeTestDatabase((err, db) => {
    if (err) {
      console.error('❌ Equipment+document linking tests failed:', err.message);
      return callback({ passed, total });
    }
    
    // Test 1: Equipment creation and document linking
    total++;
    db.run(`INSERT INTO equipment (equipment_id, type, location, manufacturer, model) 
            VALUES (?, ?, ?, ?, ?)`, 
      ['LINK-001', 'Forklift', 'Dock B', 'Toyota', 'Model X'], function(err) {
        if (err) {
          console.log('❌ Test 1 failed: Equipment+document linking error:', err.message);
          db.close();
          return callback({ passed, total });
        }
        
        const equipmentId = this.lastID;
        
        if (equipmentId && equipmentId > 0) {
          console.log('✅ Test 1a passed: Equipment creation returns valid lastID');
          
          // Link multiple documents
          const docs = [
            ['manual_001.pdf', 'Operation Manual.pdf', '/docs/manual_001.pdf', 2048, 'application/pdf'],
            ['cert_001.pdf', 'Safety Certificate.pdf', '/docs/cert_001.pdf', 1024, 'application/pdf'],
            ['photo_001.jpg', 'Equipment Photo.jpg', '/photos/photo_001.jpg', 5120, 'image/jpeg']
          ];
          
          let docsLinked = 0;
          let docsProcessed = 0;
          
          docs.forEach(([filename, originalName, filePath, fileSize, mimeType]) => {
            db.run(`INSERT INTO documents (equipment_id, filename, original_name, file_path, file_size, mime_type) 
                    VALUES (?, ?, ?, ?, ?, ?)`, 
              [equipmentId, filename, originalName, filePath, fileSize, mimeType], function(err) {
                docsProcessed++;
                if (!err && this.changes === 1) {
                  docsLinked++;
                }
                
                if (docsProcessed === docs.length) {
                  if (docsLinked === docs.length) {
                    console.log('✅ Test 1b passed: All documents linked successfully');
                    passed++;
                  } else {
                    console.log(`❌ Test 1b failed: Only ${docsLinked}/${docs.length} documents linked`);
                  }
                  
                  // Test 2: Verify linked documents can be retrieved
                  total++;
                  db.all(`SELECT d.*, e.equipment_id, e.type 
                          FROM documents d 
                          JOIN equipment e ON d.equipment_id = e.id 
                          WHERE e.equipment_id = ?`, ['LINK-001'], (err, linkedDocs) => {
                    if (err) {
                      console.log('❌ Test 2 failed: Document retrieval error:', err.message);
                    } else if (linkedDocs.length === 3) {
                      console.log('✅ Test 2 passed: All linked documents can be retrieved via JOIN');
                      passed++;
                    } else {
                      console.log(`❌ Test 2 failed: Expected 3 linked documents, got ${linkedDocs.length}`);
                    }
                    
                    db.close();
                    console.log(`\n📊 Equipment+Document Linking Tests: ${passed}/${total} passed`);
                    callback({ passed, total });
                  });
                }
              });
          });
        } else {
          console.log('❌ Test 1a failed: Equipment creation did not return valid lastID');
          db.close();
          callback({ passed, total });
        }
      });
  });
}

// Main test runner
function runIntegrationTests() {
  console.log('🚀 Starting Phase 8 - Task 17: Integration Tests (DB)');
  console.log('=' .repeat(60));
  
  // Clean up any existing test database
  cleanup();
  
  testSchemaMigrations((migrationsResult) => {
    testForeignKeyConstraints((foreignKeysResult) => {
      testEquipmentDocumentLinking((linkingResult) => {
        // Clean up test database
        cleanup();
        
        // Summary
        const totalPassed = migrationsResult.passed + foreignKeysResult.passed + linkingResult.passed;
        const totalTests = migrationsResult.total + foreignKeysResult.total + linkingResult.total;
        
        console.log('\n' + '=' .repeat(60));
        console.log('📋 INTEGRATION TEST SUMMARY');
        console.log('=' .repeat(60));
        console.log(`Schema Migrations: ${migrationsResult.passed}/${migrationsResult.total} passed`);
        console.log(`Foreign Key Constraints: ${foreignKeysResult.passed}/${foreignKeysResult.total} passed`);
        console.log(`Equipment+Document Linking: ${linkingResult.passed}/${linkingResult.total} passed`);
        console.log('-' .repeat(60));
        console.log(`TOTAL: ${totalPassed}/${totalTests} tests passed (${Math.round(totalPassed/totalTests*100)}%)`);
        
        if (totalPassed === totalTests) {
          console.log('🎉 All integration tests passed!');
          return true;
        } else {
          console.log('❌ Some integration tests failed.');
          return false;
        }
      });
    });
  });
}

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests();
}

module.exports = {
  runIntegrationTests,
  testSchemaMigrations,
  testForeignKeyConstraints,
  testEquipmentDocumentLinking,
  cleanup
};
