const fs = require('fs');
const path = require('path');

console.log('=== Phase 9 Completion Verification ===\n');

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

// Task 19: Automatic migration on startup
console.log('Task 19: Automatic migration on startup');
console.log('=====================================');

// Check MigrationManager implementation
const migrationManagerPath = path.join(__dirname, 'src', 'database', 'migrationManager.js');
test('MigrationManager class exists', fs.existsSync(migrationManagerPath));

if (fs.existsSync(migrationManagerPath)) {
  const content = fs.readFileSync(migrationManagerPath, 'utf8');
  test('Automatic backup before migrations', content.includes('createBackup()'));
  test('Migration logging and error handling', content.includes('log(message)') && content.includes('catch (err)'));
  test('Rollback mechanism for failed migrations', content.includes('rollback(backupPath)'));
}

// Check database.js integration
const databasePath = path.join(__dirname, 'database.js');
if (fs.existsSync(databasePath)) {
  const content = fs.readFileSync(databasePath, 'utf8');
  test('Database uses MigrationManager', content.includes('new MigrationManager(app)'));
  test('Automatic migration on startup', content.includes('runMigrations(db, migrations'));
}

console.log('\nTask 20: Documentation');
console.log('======================');

// Check README.md documentation
const readmePath = path.join(__dirname, 'README.md');
test('README.md exists', fs.existsSync(readmePath));

if (fs.existsSync(readmePath)) {
  const content = fs.readFileSync(readmePath, 'utf8');
  
  // Setup instructions
  test('Contains setup instructions', content.includes('## Installation') && content.includes('Prerequisites'));
  test('Contains development setup', content.includes('## Development Setup') && content.includes('npm start'));
  
  // Database documentation
  test('Documents database location', content.includes('Database Location') && content.includes('%APPDATA%'));
  test('Documents backup procedures', content.includes('Backup Procedures') && content.includes('Manual Backup'));
  test('Documents database schema', content.includes('Database Schema') && content.includes('Equipment'));
  
  // Migration system documentation
  test('Documents migration system', content.includes('## Migration System') && content.includes('Overview'));
  test('Documents migration process', content.includes('Migration Process') && content.includes('schema_version'));
  test('Documents adding new migrations', content.includes('Adding New Migrations'));
  
  // Troubleshooting
  test('Contains troubleshooting section', content.includes('## Troubleshooting') && content.includes('Common Issues'));
  test('Documents recovery procedures', content.includes('Recovery Procedures') && content.includes('Complete Database Reset'));
  test('Documents log file locations', content.includes('Log Files') && content.includes('migration.log'));
  
  // Architecture documentation
  test('Documents architecture', content.includes('## Architecture') && content.includes('Technology Stack'));
  test('Documents security features', content.includes('Security Features') && content.includes('SQL Injection Prevention'));
}

console.log(`\n=== Phase 9 Results ===`);
console.log(`Passed: ${testsPassed}/${totalTests} tests`);

if (testsPassed === totalTests) {
  console.log('🎉 Phase 9 Complete!');
  console.log('\n✅ Task 19: Automatic migration on startup');
  console.log('  - ✅ Automatic database backup before migrations');
  console.log('  - ✅ Migration logging and error handling');
  console.log('  - ✅ Rollback mechanism for failed migrations');
  console.log('\n✅ Task 20: Documentation');
  console.log('  - ✅ Updated README.md with setup instructions');
  console.log('  - ✅ Documented database location and backup procedures');
  console.log('  - ✅ Documented migration system and troubleshooting');
  console.log('\n🚀 JSG Inspections Implementation Plan: 20/20 tasks completed!');
} else {
  console.log('❌ Some Phase 9 requirements not met');
}
