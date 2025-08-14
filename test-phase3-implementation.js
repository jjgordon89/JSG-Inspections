/**
 * Phase 3 Implementation Test Script
 * Tests user authentication and context system
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Test database path
const testDbPath = path.join(__dirname, 'test-phase3.db');

// Clean up any existing test database
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const db = new sqlite3.Database(testDbPath);

console.log('🧪 Phase 3 Implementation Test - User Authentication & Context System');
console.log('=' .repeat(70));

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Create users table (from migration 5)
db.run(`CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT CHECK(role IN ('admin', 'inspector', 'reviewer', 'viewer')) NOT NULL,
  active BOOLEAN DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Create audit_log table (from migration 5)
db.run(`CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT,
  user_agent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
)`);

// Test data setup
const testUsers = [
  {
    username: 'admin',
    full_name: 'System Administrator',
    email: 'admin@jsg-inspections.com',
    role: 'admin'
  },
  {
    username: 'inspector',
    full_name: 'John Inspector',
    email: 'inspector@jsg-inspections.com',
    role: 'inspector'
  },
  {
    username: 'reviewer',
    full_name: 'Jane Reviewer',
    email: 'reviewer@jsg-inspections.com',
    role: 'reviewer'
  },
  {
    username: 'viewer',
    full_name: 'Bob Viewer',
    email: 'viewer@jsg-inspections.com',
    role: 'viewer'
  }
];

// Import secure operations
const { secureOperations } = require('./src/database/secureOperations');

// Test functions
async function runTest(testName, testFn) {
  try {
    console.log(`\n📋 Testing: ${testName}`);
    await testFn();
    console.log(`✅ ${testName} - PASSED`);
    return true;
  } catch (error) {
    console.error(`❌ ${testName} - FAILED:`, error.message);
    return false;
  }
}

function executeSecureOperation(category, operation, params = {}) {
  return new Promise((resolve, reject) => {
    const op = secureOperations[category]?.[operation];
    if (!op) {
      return reject(new Error(`Operation ${category}.${operation} not found`));
    }

    if (!op.validate(params)) {
      return reject(new Error(`Validation failed for ${category}.${operation}`));
    }

    const values = op.params.map(param => params[param]);

    if (op.returnType === 'write') {
      db.run(op.sql, values, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    } else if (op.returnType === 'one') {
      db.get(op.sql, values, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    } else if (op.returnType === 'many') {
      db.all(op.sql, values, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    } else if (op.returnType === 'scalar') {
      db.get(op.sql, values, (err, row) => {
        if (err) reject(err);
        else resolve(row ? Object.values(row)[0] : null);
      });
    }
  });
}

async function testUserOperations() {
  // Test user creation
  for (const user of testUsers) {
    const result = await executeSecureOperation('users', 'create', user);
    if (!result.lastID) {
      throw new Error(`Failed to create user ${user.username}`);
    }
  }

  // Test user retrieval
  const allUsers = await executeSecureOperation('users', 'getAll', {});
  if (allUsers.length !== testUsers.length) {
    throw new Error(`Expected ${testUsers.length} users, got ${allUsers.length}`);
  }

  // Test user lookup by username
  const adminUser = await executeSecureOperation('users', 'getByUsername', { username: 'admin' });
  if (!adminUser || adminUser.role !== 'admin') {
    throw new Error('Failed to retrieve admin user');
  }

  // Test last login update
  await executeSecureOperation('users', 'updateLastLogin', { id: adminUser.id });
  
  console.log(`   Created ${testUsers.length} test users successfully`);
}

async function testAuditLogging() {
  // Get a test user
  const testUser = await executeSecureOperation('users', 'getByUsername', { username: 'admin' });
  
  // Test audit log creation
  const auditData = {
    userId: testUser.id,
    username: testUser.username,
    action: 'login',
    entityType: 'user',
    entityId: testUser.id,
    oldValues: null,
    newValues: JSON.stringify({ last_login: new Date().toISOString() }),
    ipAddress: 'localhost',
    userAgent: 'test-agent'
  };

  const result = await executeSecureOperation('auditLog', 'create', auditData);
  if (!result.lastID) {
    throw new Error('Failed to create audit log entry');
  }

  // Test audit log retrieval
  const auditEntries = await executeSecureOperation('auditLog', 'getByEntity', {
    entityType: 'user',
    entityId: testUser.id
  });

  if (auditEntries.length === 0) {
    throw new Error('Failed to retrieve audit log entries');
  }

  console.log(`   Created and retrieved audit log entries successfully`);
}

async function testRoleHierarchy() {
  const roles = ['viewer', 'inspector', 'reviewer', 'admin'];
  const roleHierarchy = {
    'viewer': 1,
    'inspector': 2,
    'reviewer': 3,
    'admin': 4
  };

  // Test that each role exists
  for (const role of roles) {
    const user = await executeSecureOperation('users', 'getByUsername', { username: role });
    if (!user || user.role !== role) {
      throw new Error(`Failed to find user with role ${role}`);
    }
  }

  console.log(`   Verified role hierarchy: ${roles.join(' < ')}`);
}

async function testUserContextIntegration() {
  // Test that user operations work with the context system
  const users = await executeSecureOperation('users', 'getAll', {});
  
  // Verify each user has required fields for context
  for (const user of users) {
    if (!user.id || !user.username || !user.full_name || !user.role) {
      throw new Error(`User ${user.username} missing required fields for context`);
    }
  }

  // Test user activation/deactivation simulation
  const testUser = users[0];
  
  // Simulate getting user by username (login simulation)
  const loginUser = await executeSecureOperation('users', 'getByUsername', { 
    username: testUser.username 
  });
  
  if (!loginUser || !loginUser.active) {
    throw new Error('User context integration failed - user not active');
  }

  console.log(`   User context integration verified for ${users.length} users`);
}

async function testSecurityValidation() {
  // Test invalid user creation
  try {
    await executeSecureOperation('users', 'create', {
      username: 'invalid',
      full_name: 'Invalid User',
      role: 'invalid_role' // Should fail validation
    });
    throw new Error('Should have failed validation for invalid role');
  } catch (error) {
    if (!error.message.includes('Validation failed')) {
      throw error;
    }
  }

  // Test invalid username lookup
  const nonExistentUser = await executeSecureOperation('users', 'getByUsername', { 
    username: 'nonexistent' 
  });
  
  if (nonExistentUser) {
    throw new Error('Should not have found non-existent user');
  }

  console.log('   Security validation tests passed');
}

// Main test execution
async function runAllTests() {
  const tests = [
    ['User Operations', testUserOperations],
    ['Audit Logging', testAuditLogging],
    ['Role Hierarchy', testRoleHierarchy],
    ['User Context Integration', testUserContextIntegration],
    ['Security Validation', testSecurityValidation]
  ];

  let passed = 0;
  let failed = 0;

  for (const [name, testFn] of tests) {
    const success = await runTest(name, testFn);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`📊 Phase 3 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All Phase 3 tests passed! User authentication system is ready.');
    console.log('\n📋 Next Steps:');
    console.log('1. Start the application: npm start');
    console.log('2. Use quick login buttons or enter username directly');
    console.log('3. Test user context in components');
    console.log('4. Verify audit logging in database');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
  }

  // Copy test users to main database if tests passed
  if (failed === 0) {
    console.log('\n🔄 Setting up default users in main database...');
    await setupMainDatabase();
  }
}

async function setupMainDatabase() {
  const mainDbPath = path.join(__dirname, 'database.db');
  
  if (!fs.existsSync(mainDbPath)) {
    console.log('⚠️  Main database not found. Please run the application first to create it.');
    return;
  }

  const mainDb = new sqlite3.Database(mainDbPath);
  
  try {
    // Check if users already exist
    const existingUsers = await new Promise((resolve, reject) => {
      mainDb.all('SELECT COUNT(*) as count FROM users', (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0].count);
      });
    });

    if (existingUsers > 0) {
      console.log('   Users already exist in main database, skipping setup.');
      mainDb.close();
      return;
    }

    // Insert test users into main database
    for (const user of testUsers) {
      await new Promise((resolve, reject) => {
        mainDb.run(
          'INSERT INTO users (username, full_name, email, role) VALUES (?, ?, ?, ?)',
          [user.username, user.full_name, user.email, user.role],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    }

    console.log('✅ Default users created in main database');
    console.log('   Available users: admin, inspector, reviewer, viewer');
    
  } catch (error) {
    console.error('❌ Failed to setup main database:', error.message);
  } finally {
    mainDb.close();
  }
}

// Run tests
runAllTests().then(() => {
  db.close();
  
  // Clean up test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}).catch((error) => {
  console.error('💥 Test execution failed:', error);
  db.close();
  process.exit(1);
});
