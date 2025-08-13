/**
 * Test Phase 7: Security and file handling improvements (Node.js only)
 * 
 * This test verifies:
 * 1. Secure database operations with named, parameterized queries
 * 2. File path validation for document operations
 * 3. Validation functions work correctly
 */

const path = require('path');
const fs = require('fs').promises;

// Test configuration
let testResults = [];

function logTest(testName, passed, details = '') {
  const result = { testName, passed, details, timestamp: new Date().toISOString() };
  testResults.push(result);
  console.log(`${passed ? '✅' : '❌'} ${testName}${details ? ': ' + details : ''}`);
}

async function testFilePathValidation() {
  console.log('\n=== Testing File Path Validation ===');
  
  const { validateFilePath } = require('./src/database/secureOperations');
  
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
  
  const { secureOperations } = require('./src/database/secureOperations');
  
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
  
  const { secureOperations } = require('./src/database/secureOperations');
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
  
  const { secureOperations } = require('./src/database/secureOperations');
  
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
  
  const { validateEquipmentId, validateDate, validateInspector } = require('./src/database/secureOperations');
  
  // Test equipment ID validation
  const validEquipmentIds = ['EQ-001', 'CRANE-123', 'TEST_EQUIPMENT'];
  const invalidEquipmentIds = ['', null, undefined, 123, {}];
  
  for (const id of validEquipmentIds) {
    const isValid = validateEquipmentId(id);
    logTest(`Valid equipment ID: ${id}`, isValid);
  }
  
  for (const id of invalidEquipmentIds) {
    const isValid = validateEquipmentId(id);
    logTest(`Invalid equipment ID: ${id}`, !isValid, 'Should be rejected');
  }
  
  // Test date validation
  const validDates = ['2024-08-13', '2023-12-31', '2025-01-01'];
  const invalidDates = ['2024-13-01', '2024/08/13', 'invalid', '', null];
  
  for (const date of validDates) {
    const isValid = validateDate(date);
    logTest(`Valid date: ${date}`, isValid);
  }
  
  for (const date of invalidDates) {
    const isValid = validateDate(date);
    logTest(`Invalid date: ${date}`, !isValid, 'Should be rejected');
  }
  
  // Test inspector validation
  const validInspectors = ['John Doe', 'Jane Smith', 'Inspector-123'];
  const invalidInspectors = ['', null, undefined, 123, {}];
  
  for (const inspector of validInspectors) {
    const isValid = validateInspector(inspector);
    logTest(`Valid inspector: ${inspector}`, isValid);
  }
  
  for (const inspector of invalidInspectors) {
    const isValid = validateInspector(inspector);
    logTest(`Invalid inspector: ${inspector}`, !isValid, 'Should be rejected');
  }
}

async function testSecurityFeatures() {
  console.log('\n=== Testing Security Features ===');
  
  try {
    const { secureOperations, validateFilePath } = require('./src/database/secureOperations');
    
    // Test that secure operations module exists and is properly structured
    const hasSecureOperations = typeof secureOperations === 'object';
    logTest('Secure operations module exists', hasSecureOperations);
    
    const hasValidation = typeof validateFilePath === 'function';
    logTest('File path validation function exists', hasValidation);
    
    // Test that all operations have required properties
    let allOperationsValid = true;
    const categories = Object.keys(secureOperations);
    
    for (const category of categories) {
      const operations = Object.keys(secureOperations[category]);
      
      for (const operationName of operations) {
        const operation = secureOperations[category][operationName];
        
        if (!operation.sql || !Array.isArray(operation.params) || typeof operation.validate !== 'function') {
          allOperationsValid = false;
          logTest(`Operation structure: ${category}.${operationName}`, false, 'Missing required properties');
        }
      }
    }
    
    logTest('All operations have required structure', allOperationsValid);
    
  } catch (error) {
    logTest('Security features test', false, error.message);
  }
}

async function testSpecificOperations() {
  console.log('\n=== Testing Specific Operations ===');
  
  const { secureOperations } = require('./src/database/secureOperations');
  
  // Test document operations with file path validation
  try {
    const validDocParams = {
      equipmentId: 1,
      fileName: 'manual.pdf',
      filePath: '/home/user/documents/manual.pdf'
    };
    
    const docOperation = secureOperations.documents.create;
    const isValid = docOperation.validate(validDocParams);
    logTest('Document creation with valid path', isValid);
    
    const invalidDocParams = {
      equipmentId: 1,
      fileName: 'manual.pdf',
      filePath: '../../../etc/passwd' // Directory traversal attempt
    };
    
    const isInvalid = docOperation.validate(invalidDocParams);
    logTest('Document creation with invalid path', !isInvalid, 'Should reject directory traversal');
    
  } catch (error) {
    logTest('Document operations test', false, error.message);
  }
  
  // Test scheduled inspection operations
  try {
    const validScheduleParams = {
      equipmentId: 1,
      scheduledDate: '2024-12-01',
      assignedInspector: 'John Doe',
      status: 'scheduled'
    };
    
    const scheduleOperation = secureOperations.scheduledInspections.create;
    const isValid = scheduleOperation.validate(validScheduleParams);
    logTest('Scheduled inspection creation', isValid);
    
  } catch (error) {
    logTest('Scheduled inspection operations test', false, error.message);
  }
}

async function runTests() {
  console.log('🔒 Phase 7: Security and File Handling Improvements Test');
  console.log('=' .repeat(60));
  
  try {
    await testFilePathValidation();
    await testSecureOperations();
    await testOperationCategories();
    await testSQLInjectionPrevention();
    await testValidationFunctions();
    await testSecurityFeatures();
    await testSpecificOperations();
    
  } catch (error) {
    console.error('Test execution failed:', error);
    logTest('Test execution', false, error.message);
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
    return true;
  } else {
    console.log('❌ Some security tests failed. Please review the implementation.');
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(console.error);
}

module.exports = { runTests };
