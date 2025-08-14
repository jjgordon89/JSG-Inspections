/**
 * Phase 8 - Integration Tests (Fixed)
 * Tests for database operations, error handling, and system integration
 * Uses the existing database.js setup instead of direct sqlite3
 */

const path = require('path');
const fs = require('fs');

// Import the existing database setup
const Database = require('./database.js');

// Test database path
const TEST_DB_PATH = './test-integration-fixed.db';

// Clean up function
function cleanup() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
}

// Initialize test database
async function initializeTestDatabase() {
  // Create a test database instance
  const db = new Database(TEST_DB_PATH);
  await db.initialize();
  return db;
}

// Test functions
async function testDatabaseOperations() {
  console.log('\n🧪 Testing Database Operations...');
  
  let passed = 0;
  let total = 0;
  let db;
  
  try {
    db = await initializeTestDatabase();
    
    // Test 1: Database initialization
    total++;
    try {
      const tables = await db.run("SELECT name FROM sqlite_master WHERE type='table'");
      if (tables) {
        console.log('✅ Test 1 passed: Database initialization works');
        passed++;
      } else {
        console.log('❌ Test 1 failed: Database initialization failed');
      }
    } catch (error) {
      console.log('❌ Test 1 failed:', error.message);
    }
    
    // Test 2: Equipment creation
    total++;
    try {
      const result = await db.run(
        `INSERT INTO equipment (equipment_id, type, location, manufacturer, model) 
         VALUES (?, ?, ?, ?, ?)`,
        ['TEST-001', 'Crane', 'Warehouse A', 'Acme Corp', 'AC-500']
      );
      
      if (result && result.lastID) {
        console.log('✅ Test 2 passed: Equipment creation works');
        passed++;
      } else {
        console.log('❌ Test 2 failed: Equipment creation did not return lastID');
      }
    } catch (error) {
      console.log('❌ Test 2 failed:', error.message);
    }
    
    // Test 3: Data retrieval
    total++;
    try {
      const equipment = await db.get(
        'SELECT * FROM equipment WHERE equipment_id = ?',
        ['TEST-001']
      );
      
      if (equipment && equipment.equipment_id === 'TEST-001') {
        console.log('✅ Test 3 passed: Data retrieval works');
        passed++;
      } else {
        console.log('❌ Test 3 failed: Data retrieval failed');
      }
    } catch (error) {
      console.log('❌ Test 3 failed:', error.message);
    }
    
    // Test 4: Foreign key constraints
    total++;
    try {
      // Try to insert document with invalid equipment_id
      await db.run(
        `INSERT INTO documents (equipment_id, filename, original_name, file_path, file_size, mime_type) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [99999, 'test.pdf', 'Test.pdf', '/test.pdf', 1024, 'application/pdf']
      );
      console.log('❌ Test 4 failed: Foreign key constraint not enforced');
    } catch (error) {
      if (error.message.includes('FOREIGN KEY constraint failed')) {
        console.log('✅ Test 4 passed: Foreign key constraints work');
        passed++;
      } else {
        console.log('❌ Test 4 failed: Wrong error type:', error.message);
      }
    }
    
    // Test 5: Transaction rollback
    total++;
    try {
      await db.run('BEGIN TRANSACTION');
      await db.run(
        `INSERT INTO equipment (equipment_id, type, location) 
         VALUES (?, ?, ?)`,
        ['TEST-002', 'Forklift', 'Dock B']
      );
      await db.run('ROLLBACK');
      
      const equipment = await db.get(
        'SELECT * FROM equipment WHERE equipment_id = ?',
        ['TEST-002']
      );
      
      if (!equipment) {
        console.log('✅ Test 5 passed: Transaction rollback works');
        passed++;
      } else {
        console.log('❌ Test 5 failed: Transaction rollback did not work');
      }
    } catch (error) {
      console.log('❌ Test 5 failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Database operation tests failed:', error.message);
  } finally {
    if (db) {
      await db.close();
    }
  }
  
  console.log(`\n📊 Database Operation Tests: ${passed}/${total} passed`);
  return { passed, total };
}

async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling...');
  
  let passed = 0;
  let total = 0;
  let db;
  
  try {
    db = await initializeTestDatabase();
    
    // Test 1: Invalid SQL handling
    total++;
    try {
      await db.run('INVALID SQL STATEMENT');
      console.log('❌ Test 1 failed: Invalid SQL should have thrown error');
    } catch (error) {
      if (error.message.includes('syntax error')) {
        console.log('✅ Test 1 passed: Invalid SQL properly handled');
        passed++;
      } else {
        console.log('❌ Test 1 failed: Wrong error type:', error.message);
      }
    }
    
    // Test 2: Duplicate key handling
    total++;
    try {
      await db.run(
        `INSERT INTO equipment (equipment_id, type, location) 
         VALUES (?, ?, ?)`,
        ['DUPLICATE-001', 'Crane', 'Test Location']
      );
      
      // Try to insert duplicate
      await db.run(
        `INSERT INTO equipment (equipment_id, type, location) 
         VALUES (?, ?, ?)`,
        ['DUPLICATE-001', 'Forklift', 'Another Location']
      );
      
      console.log('❌ Test 2 failed: Duplicate key should have thrown error');
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        console.log('✅ Test 2 passed: Duplicate key properly handled');
        passed++;
      } else {
        console.log('❌ Test 2 failed: Wrong error type:', error.message);
      }
    }
    
    // Test 3: Missing parameter handling
    total++;
    try {
      await db.run(
        `INSERT INTO equipment (equipment_id, type, location) 
         VALUES (?, ?, ?)`,
        ['MISSING-PARAM'] // Missing parameters
      );
      console.log('❌ Test 3 failed: Missing parameters should have thrown error');
    } catch (error) {
      console.log('✅ Test 3 passed: Missing parameters properly handled');
      passed++;
    }
    
  } catch (error) {
    console.error('❌ Error handling tests failed:', error.message);
  } finally {
    if (db) {
      await db.close();
    }
  }
  
  console.log(`\n📊 Error Handling Tests: ${passed}/${total} passed`);
  return { passed, total };
}

async function testPerformanceOptimization() {
  console.log('\n🧪 Testing Performance Optimization...');
  
  let passed = 0;
  let total = 0;
  let db;
  
  try {
    db = await initializeTestDatabase();
    
    // Test 1: Bulk insert performance
    total++;
    try {
      const startTime = Date.now();
      
      // Insert multiple equipment records
      for (let i = 0; i < 100; i++) {
        await db.run(
          `INSERT INTO equipment (equipment_id, type, location) 
           VALUES (?, ?, ?)`,
          [`BULK-${i.toString().padStart(3, '0')}`, 'Test Equipment', `Location ${i}`]
        );
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (duration < 5000) { // Should complete in under 5 seconds
        console.log(`✅ Test 1 passed: Bulk insert completed in ${duration}ms`);
        passed++;
      } else {
        console.log(`❌ Test 1 failed: Bulk insert took too long (${duration}ms)`);
      }
    } catch (error) {
      console.log('❌ Test 1 failed:', error.message);
    }
    
    // Test 2: Query performance with indexes
    total++;
    try {
      const startTime = Date.now();
      
      // Query by type (should use index)
      const results = await db.all(
        'SELECT * FROM equipment WHERE type = ?',
        ['Test Equipment']
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (duration < 100 && results.length === 100) { // Should be fast with index
        console.log(`✅ Test 2 passed: Indexed query completed in ${duration}ms`);
        passed++;
      } else {
        console.log(`❌ Test 2 failed: Query performance issue (${duration}ms, ${results.length} results)`);
      }
    } catch (error) {
      console.log('❌ Test 2 failed:', error.message);
    }
    
    // Test 3: Memory usage for large result sets
    total++;
    try {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Query all equipment
      const results = await db.all('SELECT * FROM equipment');
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      if (memoryIncrease < 10 * 1024 * 1024) { // Less than 10MB increase
        console.log(`✅ Test 3 passed: Memory usage acceptable (${Math.round(memoryIncrease / 1024)}KB increase)`);
        passed++;
      } else {
        console.log(`❌ Test 3 failed: Excessive memory usage (${Math.round(memoryIncrease / 1024 / 1024)}MB increase)`);
      }
    } catch (error) {
      console.log('❌ Test 3 failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Performance optimization tests failed:', error.message);
  } finally {
    if (db) {
      await db.close();
    }
  }
  
  console.log(`\n📊 Performance Optimization Tests: ${passed}/${total} passed`);
  return { passed, total };
}

// Main test runner
async function runIntegrationTests() {
  console.log('🚀 Starting Phase 8 - Integration Tests (Fixed)');
  console.log('=' .repeat(60));
  
  // Clean up any existing test database
  cleanup();
  
  try {
    const databaseResult = await testDatabaseOperations();
    const errorResult = await testErrorHandling();
    const performanceResult = await testPerformanceOptimization();
    
    // Clean up test database
    cleanup();
    
    // Summary
    const totalPassed = databaseResult.passed + errorResult.passed + performanceResult.passed;
    const totalTests = databaseResult.total + errorResult.total + performanceResult.total;
    
    console.log('\n' + '=' .repeat(60));
    console.log('📋 INTEGRATION TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Database Operations: ${databaseResult.passed}/${databaseResult.total} passed`);
    console.log(`Error Handling: ${errorResult.passed}/${errorResult.total} passed`);
    console.log(`Performance Optimization: ${performanceResult.passed}/${performanceResult.total} passed`);
    console.log('-' .repeat(60));
    console.log(`TOTAL: ${totalPassed}/${totalTests} tests passed (${Math.round(totalPassed/totalTests*100)}%)`);
    
    if (totalPassed === totalTests) {
      console.log('🎉 All integration tests passed!');
      return true;
    } else {
      console.log('❌ Some integration tests failed.');
      return false;
    }
  } catch (error) {
    console.error('❌ Integration tests failed:', error.message);
    cleanup();
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = {
  runIntegrationTests,
  testDatabaseOperations,
  testErrorHandling,
  testPerformanceOptimization,
  cleanup
};
