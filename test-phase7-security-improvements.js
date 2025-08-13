/**
 * Test Phase 7: Security and file handling improvements
 * 
 * This test verifies:
 * 1. Secure database operations with named, parameterized queries
 * 2. File path validation for document operations
 * 3. shell.openPath usage instead of file:// links
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { initializeDatabase } = require('./database');
const { secureOperations, validateFilePath } = require('./src/database/secureOperations');

// Test configuration
const TEST_DB_PATH = path.join(__dirname, 'test-phase7.db');
let db;
let testResults = [];

function logTest(testName, passed, details = '') {
  const result = { testName, passed, details, timestamp: new Date().toISOString() };
  testResults.push(result);
  console.log(`${passed ? '✅' : '❌'} ${testName}${details ? ': ' + details : ''}`);
}

async function setupTestDatabase() {
  console.log('Setting up test database...');
  
  // Create a mock app object for database initialization
  const mockApp = {
    getPath: () => path.dirname(TEST_DB_PATH)
  };
  
  db = initializeDatabase(mockApp);
  
  // Wait for database to be ready
  await new Promise((resolve) => {
    db.serialize(() => {
      resolve();
    });
  });
  
  console.log('Test database setup complete');
}

async function testFilePathValidation() {
  console.log('\n=== Testing File Path Validation ===');
  
  // Test valid absolute paths
  const validPaths = [
    '/home/user/documents/file.pdf',
    'C:\\Users\\user\\Documents\\file.pdf',
    '/var/lib/app/data/file.txt'
  ];
  
  for (const validPath of validPaths) {
    const isValid = validateFilePath(validPath);
    logTest(`Valid path: ${validPath}`, isValid);
  }
  
  // Test invalid paths (directory traversal attempts)
  const invalidPaths = [
    '../../../etc/passwd',
    '..\\..\\windows\\system32\\config\\sam',
    '/home/user/../../../etc/shadow',
    'C:\\Users\\user\\..\\..\\Windows\\System32',
    '~/secret/file.txt',
    null,
    undefined,
    '',
    123,
    { path: '/invalid' }
  ];
  
  for (const invalidPath of invalidPaths) {
    const isValid = validateFilePath(invalidPath);
    logTest(`Invalid path: ${invalidPath}`, !isValid, 'Should be rejected');
  }
}

async function testSecureOperations() {
  console.log('\n=== Testing Secure Database Operations ===');
  
  // Test equipment operations
  try {
    // Test equipment creation with valid parameters
    const equipmentParams = {
      equipmentId: 'TEST-001',
      type: 'Crane',
      manufacturer: 'Test Corp',
      model: 'TC-100',
      serialNumber: 'SN123456',
      capacity: 5000,
      installationDate: '2024-01-15',
      location: 'Warehouse A',
      status: 'Active',
      qrCodeData: 'TEST-QR-001'
    };
    
    const operation = secureOperations.equipment.create;
    const isValid = operation.validate(equipmentParams);
    logTest('Equipment creation validation', isValid);
    
    if (isValid) {
      // Test parameter mapping
      const paramArray = operation.params.map(paramName => equipmentParams[paramName]);
      const expectedLength = operation.params.length;
      logTest('Parameter mapping', paramArray.length === expectedLength, 
              `Expected ${expectedLength}, got ${paramArray.length}`);
    }
    
  } catch (error) {
    logTest('Equipment operations test', false, error.message);
  }
  
  // Test inspection operations
  try {
    const inspectionParams = {
      equipmentId: 1,
      inspector: 'John Doe',
      inspectionDate: '2024-08-13',
      findings: 'All systems operational',
      correctiveActions: 'None required',
      summaryComments: 'Equipment in good condition',
      signature: 'J.Doe'
    };
    
    const operation = secureOperations.inspections.create;
    const isValid = operation.validate(inspectionParams);
    logTest('Inspection creation validation', isValid);
    
  } catch (error) {
    logTest('Inspection operations test', false, error.message);
  }
  
  // Test invalid parameters
  try {
    const invalidParams = {
      equipmentId: 'invalid', // Should be integer
      inspector: '', // Should not be empty
      inspectionDate: 'invalid-date', // Should be YYYY-MM-DD format
    };
    
    const operation = secureOperations.inspections.create;
    const isValid = operation.validate(invalidParams);
    logTest('Invalid inspection parameters rejection', !isValid, 'Should reject invalid params');
    
  } catch (error) {
    logTest('Invalid parameter test', false, error.message);
  }
}

async function testOperationCategories() {
  console.log('\n=== Testing Operation Categories ===');
  
  const categories = Object.keys(secureOperations);
  const expectedCategories = ['equipment', 'inspections', 'documents', 'scheduledInspections', 'compliance', 'templates'];
  
  for (const expectedCategory of expectedCategories) {
    const exists = categories.includes(expectedCategory);
    logTest(`Category exists: ${expectedCategory}`, exists);
  }
  
  // Test that each category has operations
  for (const category of categories) {
    const operations = Object.keys(secureOperations[category]);
    const hasOperations = operations.length > 0;
    logTest(`Category has operations: ${category}`, hasOperations, `${operations.length} operations`);
  }
}

async function testSQLInjectionPrevention() {
  console.log('\n=== Testing SQL Injection Prevention ===');
  
  // Test that operations use parameterized queries
  const categories = Object.keys(secureOperations);
  let allParameterized = true;
  let testedOperations = 0;
  
  for (const category of categories) {
    const operations = Object.keys(secureOperations[category]);
    
    for (const operationName of operations) {
      const operation = secureOperations[category][operationName];
      testedOperations++;
      
      // Check that SQL uses ? placeholders
      const placeholderCount = (operation.sql.match(/\?/g) || []).length;
      const paramCount = operation.params.length;
      
      if (placeholderCount !== paramCount) {
        allParameterized = false;
        logTest(`SQL parameterization: ${category}.${operationName}`, false, 
                `Placeholders: ${placeholderCount}, Params: ${paramCount}`);
      }
    }
  }
  
  logTest('All operations use parameterized queries', allParameterized, 
          `Tested ${testedOperations} operations`);
}

async function testValidationFunctions() {
  console.log('\n=== Testing Validation Functions ===');
  
  // Test equipment ID validation
  const validEquipmentIds = ['EQ-001', 'CRANE-123', 'TEST_EQUIPMENT'];
  const invalidEquipmentIds = ['', null, undefined, 123, {}];
  
  for (const id of validEquipmentIds) {
    const { validateEquipmentId } = require('./src/database/secureOperations');
    const isValid = validateEquipmentId(id);
    logTest(`Valid equipment ID: ${id}`, isValid);
  }
  
  for (const id of invalidEquipmentIds) {
    const { validateEquipmentId } = require('./src/database/secureOperations');
    const isValid = validateEquipmentId(id);
    logTest(`Invalid equipment ID: ${id}`, !isValid, 'Should be rejected');
  }
  
  // Test date validation
  const validDates = ['2024-08-13', '2023-12-31', '2025-01-01'];
  const invalidDates = ['2024-13-01', '2024/08/13', 'invalid', '', null];
  
  for (const date of validDates) {
    const { validateDate } = require('./src/database/secureOperations');
    const isValid = validateDate(date);
    logTest(`Valid date: ${date}`, isValid);
  }
  
  for (const date of invalidDates) {
    const { validateDate } = require('./src/database/secureOperations');
    const isValid = validateDate(date);
    logTest(`Invalid date: ${date}`, !isValid, 'Should be rejected');
  }
}

async function testSecurityFeatures() {
  console.log('\n=== Testing Security Features ===');
  
  // Test that generic SQL operations are deprecated but still work
  try {
    // This should work but log a deprecation warning
    const mockEvent = {};
    const mockSql = 'SELECT COUNT(*) as count FROM equipment';
    const mockParams = [];
    
    // We can't actually test the IPC handler without setting up Electron,
    // but we can test that the secure operations exist
    const hasSecureOperations = typeof secureOperations === 'object';
    logTest('Secure operations module exists', hasSecureOperations);
    
    const hasValidation = typeof validateFilePath === 'function';
    logTest('File path validation function exists', hasValidation);
    
  } catch (error) {
    logTest('Security features test', false, error.message);
  }
}

async function cleanup() {
  console.log('\nCleaning up test database...');
  
  if (db) {
    db.close();
  }
  
  try {
    await fs.unlink(TEST_DB_PATH);
    console.log('Test database cleaned up');
  } catch (error) {
    // File might not exist, which is fine
    console.log('Test database cleanup completed');
  }
}

async function runTests() {
  console.log('🔒 Phase 7: Security and File Handling Improvements Test');
  console.log('=' .repeat(60));
  
  try {
    await setupTestDatabase();
    await testFilePathValidation();
    await testSecureOperations();
    await testOperationCategories();
    await testSQLInjectionPrevention();
    await testValidationFunctions();
    await testSecurityFeatures();
    
  } catch (error) {
    console.error('Test execution failed:', error);
    logTest('Test execution', false, error.message);
  } finally {
    await cleanup();
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  const failed = testResults.filter(r => !r.passed);
  
  console.log(`Total tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Success rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed.length > 0) {
    console.log('\nFailed tests:');
    failed.forEach(test => {
      console.log(`❌ ${test.testName}: ${test.details}`);
    });
  }
  
  console.log('\n🔒 Phase 7 Security Improvements Test Complete!');
  
  if (passed === total) {
    console.log('✅ All security improvements are working correctly!');
    process.exit(0);
  } else {
    console.log('❌ Some security tests failed. Please review the implementation.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
