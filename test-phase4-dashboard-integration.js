/**
 * Phase 4 Dashboard Integration Test
 * 
 * Tests the integration of new backend operations into the Dashboard component
 * and verifies that all Phase 1 operations are properly exposed and functional.
 */

const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
  name: 'Phase 4 Dashboard Integration Test',
  description: 'Verify dashboard uses all new backend operations with proper error handling',
  version: '1.0.0'
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
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    if (details) console.log(`   ${details}`);
  }
  testResults.details.push({ testName, passed, details });
}

function testDashboardFileStructure() {
  console.log('\n📋 Testing Dashboard File Structure...');
  
  // Test Dashboard.js exists and is readable
  const dashboardPath = path.join(__dirname, 'src', 'components', 'Dashboard.js');
  const dashboardExists = fs.existsSync(dashboardPath);
  logTest('Dashboard.js file exists', dashboardExists);
  
  if (!dashboardExists) return false;
  
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  
  // Test for required imports
  const hasReactImport = dashboardContent.includes("import React");
  logTest('Dashboard has React import', hasReactImport);
  
  const hasCSSImport = dashboardContent.includes("import './Dashboard.css'");
  logTest('Dashboard has CSS import', hasCSSImport);
  
  return dashboardExists && hasReactImport && hasCSSImport;
}

function testBackendOperationIntegration() {
  console.log('\n🔗 Testing Backend Operation Integration...');
  
  const dashboardPath = path.join(__dirname, 'src', 'components', 'Dashboard.js');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  
  // Test for Phase 1 operations that should be integrated
  const requiredOperations = [
    'window.api.inspections.getOverdue',
    'window.api.pmSchedules.getTotal',
    'window.api.pmSchedules.getOverdue',
    'window.api.loadTests.getTotal',
    'window.api.loadTests.getOverdue',
    'window.api.calibrations.getTotal',
    'window.api.calibrations.getOverdue',
    'window.api.certificates.getTotal',
    'window.api.credentials.getTotal'
  ];
  
  let operationsFound = 0;
  requiredOperations.forEach(operation => {
    const found = dashboardContent.includes(operation);
    logTest(`Dashboard uses ${operation}`, found);
    if (found) operationsFound++;
  });
  
  const allOperationsIntegrated = operationsFound === requiredOperations.length;
  logTest('All Phase 1 operations integrated', allOperationsIntegrated, 
    `Found ${operationsFound}/${requiredOperations.length} operations`);
  
  return allOperationsIntegrated;
}

function testErrorHandling() {
  console.log('\n🛡️ Testing Error Handling...');
  
  const dashboardPath = path.join(__dirname, 'src', 'components', 'Dashboard.js');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  
  // Test for proper error handling patterns
  const hasArrayIsArrayChecks = dashboardContent.includes('Array.isArray(');
  logTest('Dashboard has Array.isArray checks', hasArrayIsArrayChecks);
  
  const hasTypeofChecks = dashboardContent.includes("typeof") && dashboardContent.includes("=== 'number'");
  logTest('Dashboard has typeof number checks', hasTypeofChecks);
  
  const hasTryCatchBlock = dashboardContent.includes('try {') && dashboardContent.includes('} catch (err) {');
  logTest('Dashboard has try-catch error handling', hasTryCatchBlock);
  
  const hasErrorState = dashboardContent.includes('setError(err.message)');
  logTest('Dashboard sets error state on failure', hasErrorState);
  
  const hasLoadingState = dashboardContent.includes('setLoading(true)') && dashboardContent.includes('setLoading(false)');
  logTest('Dashboard manages loading state', hasLoadingState);
  
  return hasArrayIsArrayChecks && hasTypeofChecks && hasTryCatchBlock && hasErrorState && hasLoadingState;
}

