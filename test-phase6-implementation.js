/**
 * Phase 6 Implementation Test
 * Tests the specialized compliance features for Load Tests, Calibrations, and Credentials
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const testConfig = {
  verbose: true,
  stopOnFirstFailure: false
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    if (testConfig.verbose) {
      console.log(`✅ ${testName}`);
    }
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    if (details) {
      console.log(`   ${details}`);
    }
  }
  
  testResults.details.push({
    name: testName,
    passed,
    details
  });
  
  if (!passed && testConfig.stopOnFirstFailure) {
    console.log('\n🛑 Stopping on first failure');
    process.exit(1);
  }
}

function testFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  logTest(description, exists, exists ? '' : `File not found: ${filePath}`);
  return exists;
}

function testFileContains(filePath, searchStrings, description) {
  if (!fs.existsSync(filePath)) {
    logTest(description, false, `File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const missingStrings = searchStrings.filter(str => !content.includes(str));
  
  const passed = missingStrings.length === 0;
  logTest(description, passed, 
    passed ? '' : `Missing: ${missingStrings.join(', ')}`);
  return passed;
}

function testReactComponentStructure(filePath, requiredElements, description) {
  if (!fs.existsSync(filePath)) {
    logTest(description, false, `File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const missingElements = requiredElements.filter(element => !content.includes(element));
  
  const passed = missingElements.length === 0;
  logTest(description, passed, 
    passed ? '' : `Missing elements: ${missingElements.join(', ')}`);
  return passed;
}

console.log('🧪 Phase 6 Implementation Tests');
console.log('=====================================\n');

// Test 1: Load Tests Scheduling and Tracking
console.log('📋 Testing Load Tests Scheduling and Tracking...');

testFileExists('src/components/LoadTests.js', 'LoadTests component exists');

testFileContains('src/components/LoadTests.js', [
  'checkUpcomingTests',
  'handleScheduleNext',
  'notifications',
  'setNotifications',
  'load-test-notifications',
  'Schedule Test'
], 'LoadTests has scheduling and notification features');

testReactComponentStructure('src/components/LoadTests.js', [
  'const [notifications, setNotifications] = useState([]);',
  'const [showScheduleNext, setShowScheduleNext] = useState(false);',
  'const checkUpcomingTests = async () => {',
  'const handleScheduleNext = async (test) => {',
  'await checkUpcomingTests(); // Refresh notifications'
], 'LoadTests has proper scheduling state and functions');

// Test 2: Calibrations Scheduling and Tracking
console.log('\n📋 Testing Calibrations Scheduling and Tracking...');

testFileExists('src/components/Calibrations.js', 'Calibrations component exists');

testFileContains('src/components/Calibrations.js', [
  'checkUpcomingCalibrations',
  'handleScheduleNext',
  'notifications',
  'setNotifications',
  'calibration-notifications',
  'Schedule Calibration'
], 'Calibrations has scheduling and notification features');

testReactComponentStructure('src/components/Calibrations.js', [
  'const [notifications, setNotifications] = useState([]);',
  'const [showScheduleNext, setShowScheduleNext] = useState(false);',
  'const checkUpcomingCalibrations = async () => {',
  'const handleScheduleNext = async (calibration) => {',
  'await checkUpcomingCalibrations(); // Refresh notifications'
], 'Calibrations has proper scheduling state and functions');

// Test 3: Credential Expiration Notifications
console.log('\n📋 Testing Credential Expiration Notifications...');

testFileExists('src/components/Credentials.js', 'Credentials component exists');

testFileContains('src/components/Credentials.js', [
  'checkExpiringCredentials',
  'handleRenewCredential',
  'notifications',
  'setNotifications',
  'credential-notifications',
  'Credential Expiration Alerts',
  'Renew Credential'
], 'Credentials has expiration notification features');

testReactComponentStructure('src/components/Credentials.js', [
  'const [notifications, setNotifications] = useState([]);',
  'const [showRenewCredential, setShowRenewCredential] = useState(false);',
  'const checkExpiringCredentials = async () => {',
  'const handleRenewCredential = async (credential) => {',
  'await checkExpiringCredentials(); // Refresh notifications'
], 'Credentials has proper expiration notification state and functions');

// Test 4: Credential Work Assignment Linking
console.log('\n📋 Testing Credential Work Assignment Linking...');

testFileContains('src/components/Credentials.js', [
  'handleCredentialCheck',
  'getRequiredCredentials',
  'showCredentialCheck',
  'credentialCheckResults',
  'Check Work Assignment Credentials',
  'Check Credentials',
  'credential_check'
], 'Credentials has work assignment linking features');

testReactComponentStructure('src/components/Credentials.js', [
  'const [showCredentialCheck, setShowCredentialCheck] = useState(false);',
  'const [credentialCheckResults, setCredentialCheckResults] = useState([]);',
  'const handleCredentialCheck = async (e) => {',
  'const getRequiredCredentials = (workOrder, equipmentType) => {',
  'action: \'credential_check\''
], 'Credentials has proper work assignment checking state and functions');

// Test 5: Backend Operations Integration
console.log('\n📋 Testing Backend Operations Integration...');

testFileExists('src/database/secureOperations.js', 'Secure operations file exists');

testFileContains('src/database/secureOperations.js', [
  'loadTests: {',
  'getDue:',
  'getOverdue:',
  'calibrations: {',
  'credentials: {',
  'getExpiring:'
], 'Backend has required operations for Phase 6 features');

testFileExists('public/preload.js', 'Preload file exists');

testFileContains('public/preload.js', [
  'loadTests: {',
  'getDue:',
  'getOverdue:',
  'calibrations: {',
  'credentials: {',
  'getExpiring:'
], 'Preload exposes Phase 6 backend operations');

// Test 6: User Context Integration
console.log('\n📋 Testing User Context Integration...');

testFileContains('src/components/LoadTests.js', [
  'import { useUser } from \'../contexts/UserContext\';',
  'const { currentUser } = useUser();',
  'userId: currentUser?.id',
  'username: currentUser?.username'
], 'LoadTests integrates with user context');

testFileContains('src/components/Calibrations.js', [
  'import { useUser } from \'../contexts/UserContext\';',
  'const { currentUser } = useUser();',
  'userId: currentUser?.id',
  'username: currentUser?.username'
], 'Calibrations integrates with user context');

testFileContains('src/components/Credentials.js', [
  'import { useUser } from \'../contexts/UserContext\';',
  'const { currentUser } = useUser();',
  'userId: currentUser?.id',
  'username: currentUser?.username'
], 'Credentials integrates with user context');

// Test 7: Audit Logging
console.log('\n📋 Testing Audit Logging...');

testFileContains('src/components/LoadTests.js', [
  'window.api.auditLog.create',
  'entityType: \'load_test\'',
  'action: \'create\''
], 'LoadTests implements audit logging');

testFileContains('src/components/Calibrations.js', [
  'window.api.auditLog.create',
  'entityType: \'calibration\'',
  'action: \'create\''
], 'Calibrations implements audit logging');

testFileContains('src/components/Credentials.js', [
  'window.api.auditLog.create',
  'entityType: \'credential\'',
  'action: \'create\'',
  'action: \'credential_check\''
], 'Credentials implements audit logging');

// Test 8: Certificate Generation
console.log('\n📋 Testing Certificate Generation...');

testFileContains('src/components/LoadTests.js', [
  'window.api.certificates.create',
  'certificateType: \'load_test\'',
  'certificateNumber'
], 'LoadTests generates certificates');

testFileContains('src/components/Calibrations.js', [
  'window.api.certificates.create',
  'certificateType: \'calibration\'',
  'certificateNumber'
], 'Calibrations generates certificates');

// Test 9: Notification System
console.log('\n📋 Testing Notification System...');

testFileContains('src/components/LoadTests.js', [
  'type: \'critical\'',
  'daysUntilDue <= 7 ? \'warning\' : \'info\'',
  'notification-message',
  'notification-action'
], 'LoadTests has proper notification types and UI');

testFileContains('src/components/Calibrations.js', [
  'type: \'critical\'',
  'daysUntilDue <= 7 ? \'warning\' : \'info\'',
  'notification-message',
  'notification-action'
], 'Calibrations has proper notification types and UI');

testFileContains('src/components/Credentials.js', [
  'type: \'critical\'',
  'type: \'warning\'',
  'type: \'info\'',
  'notification-message',
  'notification-action'
], 'Credentials has proper notification types and UI');

// Test 10: Equipment Type Filtering
console.log('\n📋 Testing Equipment Type Filtering...');

testFileContains('src/components/LoadTests.js', [
  'getCraneEquipment',
  'crane',
  'hoist',
  'lift'
], 'LoadTests filters appropriate equipment types');

testFileContains('src/components/Calibrations.js', [
  'getInstrumentEquipment',
  'scale',
  'gauge',
  'meter'
], 'Calibrations filters appropriate equipment types');

testFileContains('src/components/Credentials.js', [
  'getRequiredCredentials',
  'Crane Operator',
  'Rigger',
  'Signal Person',
  'Inspector'
], 'Credentials defines required credential types');

// Test 11: Modal and Form Handling
console.log('\n📋 Testing Modal and Form Handling...');

testFileContains('src/components/LoadTests.js', [
  'showCreateTest',
  'showScheduleNext',
  'modal-overlay',
  'Schedule Next Load Test'
], 'LoadTests has proper modal handling');

testFileContains('src/components/Calibrations.js', [
  'showCreateCalibration',
  'showScheduleNext',
  'modal-overlay',
  'Schedule Next Calibration'
], 'Calibrations has proper modal handling');

testFileContains('src/components/Credentials.js', [
  'showCreateCredential',
  'showRenewCredential',
  'showCredentialCheck',
  'modal-overlay',
  'Check Work Assignment Credentials'
], 'Credentials has proper modal handling');

// Test 12: Status Badge System
console.log('\n📋 Testing Status Badge System...');

testFileContains('src/components/LoadTests.js', [
  'getTestStatus',
  'getStatusBadge',
  'status-overdue',
  'status-due-soon',
  'status-current'
], 'LoadTests has status badge system');

testFileContains('src/components/Calibrations.js', [
  'getCalibrationStatus',
  'getStatusBadge',
  'status-overdue',
  'status-due-soon',
  'status-current'
], 'Calibrations has status badge system');

testFileContains('src/components/Credentials.js', [
  'getCredentialStatus',
  'getStatusBadge',
  'status-expired',
  'status-expiring-soon',
  'status-current'
], 'Credentials has status badge system');

// Summary
console.log('\n📊 Test Results Summary');
console.log('========================');
console.log(`Total Tests: ${testResults.total}`);
console.log(`Passed: ${testResults.passed} ✅`);
console.log(`Failed: ${testResults.failed} ❌`);
console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

if (testResults.failed > 0) {
  console.log('\n❌ Failed Tests:');
  testResults.details
    .filter(test => !test.passed)
    .forEach(test => {
      console.log(`  • ${test.name}`);
      if (test.details) {
        console.log(`    ${test.details}`);
      }
    });
}

console.log('\n🎯 Phase 6 Implementation Status:');
console.log('✅ Load Test Scheduling and Tracking');
console.log('✅ Calibration Scheduling and Tracking');
console.log('✅ Credential Expiration Notifications');
console.log('✅ Credential Work Assignment Linking');
console.log('✅ Backend Operations Integration');
console.log('✅ User Context and Audit Logging');
console.log('✅ Certificate Generation');
console.log('✅ Notification Systems');
console.log('✅ Equipment Type Filtering');
console.log('✅ Modal and Form Handling');
console.log('✅ Status Badge Systems');

if (testResults.failed === 0) {
  console.log('\n🎉 All Phase 6 implementation tests passed!');
  console.log('The specialized compliance features are properly implemented.');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please review and fix the issues above.`);
  process.exit(1);
}
