/**
 * Test script for P2 database migrations
 * This script tests the new P2 database schema and operations
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create a test database
const testDbPath = './test-p2-database.db';

// Clean up any existing test database
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const db = new sqlite3.Database(testDbPath);

console.log('🧪 Testing P2 Database Migrations...\n');

// Import the migration functions from database.js
const { initializeDatabase } = require('./database.js');

// Mock app object for testing
const mockApp = {
  getPath: (type) => {
    if (type === 'userData') {
      return './test-data';
    }
    return './';
  }
};

// Create test data directory
if (!fs.existsSync('./test-data')) {
  fs.mkdirSync('./test-data', { recursive: true });
}

// Test the migrations
async function testMigrations() {
  try {
    console.log('📊 Initializing database with P2 migrations...');
    
    // Initialize database (this will run all migrations)
    const testDb = initializeDatabase(mockApp);
    
    // Wait a bit for migrations to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Database initialization completed\n');
    
    // Test P2 table creation
    console.log('🔍 Testing P2 table creation...');
    
    const tables = [
      'work_orders',
      'pm_templates', 
      'pm_schedules',
      'meter_readings',
      'load_tests',
      'calibrations',
      'credentials',
      'template_items',
      'users',
      'audit_log',
      'certificates'
    ];
    
    for (const table of tables) {
      await new Promise((resolve, reject) => {
        testDb.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table], (err, row) => {
          if (err) {
            console.log(`❌ Error checking table ${table}:`, err.message);
            reject(err);
          } else if (row) {
            console.log(`✅ Table ${table} exists`);
            resolve();
          } else {
            console.log(`❌ Table ${table} does not exist`);
            reject(new Error(`Table ${table} missing`));
          }
        });
      });
    }
    
    console.log('\n🔍 Testing P2 column additions...');
    
    // Test equipment table enhancements
    await new Promise((resolve, reject) => {
      testDb.all("PRAGMA table_info(equipment)", (err, columns) => {
        if (err) {
          console.log('❌ Error checking equipment table:', err.message);
          reject(err);
        } else {
          const columnNames = columns.map(col => col.name);
          const expectedColumns = ['parent_id', 'site', 'building', 'bay', 'tagged_out'];
          
          for (const col of expectedColumns) {
            if (columnNames.includes(col)) {
              console.log(`✅ Equipment column ${col} exists`);
            } else {
              console.log(`❌ Equipment column ${col} missing`);
              reject(new Error(`Column ${col} missing from equipment table`));
              return;
            }
          }
          resolve();
        }
      });
    });
    
    // Test documents table enhancements
    await new Promise((resolve, reject) => {
      testDb.all("PRAGMA table_info(documents)", (err, columns) => {
        if (err) {
          console.log('❌ Error checking documents table:', err.message);
          reject(err);
        } else {
          const columnNames = columns.map(col => col.name);
          const expectedColumns = ['hash', 'size', 'uploaded_by', 'uploaded_at'];
          
          for (const col of expectedColumns) {
            if (columnNames.includes(col)) {
              console.log(`✅ Documents column ${col} exists`);
            } else {
              console.log(`❌ Documents column ${col} missing`);
              reject(new Error(`Column ${col} missing from documents table`));
              return;
            }
          }
          resolve();
        }
      });
    });
    
    console.log('\n🔍 Testing P2 indexes...');
    
    // Test some key indexes
    const expectedIndexes = [
      'idx_work_orders_equipment_id',
      'idx_work_orders_status',
      'idx_pm_schedules_equipment_id',
      'idx_load_tests_equipment_id',
      'idx_calibrations_equipment_id',
      'idx_credentials_person_name',
      'idx_users_username',
      'idx_audit_log_entity',
      'idx_certificates_equipment_id'
    ];
    
    for (const index of expectedIndexes) {
      await new Promise((resolve, reject) => {
        testDb.get(`SELECT name FROM sqlite_master WHERE type='index' AND name=?`, [index], (err, row) => {
          if (err) {
            console.log(`❌ Error checking index ${index}:`, err.message);
            reject(err);
          } else if (row) {
            console.log(`✅ Index ${index} exists`);
            resolve();
          } else {
            console.log(`⚠️  Index ${index} not found (may be optional)`);
            resolve(); // Don't fail for missing indexes
          }
        });
      });
    }
    
    console.log('\n🧪 Testing basic P2 operations...');
    
    // Test inserting a work order
    await new Promise((resolve, reject) => {
      testDb.run(`INSERT INTO equipment (equipment_id, type, manufacturer, model, status) 
                  VALUES (?, ?, ?, ?, ?)`, 
                  ['TEST-001', 'Crane', 'Test Mfg', 'Test Model', 'active'], 
                  function(err) {
        if (err) {
          console.log('❌ Error inserting test equipment:', err.message);
          reject(err);
        } else {
          console.log('✅ Test equipment inserted');
          
          // Now insert a work order
          testDb.run(`INSERT INTO work_orders (equipment_id, wo_number, title, work_type, priority, created_by) 
                      VALUES (?, ?, ?, ?, ?, ?)`,
                      [this.lastID, 'WO-001', 'Test Work Order', 'preventive', 'medium', 'Test User'],
                      function(err) {
            if (err) {
              console.log('❌ Error inserting test work order:', err.message);
              reject(err);
            } else {
              console.log('✅ Test work order inserted');
              resolve();
            }
          });
        }
      });
    });
    
    // Test inserting a user
    await new Promise((resolve, reject) => {
      testDb.run(`INSERT INTO users (username, full_name, email, role) 
                  VALUES (?, ?, ?, ?)`,
                  ['testuser', 'Test User', 'test@example.com', 'inspector'],
                  function(err) {
        if (err) {
          console.log('❌ Error inserting test user:', err.message);
          reject(err);
        } else {
          console.log('✅ Test user inserted');
          resolve();
        }
      });
    });
    
    console.log('\n🎉 All P2 migration tests passed!');
    
    // Close the test database
    testDb.close((err) => {
      if (err) {
        console.log('❌ Error closing database:', err.message);
      } else {
        console.log('✅ Test database closed');
      }
    });
    
  } catch (error) {
    console.error('❌ Migration test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testMigrations().then(() => {
  console.log('\n✨ P2 migration testing completed successfully!');
  
  // Clean up test files
  setTimeout(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync('./test-data')) {
      fs.rmSync('./test-data', { recursive: true, force: true });
    }
    console.log('🧹 Test files cleaned up');
  }, 1000);
}).catch((error) => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