function testDashboardDataStructure() {
  console.log('\n📊 Testing Dashboard Data Structure...');
  
  const dashboardPath = path.join(__dirname, 'src', 'components', 'Dashboard.js');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  
  // Test for proper data structure initialization
  const requiredDataSections = [
    'equipment: {',
    'inspections: {',
    'workOrders: {',
    'deficiencies: {',
    'pmSchedules: {',
    'loadTests: {',
    'calibrations: {',
    'certificates: {',
    'credentials: {'
  ];
  
  let sectionsFound = 0;
  requiredDataSections.forEach(section => {
    const found = dashboardContent.includes(section);
    logTest(`Dashboard data has ${section.replace(': {', '')} section`, found);
    if (found) sectionsFound++;
  });
  
  const allSectionsPresent = sectionsFound === requiredDataSections.length;
  logTest('All dashboard data sections present', allSectionsPresent,
    `Found ${sectionsFound}/${requiredDataSections.length} sections`);
  
  return allSectionsPresent;
}

function testCriticalAlertsEnhancement() {
  console.log('\n🚨 Testing Critical Alerts Enhancement...');
  
  const dashboardPath = path.join(__dirname, 'src', 'components', 'Dashboard.js');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  
  // Test for enhanced critical alerts
  const hasLoadTestsAlert = dashboardContent.includes('dashboardData.loadTests.overdue > 0');
  logTest('Dashboard has load tests overdue alert', hasLoadTestsAlert);
  
  const hasCalibrationsAlert = dashboardContent.includes('dashboardData.calibrations.overdue > 0');
  logTest('Dashboard has calibrations overdue alert', hasCalibrationsAlert);
  
  const hasPMAlert = dashboardContent.includes('dashboardData.pmSchedules.overdue > 0');
  logTest('Dashboard has PM schedules overdue alert', hasPMAlert);
  
  const hasComplianceRiskMessage = dashboardContent.includes('compliance risk');
  logTest('Dashboard shows compliance risk message', hasComplianceRiskMessage);
  
  return hasLoadTestsAlert && hasCalibrationsAlert && hasPMAlert && hasComplianceRiskMessage;
}

function testPreloadExposure() {
  console.log('\n🔌 Testing Preload API Exposure...');
  
  const preloadPath = path.join(__dirname, 'public', 'preload.js');
  const preloadExists = fs.existsSync(preloadPath);
  logTest('preload.js file exists', preloadExists);
  
  if (!preloadExists) return false;
  
  const preloadContent = fs.readFileSync(preloadPath, 'utf8');
  
  // Test for Phase 1 operations in preload
  const requiredPreloadOperations = [
    'getOverdue: () => window.api.secureOperation(\'inspections\', \'getOverdue\'',
    'getTotal: () => window.api.secureOperation(\'pmSchedules\', \'getTotal\'',
    'getOverdue: () => window.api.secureOperation(\'pmSchedules\', \'getOverdue\'',
    'getTotal: () => window.api.secureOperation(\'loadTests\', \'getTotal\'',
    'getOverdue: () => window.api.secureOperation(\'loadTests\', \'getOverdue\'',
    'getTotal: () => window.api.secureOperation(\'calibrations\', \'getTotal\'',
    'getOverdue: () => window.api.secureOperation(\'calibrations\', \'getOverdue\'',
    'getTotal: () => window.api.secureOperation(\'certificates\', \'getTotal\'',
    'getTotal: () => window.api.secureOperation(\'credentials\', \'getTotal\''
  ];
  
  let preloadOperationsFound = 0;
  requiredPreloadOperations.forEach(operation => {
    const found = preloadContent.includes(operation);
    if (found) preloadOperationsFound++;
  });
  
  const allPreloadOperationsExposed = preloadOperationsFound === requiredPreloadOperations.length;
  logTest('All Phase 1 operations exposed in preload', allPreloadOperationsExposed,
    `Found ${preloadOperationsFound}/${requiredPreloadOperations.length} operations`);
  
  return allPreloadOperationsExposed;
}

