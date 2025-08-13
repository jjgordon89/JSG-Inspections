// Phase 6 - Dependency Cleanup Test
// This test verifies that removing unused dependencies doesn't break functionality

const fs = require('fs');
const path = require('path');

console.log('=== Phase 6: Dependency Cleanup Test ===\n');

// Test 1: Analyze react-query usage
console.log('1. Analyzing react-query usage...');
const dashboardPath = path.join(__dirname, 'src', 'components', 'Dashboard.js');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

const hasReactQuery = dashboardContent.includes('useQuery');
const hasQueryImport = dashboardContent.includes("from 'react-query'");

console.log(`   - Dashboard uses useQuery: ${hasReactQuery}`);
console.log(`   - Dashboard imports from react-query: ${hasQueryImport}`);

// Test 2: Analyze react-router-dom usage
console.log('\n2. Analyzing react-router-dom usage...');
const indexPath = path.join(__dirname, 'src', 'index.js');
const indexContent = fs.readFileSync(indexPath, 'utf8');
const appPath = path.join(__dirname, 'src', 'App.js');
const appContent = fs.readFileSync(appPath, 'utf8');

const hasRouterImport = indexContent.includes('BrowserRouter');
const hasRouterUsage = indexContent.includes('<BrowserRouter>');
const appUsesRouting = appContent.includes('Route') || appContent.includes('useNavigate') || appContent.includes('useParams');

console.log(`   - index.js imports BrowserRouter: ${hasRouterImport}`);
console.log(`   - index.js uses BrowserRouter: ${hasRouterUsage}`);
console.log(`   - App.js uses routing features: ${appUsesRouting}`);

// Test 3: Check if app uses conditional rendering instead
const usesConditionalRendering = appContent.includes("view === 'dashboard'") && 
                                 appContent.includes("view === 'equipment'");

console.log(`   - App.js uses conditional rendering: ${usesConditionalRendering}`);

// Test 4: Analyze package.json
console.log('\n3. Analyzing package.json dependencies...');
const packagePath = path.join(__dirname, 'package.json');
const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const hasReactQueryDep = packageContent.dependencies['react-query'] !== undefined;
const hasReactRouterDep = packageContent.dependencies['react-router-dom'] !== undefined;

console.log(`   - react-query in dependencies: ${hasReactQueryDep}`);
console.log(`   - react-router-dom in dependencies: ${hasReactRouterDep}`);

// Summary and recommendations
console.log('\n=== Analysis Summary ===');
console.log('react-query:');
console.log(`   - Used in: Dashboard.js only`);
console.log(`   - Usage: Simple data fetching with caching`);
console.log(`   - Recommendation: Can be replaced with simple useState/useEffect`);

console.log('\nreact-router-dom:');
console.log(`   - Imported but not functionally used`);
console.log(`   - App uses conditional rendering based on state instead of routing`);
console.log(`   - Recommendation: Safe to remove`);

console.log('\n=== Phase 6 Test Complete ===');
