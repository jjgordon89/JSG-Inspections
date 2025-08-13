const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const MigrationManager = require('./src/database/migrationManager');

// Mock Electron app object
const mockApp = {
  getPath: (type) => {
    if (type === 'userData') {
      return path.join(__dirname, 'test-data');
    }
    return __dirname;
  }
};

// Test migrations
const testMigrations = {
  1: (db, callback) => {
    console.log('Test migration 1: Adding test_column');
    db.run('ALTER TABLE test_table ADD COLUMN test_column TEXT', callback);
  },
  2: (db, callback) => {
    console.log('Test migration 2: Adding another_column');
    db.run('ALTER TABLE test_table ADD COLUMN another_column INTEGER', callback);
  }
};

async function runTests() {
  console.log('=== Phase 9 Migration System Tests ===\n');
  
  const testDataDir = path.join(__dirname, 'test-data');
  const testDbPath = path.join(testDataDir, 'database.db');
  const backupDir = path.join(testDataDir, 'backups');
  
  // Clean up any existing test data
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
  
  // Create test data directory
  fs.mkdirSync(testDataDir, { recursive: true });
  
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
  
  try {
    // Test 1: MigrationManager initialization
    console.log('1. Testing MigrationManager initialization...');
    const migrationManager = new MigrationManager(mockApp);
    test('MigrationManager created successfully', migrationManager instanceof MigrationManager);
    test('Backup directory created', fs.existsSync(backupDir));
    
    // Test 2: Database setup and initial migration
    console.log('\n2. Testing database setup and migration...');
    const db = new sqlite3.Database(testDbPath);
    
    // Create a test table
    await new Promise((resolve, reject) => {
      db.run('CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT)', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Run migrations
    const result1 = await migrationManager.runMigrations(db, testMigrations, 2);
    test('Migration completed successfully', result1.success === true);
    test('Backup was created', result1.backupPath !== null);
    test('Backup file exists', fs.existsSync(result1.backupPath));
    
    // Test 3: Verify schema version
    console.log('\n3. Testing schema version tracking...');
    const currentVersion = await migrationManager.getCurrentSchemaVersion(db);
    test('Schema version is correct', currentVersion === 2);
    
    // Test 4: Verify columns were added
    console.log('\n4. Testing migration effects...');
    const tableInfo = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(test_table)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const columnNames = tableInfo.map(col => col.name);
    test('test_column was added', columnNames.includes('test_column'));
    test('another_column was added', columnNames.includes('another_column'));
    
    // Test 5: Test idempotent migrations (running again should not fail)
    console.log('\n5. Testing idempotent migrations...');
    const result2 = await migrationManager.runMigrations(db, testMigrations, 2);
    test('Second migration run succeeds', result2.success === true);
    test('No backup created for up-to-date database', result2.backupPath === null);
    
    // Test 6: Test backup cleanup
    console.log('\n6. Testing backup cleanup...');
    // Create some dummy backup files
    for (let i = 0; i < 15; i++) {
      const dummyBackup = path.join(backupDir, `database-backup-2025-01-${i.toString().padStart(2, '0')}T10-00-00-000Z.db`);
      fs.writeFileSync(dummyBackup, 'dummy data');
    }
    
    const backupsBefore = fs.readdirSync(backupDir).filter(f => f.startsWith('database-backup-')).length;
    await migrationManager.cleanupOldBackups(10);
    const backupsAfter = fs.readdirSync(backupDir).filter(f => f.startsWith('database-backup-')).length;
    
    test('Backup cleanup works', backupsAfter <= 10);
    test('Some backups were removed', backupsBefore > backupsAfter);
    
    // Test 7: Test backup info retrieval
    console.log('\n7. Testing backup info retrieval...');
    const backupInfo = migrationManager.getBackupInfo();
    test('Backup info retrieved', Array.isArray(backupInfo));
    test('Backup info has correct structure', backupInfo.length > 0 && backupInfo[0].hasOwnProperty('name'));
    
    // Test 8: Test migration logging
    console.log('\n8. Testing migration logging...');
    const logPath = path.join(testDataDir, 'migration.log');
    test('Migration log file exists', fs.existsSync(logPath));
    
    const logContent = fs.readFileSync(logPath, 'utf8');
    test('Log contains migration entries', logContent.includes('Starting migration'));
    test('Log contains completion entries', logContent.includes('completed successfully'));
    
    // Close database
    await new Promise((resolve) => {
      db.close(resolve);
    });
    
    console.log(`\n=== Test Results ===`);
    console.log(`Passed: ${testsPassed}/${totalTests} tests`);
    
    if (testsPassed === totalTests) {
      console.log('🎉 All migration system tests passed!');
      return true;
    } else {
      console.log('❌ Some tests failed');
      return false;
    }
    
  } catch (error) {
    console.error('Test execution failed:', error);
    return false;
  } finally {
    // Clean up test data
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runTests };
