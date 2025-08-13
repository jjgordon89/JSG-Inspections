// Phase 6 - Verification Test
// This test verifies that the dependency cleanup was successful

const fs = require('fs');
const path = require('path');

console.log('=== Phase 6: Verification Test ===\n');

// Test 1: Verify package.json changes
console.log('1. Verifying package.json changes...');
const packagePath = path.join(__dirname, 'package.json');
const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const hasReactQuery = packageContent.dependencies['react-query'] !== undefined;
const hasReactRouter = packageContent.dependencies['react-router-dom'] !== undefined;

console.log(`   - react-query removed: ${!hasReactQuery ? '✅' : '❌'}`);
console.log(`   - react-router-dom removed: ${!hasReactRouter ? '✅' : '❌'}`);

// Test 2: Verify index.js changes
console.log('\n2. Verifying index.js changes...');
const indexPath = path.join(__dirname, 'src', 'index.js');
const indexContent = fs.readFileSync(indexPath, 'utf8');

const hasRouterImport = indexContent.includes('BrowserRouter');
const hasQueryImport = indexContent.includes('react-query');
const hasQueryProvider = indexContent.includes('QueryClientProvider');
const hasRouterUsage = indexContent.includes('<BrowserRouter>');

console.log(`   - BrowserRouter import removed: ${!hasRouterImport ? '✅' : '❌'}`);
console.log(`   - react-query import removed: ${!hasQueryImport ? '✅' : '❌'}`);
console.log(`   - QueryClientProvider removed: ${!hasQueryProvider ? '✅' : '❌'}`);
console.log(`   - BrowserRouter usage removed: ${!hasRouterUsage ? '✅' : '❌'}`);

// Test 3: Verify Dashboard.js changes
console.log('\n3. Verifying Dashboard.js changes...');
const dashboardPath = path.join(__dirname, 'src', 'components', 'Dashboard.js');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

const hasUseQueryImport = dashboardContent.includes("from 'react-query'");
const hasUseQueryUsage = dashboardContent.includes('useQuery(');
const hasUseState = dashboardContent.includes('useState');
const hasUseEffect = dashboardContent.includes('useEffect');

console.log(`   - react-query import removed: ${!hasUseQueryImport ? '✅' : '❌'}`);
console.log(`   - useQuery usage removed: ${!hasUseQueryUsage ? '✅' : '❌'}`);
console.log(`   - useState added: ${hasUseState ? '✅' : '❌'}`);
console.log(`   - useEffect added: ${hasUseEffect ? '✅' : '❌'}`);

// Test 4: Check for syntax errors
console.log('\n4. Checking for syntax errors...');
try {
  // Try to parse the files to check for syntax errors
  require('./src/index.js');
  console.log('   - index.js syntax: ✅ Valid');
} catch (err) {
  console.log('   - index.js syntax: ❌ Error -', err.message);
}

// Test 5: Count remaining dependencies
console.log('\n5. Dependency count analysis...');
const depCount = Object.keys(packageContent.dependencies).length;
const devDepCount = Object.keys(packageContent.devDependencies).length;

console.log(`   - Production dependencies: ${depCount}`);
console.log(`   - Development dependencies: ${devDepCount}`);
console.log(`   - Total dependencies: ${depCount + devDepCount}`);

// Summary
console.log('\n=== Phase 6 Summary ===');
const allTestsPassed = !hasReactQuery && !hasReactRouter && !hasRouterImport && 
                      !hasQueryImport && !hasQueryProvider && !hasRouterUsage &&
                      !hasUseQueryImport && !hasUseQueryUsage && hasUseState && hasUseEffect;

console.log(`Status: ${allTestsPassed ? '✅ All tests passed' : '❌ Some tests failed'}`);
console.log('Changes made:');
console.log('  - Removed react-query dependency and replaced with useState/useEffect');
console.log('  - Removed react-router-dom dependency (unused)');
console.log('  - Simplified index.js to remove unused providers');
console.log('  - Updated Dashboard.js to use native React hooks');

console.log('\n=== Phase 6 Test Complete ===');
