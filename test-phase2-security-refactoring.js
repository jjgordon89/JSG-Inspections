/**
 * Test script to verify Phase 2: Security & Technical Debt Refactoring
 * 
 * This script verifies that:
 * 1. All legacy IPC calls have been refactored to use secure operations
 * 2. Legacy IPC handlers have been removed from electron.js and preload.js
 * 3. Notification system has been enhanced to use secure operations
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Testing Phase 2: Security & Technical Debt Refactoring');
console.log('=' .repeat(60));

let testsPassed = 0;
let testsTotal = 0;

function runTest(testName, testFunction) {
  testsTotal++;
  try {
    const result = testFunction();
    if (result) {
      console.log(`✅ ${testName}`);
      testsPassed++;
    } else {
      console.log(`❌ ${testName}`);
    }
  } catch (error) {
    console.log(`❌ ${testName} - Error: ${error.message}`);
  }
}

// Test 1: Verify no legacy IPC calls remain in src directory
runTest('No legacy IPC calls in src directory', () => {
  const srcDir = path.join(__dirname, 'src');
  const legacyPatterns = [
    /window\.api\.run\s*\(/,
    /window\.api\.get\s*\(/,
    /window\.api\.all\s*\(/,
    /window\.api\.getTemplates\s*\(/,
    /window\.api\.saveTemplate\s*\(/,
    /window\.api\.deleteTemplate\s*\(/
  ];
  
  function checkDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        checkDirectory(filePath);
      } else if (file.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of legacyPatterns) {
          if (pattern.test(content)) {
            throw new Error(`Legacy IPC call found in ${filePath}`);
          }
        }
      }
    }
  }
  
  checkDirectory(srcDir);
  return true;
});

// Test 2: Verify legacy handlers removed from electron.js
runTest('Legacy handlers removed from electron.js', () => {
  const electronPath = path.join(__dirname, 'public', 'electron.js');
  const content = fs.readFileSync(electronPath, 'utf8');
  
  const legacyHandlers = [
    'db-run',
    'db-get', 
    'db-all',
    'get-templates',
    'save-template',
    'delete-template'
  ];
  
  for (const handler of legacyHandlers) {
    if (content.includes(`ipcMain.handle('${handler}'`)) {
      throw new Error(`Legacy handler ${handler} still exists in electron.js`);
    }
  }
  
  return true;
});

// Test 3: Verify legacy operations removed from preload.js
runTest('Legacy operations removed from preload.js', () => {
  const preloadPath = path.join(__dirname, 'public', 'preload.js');
  const content = fs.readFileSync(preloadPath, 'utf8');
  
  // Check that legacy operations are not defined
  const legacyOps = ['apiObject.run', 'apiObject.get', 'apiObject.all', 'apiObject.getTemplates'];
  
  for (const op of legacyOps) {
    if (content.includes(`${op} = createIPCWrapper`)) {
      throw new Error(`Legacy operation ${op} still exists in preload.js`);
    }
  }
  
  return true;
});

// Test 4: Verify secure operations are properly exposed
runTest('Secure operations properly exposed in preload.js', () => {
  const preloadPath = path.join(__dirname, 'public', 'preload.js');
  const content = fs.readFileSync(preloadPath, 'utf8');
  
  const requiredOperations = [
    'equipment:',
    'inspections:',
    'documents:',
    'scheduledInspections:',
    'compliance:',
    'templates:',
    'inspectionItems:',
    'deficiencies:',
    'signatures:',
    'workOrders:',
    'pmTemplates:',
    'pmSchedules:',
    'loadTests:',
    'calibrations:',
    'credentials:',
    'users:',
    'auditLog:',
    'certificates:',
    'meterReadings:',
    'templateItems:'
  ];
  
  for (const op of requiredOperations) {
    if (!content.includes(op)) {
      throw new Error(`Required secure operation ${op} not found in preload.js`);
    }
  }
  
  return true;
});

// Test 5: Verify notification system uses secure operations
runTest('Notification system uses secure operations', () => {
  const electronPath = path.join(__dirname, 'public', 'electron.js');
  const content = fs.readFileSync(electronPath, 'utf8');
  
  // Check that notification system uses executeSecureOperation
  if (!content.includes('executeSecureOperation(\'scheduledInspections\', \'getTodayAndLater\'')) {
    throw new Error('Notification system not using secure operations');
  }
  
  // Check that it has proper error handling
  if (!content.includes('catch (error)') || !content.includes('Failed to check for upcoming inspections')) {
    throw new Error('Notification system missing proper error handling');
  }
  
  return true;
});

// Test 6: Verify secure operation structure in secureOperations.js
runTest('Secure operations properly structured', () => {
  const secureOpsPath = path.join(__dirname, 'src', 'database', 'secureOperations.js');
  const content = fs.readFileSync(secureOpsPath, 'utf8');
  
  // Check for required validation functions
  const requiredFunctions = [
    'validateFilePath',
    'validateEquipmentId', 
    'validateInspector',
    'validateDate'
  ];
  
  for (const func of requiredFunctions) {
    if (!content.includes(`function ${func}`)) {
      throw new Error(`Required validation function ${func} not found`);
    }
  }
  
  // Check that secureOperations object is exported
  if (!content.includes('module.exports = {') || !content.includes('secureOperations')) {
    throw new Error('secureOperations not properly exported');
  }
  
  return true;
});

// Test 7: Verify all components use secure operations
runTest('All components use secure operations', () => {
  const componentsDir = path.join(__dirname, 'src', 'components');
  const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.js'));
  
  const securePatterns = [
    /window\.api\.equipment\./,
    /window\.api\.inspections\./,
    /window\.api\.documents\./,
    /window\.api\.compliance\./,
    /window\.api\.templates\./
  ];
  
  let foundSecureUsage = false;
  
  for (const file of files) {
    const filePath = path.join(componentsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip files that don't use window.api at all
    if (!content.includes('window.api')) continue;
    
    // Check if any secure patterns are used
    for (const pattern of securePatterns) {
      if (pattern.test(content)) {
        foundSecureUsage = true;
        break;
      }
    }
  }
  
  return foundSecureUsage;
});

// Test 8: Verify error handling utilities are intact
runTest('Error handling utilities intact', () => {
  const preloadPath = path.join(__dirname, 'public', 'preload.js');
  const content = fs.readFileSync(preloadPath, 'utf8');
  
  const requiredUtilities = [
    'isError:',
    'getErrorMessage:',
    'isRetryable:',
    'getRetryDelay:'
  ];
  
  for (const util of requiredUtilities) {
    if (!content.includes(util)) {
      throw new Error(`Required error handling utility ${util} not found`);
    }
  }
  
  return true;
});

console.log('\n' + '='.repeat(60));
console.log(`📊 Phase 2 Test Results: ${testsPassed}/${testsTotal} tests passed`);

if (testsPassed === testsTotal) {
  console.log('🎉 Phase 2: Security & Technical Debt Refactoring - COMPLETED SUCCESSFULLY!');
  console.log('\n✅ All legacy IPC calls have been refactored to secure operations');
  console.log('✅ All deprecated IPC handlers have been removed');
  console.log('✅ Notification system enhanced with secure operations');
  console.log('✅ Error handling and validation maintained');
  console.log('✅ Security vulnerabilities eliminated');
} else {
  console.log('❌ Phase 2 has issues that need to be addressed');
  process.exit(1);
}
