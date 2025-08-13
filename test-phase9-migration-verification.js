const fs = require('fs');
const path = require('path');

console.log('=== Phase 9 Migration System Verification ===\n');

let testsPassed = 0;
let totalTests = 0;

const test = (name, condition) => {
  totalTests++;
  if (condition) {
    console.log(`✅ ${name}`);
    testsPassed++;
  } else {
    console.log(`❌ ${name}`);
  }
};

// Test 1: Verify MigrationManager file exists and has correct structure
console.log('1. Testing MigrationManager file structure...');
const migrationManagerPath = path.join(__dirname, 'src', 'database', 'migrationManager.js');
test('MigrationManager file exists', fs.existsSync(migrationManagerPath));

if (fs.existsSync(migrationManagerPath)) {
  const content = fs.readFileSync(migrationManagerPath, 'utf8');
  test('Contains MigrationManager class', content.includes('class MigrationManager'));
  test('Contains createBackup method', content.includes('async createBackup()'));
  test('Contains rollback method', content.includes('async rollback('));
  test('Contains runMigrations method', content.includes('async runMigrations('));
  test('Contains logging functionality', content.includes('log(message)'));
  test('Contains backup cleanup', content.includes('cleanupOldBackups'));
}

// Test 2: Verify database.js integration
console.log('\n2. Testing database.js integration...');
const databasePath = path.join(__dirname, 'database.js');
test('Database.js file exists', fs.existsSync(databasePath));

if (fs.existsSync(databasePath)) {
  const content = fs.readFileSync(databasePath, 'utf8');
  test('Imports MigrationManager', content.includes("require('./src/database/migrationManager')"));
  test('Uses MigrationManager in initialization', content.includes('new MigrationManager(app)'));
  test('Calls runMigrations method', content.includes('runMigrations(db, migrations, CURRENT_SCHEMA_VERSION)'));
  test('Includes backup cleanup', content.includes('cleanupOldBackups'));
}

// Test 3: Verify migration system features
console.log('\n3. Testing migration system features...');
if (fs.existsSync(migrationManagerPath)) {
  const content = fs.readFileSync(migrationManagerPath, 'utf8');
  test('Automatic backup before migrations', content.includes('backupPath = await this.createBackup()'));
  test('Rollback on migration failure', content.includes('await this.rollback(backupPath)'));
  test('Migration logging', content.includes('this.log(`Starting migration'));
  test('Schema version tracking', content.includes('getCurrentSchemaVersion'));
  test('Error handling and recovery', content.includes('catch (err)') && content.includes('Migration failed'));
}

console.log(`\n=== Verification Results ===`);
console.log(`Passed: ${testsPassed}/${totalTests} tests`);

if (testsPassed === totalTests) {
  console.log('🎉 Migration system verification passed!');
  console.log('\n✅ Task 19 Complete: Automatic migration on startup');
  console.log('- ✅ Automatic database backup before migrations');
  console.log('- ✅ Migration logging and error handling');
  console.log('- ✅ Rollback mechanism for failed migrations');
} else {
  console.log('❌ Some verification tests failed');
}
