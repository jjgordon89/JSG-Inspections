const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Mock app object for testing
const mockApp = {
  getPath: (type) => {
    if (type === 'userData') {
      return './test-data';
    }
    return './';
  }
};

// Import our database initialization
const { initializeDatabase } = require('./database.js');

console.log('Testing Phase 2 Database Changes...\n');

// Test 1: Initialize database and check foreign key constraints
console.log('1. Testing database initialization with foreign key constraints...');
const db = initializeDatabase(mockApp);

// Wait a moment for initialization to complete
setTimeout(() => {
  // Test 2: Check if foreign keys are enabled
  console.log('\n2. Checking if foreign key constraints are enabled...');
  db.get('PRAGMA foreign_keys', (err, row) => {
    if (err) {
      console.error('Error checking foreign keys:', err);
    } else {
      console.log('Foreign keys enabled:', row.foreign_keys === 1 ? 'YES' : 'NO');
    }
  });

  // Test 3: Check if new columns exist in inspections table
  console.log('\n3. Checking inspections table schema...');
  db.all("PRAGMA table_info(inspections)", (err, columns) => {
    if (err) {
      console.error('Error getting table info:', err);
    } else {
      console.log('Inspections table columns:');
      columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
      
      const hasComments = columns.some(col => col.name === 'summary_comments');
      const hasSignature = columns.some(col => col.name === 'signature');
      
      console.log('\nMigration status:');
      console.log('  - summary_comments column:', hasComments ? 'PRESENT' : 'MISSING');
      console.log('  - signature column:', hasSignature ? 'PRESENT' : 'MISSING');
    }
  });

  // Test 4: Check schema version
  console.log('\n4. Checking schema version...');
  db.get('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1', (err, row) => {
    if (err) {
      console.error('Error getting schema version:', err);
    } else {
      console.log('Current schema version:', row ? row.version : 'No version found');
    }
  });

  // Test 5: Test foreign key constraint enforcement
  console.log('\n5. Testing foreign key constraint enforcement...');
  
  // First, insert a test equipment record
  db.run('INSERT INTO equipment (equipment_id, type) VALUES (?, ?)', ['TEST-001', 'Test Equipment'], function(err) {
    if (err) {
      console.error('Error inserting test equipment:', err);
      return;
    }
    
    const equipmentId = this.lastID;
    console.log('Inserted test equipment with ID:', equipmentId);
    
    // Try to insert an inspection with valid equipment_id
    db.run('INSERT INTO inspections (equipment_id, inspector, inspection_date, findings) VALUES (?, ?, ?, ?)', 
      [equipmentId, 'Test Inspector', '2025-08-13', 'Test findings'], function(err) {
      if (err) {
        console.error('Error inserting valid inspection:', err);
      } else {
        console.log('✓ Successfully inserted inspection with valid equipment_id');
      }
      
      // Try to insert an inspection with invalid equipment_id (should fail)
      db.run('INSERT INTO inspections (equipment_id, inspector, inspection_date, findings) VALUES (?, ?, ?, ?)', 
        [99999, 'Test Inspector', '2025-08-13', 'Test findings'], function(err) {
        if (err) {
          console.log('✓ Foreign key constraint working - rejected invalid equipment_id:', err.message);
        } else {
          console.log('✗ Foreign key constraint NOT working - accepted invalid equipment_id');
        }
        
        // Test 6: Test new columns in INSERT
        console.log('\n6. Testing new columns in INSERT operation...');
        db.run('INSERT INTO inspections (equipment_id, inspector, inspection_date, findings, summary_comments, signature) VALUES (?, ?, ?, ?, ?, ?)', 
          [equipmentId, 'Test Inspector 2', '2025-08-13', 'Test findings 2', 'Test summary', 'data:image/png;base64,test'], function(err) {
          if (err) {
            console.error('✗ Error inserting with new columns:', err.message);
          } else {
            console.log('✓ Successfully inserted inspection with new columns');
          }
          
          // Clean up and close
          console.log('\n7. Cleaning up test data...');
          db.run('DELETE FROM inspections WHERE equipment_id = ?', [equipmentId], () => {
            db.run('DELETE FROM equipment WHERE id = ?', [equipmentId], () => {
              console.log('✓ Test data cleaned up');
              console.log('\n=== Phase 2 Database Testing Complete ===');
              db.close();
            });
          });
        });
      });
    });
  });

}, 1000); // Wait 1 second for initialization