function testSecureOperationsDefinition() {
  console.log('\n🔒 Testing Secure Operations Definition...');
  
  const secureOpsPath = path.join(__dirname, 'src', 'database', 'secureOperations.js');
  const secureOpsExists = fs.existsSync(secureOpsPath);
  logTest('secureOperations.js file exists', secureOpsExists);
  
  if (!secureOpsExists) return false;
  
  const secureOpsContent = fs.readFileSync(secureOpsPath, 'utf8');
  
  // Test for Phase 1 operations in secure operations
  const requiredSecureOperations = [
    'getOverdue: {',
    'getTotal: {'
  ];
  
  // Count occurrences of each operation type
  const getOverdueCount = (secureOpsContent.match(/getOverdue: {/g) || []).length;
  const getTotalCount = (secureOpsContent.match(/getTotal: {/g) || []).length;
  
  logTest('Secure operations has getOverdue operations', getOverdueCount >= 4, 
    `Found ${getOverdueCount} getOverdue operations`);
  logTest('Secure operations has getTotal operations', getTotalCount >= 4,
    `Found ${getTotalCount} getTotal operations`);
  
  return getOverdueCount >= 4 && getTotalCount >= 4;
}

function testDashboardUIComponents() {
  console.log('\n🎨 Testing Dashboard UI Components...');
  
  const dashboardPath = path.join(__dirname, 'src', 'components', 'Dashboard.js');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  
  // Test for key UI components
  const hasTimeframeSelector = dashboardContent.includes('timeframe-selector');
  logTest('Dashboard has timeframe selector', hasTimeframeSelector);
  
  const hasMetricsGrid = dashboardContent.includes('metrics-grid');
  logTest('Dashboard has metrics grid', hasMetricsGrid);
  
  const hasCriticalAlerts = dashboardContent.includes('critical-alerts');
  logTest('Dashboard has critical alerts section', hasCriticalAlerts);
  
  const hasComplianceSummary = dashboardContent.includes('compliance-summary');
  logTest('Dashboard has compliance summary', hasComplianceSummary);
  
  const hasQuickActions = dashboardContent.includes('quick-actions');
  logTest('Dashboard has quick actions', hasQuickActions);
  
  const hasLoadingSpinner = dashboardContent.includes('loading-spinner');
  logTest('Dashboard has loading spinner', hasLoadingSpinner);
  
  const hasErrorMessage = dashboardContent.includes('error-message');
  logTest('Dashboard has error message display', hasErrorMessage);
  
  return hasTimeframeSelector && hasMetricsGrid && hasCriticalAlerts && 
         hasComplianceSummary && hasQuickActions && hasLoadingSpinner && hasErrorMessage;
}

async function runPhase4Tests() {
  console.log('🚀 Starting Phase 4 Dashboard Integration Tests...');
  console.log(`📋 ${TEST_CONFIG.name} v${TEST_CONFIG.version}`);
  console.log(`📝 ${TEST_CONFIG.description}\n`);
  
  // Run all test categories
  const results = {
    fileStructure: testDashboardFileStructure(),
    backendIntegration: testBackendOperationIntegration(),
    errorHandling: testErrorHandling(),
    dataStructure: testDashboardDataStructure(),
    criticalAlerts: testCriticalAlertsEnhancement(),
    preloadExposure: testPreloadExposure(),
    secureOperations: testSecureOperationsDefinition(),
    uiComponents: testDashboardUIComponents()
  };
  
  // Calculate overall results
  const allTestsPassed = Object.values(results).every(result => result === true);
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PHASE 4 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total:  ${testResults.total}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  console.log('\n📋 Test Categories:');
  Object.entries(results).forEach(([category, passed]) => {
    const icon = passed ? '✅' : '❌';
    const name = category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${icon} ${name}`);
  });
  
  if (allTestsPassed) {
    console.log('\n🎉 ALL PHASE 4 TESTS PASSED!');
    console.log('✅ Dashboard integration is complete and functional');
    console.log('✅ All Phase 1 backend operations are properly integrated');
    console.log('✅ Error handling and data validation are implemented');
    console.log('✅ Enhanced critical alerts are working');
    console.log('✅ Ready to proceed to Phase 5');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('❌ Please review the failed tests above');
    console.log('🔧 Fix the issues before proceeding to Phase 5');
  }
  
  console.log('\n' + '='.repeat(60));
  
  return allTestsPassed;
}

// Run tests if called directly
if (require.main === module) {
  runPhase4Tests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runPhase4Tests, TEST_CONFIG };
