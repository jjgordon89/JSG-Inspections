/**
 * P2 SQL Validation Test
 * This script validates the P2 database schema without requiring full package installation
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing P2 SQL Schema Validation...\n');

// Read the database.js file to extract migration SQL
function extractMigrationSQL() {
  try {
    const databaseContent = fs.readFileSync('./database.js', 'utf8');
    
    console.log('✅ Successfully read database.js file');
    
    // Check for P2 migration functions (v3, v4, v5)
    const hasV3Migration = databaseContent.includes('3: (db, callback)');
    const hasV4Migration = databaseContent.includes('4: (db, callback)');
    const hasV5Migration = databaseContent.includes('5: (db, callback)');
    
    console.log(`✅ Migration v3 found: ${hasV3Migration}`);
    console.log(`✅ Migration v4 found: ${hasV4Migration}`);
    console.log(`✅ Migration v5 found: ${hasV5Migration}`);
    
    // Check for P2 table creation SQL
    const p2Tables = [
      'work_orders',
      'pm_templates',
      'pm_schedules', 
      'meter_readings',
      'load_tests',
      'calibrations',
      'credentials',
      'template_items',
      'users',
      'audit_log',
      'certificates'
    ];
    
    console.log('\n🔍 Checking P2 table definitions...');
    
    for (const table of p2Tables) {
      const hasTable = databaseContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`);
      console.log(`${hasTable ? '✅' : '❌'} Table ${table}: ${hasTable ? 'Found' : 'Missing'}`);
    }
    
    // Check for column additions
    console.log('\n🔍 Checking P2 column additions...');
    
    const equipmentColumns = ['parent_id', 'site', 'building', 'bay', 'tagged_out'];
    for (const col of equipmentColumns) {
      const hasColumn = databaseContent.includes(`ADD COLUMN ${col}`);
      console.log(`${hasColumn ? '✅' : '❌'} Equipment column ${col}: ${hasColumn ? 'Found' : 'Missing'}`);
    }
    
    const documentColumns = ['hash', 'size', 'uploaded_by', 'uploaded_at'];
    for (const col of documentColumns) {
      const hasColumn = databaseContent.includes(`ADD COLUMN ${col}`);
      console.log(`${hasColumn ? '✅' : '❌'} Documents column ${col}: ${hasColumn ? 'Found' : 'Missing'}`);
    }
    
    // Check schema version
    const hasSchemaVersion5 = databaseContent.includes('CURRENT_SCHEMA_VERSION = 5');
    console.log(`\n${hasSchemaVersion5 ? '✅' : '❌'} Schema version set to 5: ${hasSchemaVersion5}`);
    
    return {
      hasV3Migration,
      hasV4Migration, 
      hasV5Migration,
      hasSchemaVersion5,
      tablesFound: p2Tables.filter(table => databaseContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`)).length,
      totalTables: p2Tables.length
    };
    
  } catch (error) {
    console.error('❌ Error reading database.js:', error.message);
    return null;
  }
}

// Validate secure operations
function validateSecureOperations() {
  try {
    const secureOpsContent = fs.readFileSync('./src/database/secureOperations.js', 'utf8');
    
    console.log('\n🔍 Checking P2 secure operations...');
    
    const p2Operations = [
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
    
    let foundOperations = 0;
    for (const op of p2Operations) {
      const hasOperation = secureOpsContent.includes(op);
      console.log(`${hasOperation ? '✅' : '❌'} Operation ${op.replace(':', '')}: ${hasOperation ? 'Found' : 'Missing'}`);
      if (hasOperation) foundOperations++;
    }
    
    return {
      operationsFound: foundOperations,
      totalOperations: p2Operations.length
    };
    
  } catch (error) {
    console.error('❌ Error reading secureOperations.js:', error.message);
    return null;
  }
}

// Validate preload API
function validatePreloadAPI() {
  try {
    const preloadContent = fs.readFileSync('./public/preload.js', 'utf8');
    
    console.log('\n🔍 Checking P2 preload API...');
    
    const p2APIs = [
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
    
    let foundAPIs = 0;
    for (const api of p2APIs) {
      const hasAPI = preloadContent.includes(api);
      console.log(`${hasAPI ? '✅' : '❌'} API ${api.replace(':', '')}: ${hasAPI ? 'Found' : 'Missing'}`);
      if (hasAPI) foundAPIs++;
    }
    
    return {
      apisFound: foundAPIs,
      totalAPIs: p2APIs.length
    };
    
  } catch (error) {
    console.error('❌ Error reading preload.js:', error.message);
    return null;
  }
}

// Run all validations
function runValidation() {
  console.log('🚀 Starting P2 Implementation Validation...\n');
  
  const migrationResults = extractMigrationSQL();
  const secureOpsResults = validateSecureOperations();
  const preloadResults = validatePreloadAPI();
  
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  
  if (migrationResults) {
    console.log(`📋 Database Migrations:`);
    console.log(`   - Migration v3: ${migrationResults.hasV3Migration ? '✅' : '❌'}`);
    console.log(`   - Migration v4: ${migrationResults.hasV4Migration ? '✅' : '❌'}`);
    console.log(`   - Migration v5: ${migrationResults.hasV5Migration ? '✅' : '❌'}`);
    console.log(`   - Schema Version 5: ${migrationResults.hasSchemaVersion5 ? '✅' : '❌'}`);
    console.log(`   - P2 Tables: ${migrationResults.tablesFound}/${migrationResults.totalTables}`);
  }
  
  if (secureOpsResults) {
    console.log(`🔒 Secure Operations:`);
    console.log(`   - P2 Operations: ${secureOpsResults.operationsFound}/${secureOpsResults.totalOperations}`);
  }
  
  if (preloadResults) {
    console.log(`🌉 Preload API:`);
    console.log(`   - P2 APIs: ${preloadResults.apisFound}/${preloadResults.totalAPIs}`);
  }
  
  // Overall assessment
  const allMigrationsPresent = migrationResults && 
    migrationResults.hasV3Migration && 
    migrationResults.hasV4Migration && 
    migrationResults.hasV5Migration &&
    migrationResults.hasSchemaVersion5;
    
  const allOperationsPresent = secureOpsResults && 
    secureOpsResults.operationsFound === secureOpsResults.totalOperations;
    
  const allAPIsPresent = preloadResults && 
    preloadResults.apisFound === preloadResults.totalAPIs;
  
  console.log('\n🎯 OVERALL STATUS:');
  if (allMigrationsPresent && allOperationsPresent && allAPIsPresent) {
    console.log('🎉 P2 IMPLEMENTATION COMPLETE!');
    console.log('✅ All database migrations implemented');
    console.log('✅ All secure operations defined');
    console.log('✅ All preload APIs exposed');
    console.log('\n🚀 Ready for P2 feature development!');
  } else {
    console.log('⚠️  P2 IMPLEMENTATION INCOMPLETE');
    if (!allMigrationsPresent) console.log('❌ Database migrations missing or incomplete');
    if (!allOperationsPresent) console.log('❌ Secure operations missing or incomplete');
    if (!allAPIsPresent) console.log('❌ Preload APIs missing or incomplete');
  }
}

// Execute validation
runValidation();
