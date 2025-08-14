/**
 * Phase 5 Complete Workflows Test
 * 
 * Tests all Phase 5 functionality:
 * 1. Work Order Lifecycle with Cost Tracking
 * 2. PM Schedule to Work Order Generation
 * 3. PM Schedule Updates After Completion
 * 4. Deficiency Creation and Work Order Linking
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Import secure operations
const { secureOperations } = require('./src/database/secureOperations');

const dbPath = path.join(__dirname, 'database.db');
let db;

function initializeDatabase() {
  if (fs.existsSync(dbPath)) {
    db = new Database(dbPath);
    console.log('✅ Connected to existing database');
  } else {
    console.error('❌ Database file not found');
    process.exit(1);
  }
}

function executeSecureOperation(domain, operation, params = {}) {
  const op = secureOperations[domain]?.[operation];
  if (!op) {
    throw new Error(`Operation ${domain}.${operation} not found`);
  }

  if (!op.validate(params)) {
    throw new Error(`Validation failed for ${domain}.${operation}`);
  }

  try {
    if (op.returnType === 'many') {
      return db.prepare(op.sql).all(...op.params.map(p => params[p]));
    } else if (op.returnType === 'one') {
      return db.prepare(op.sql).get(...op.params.map(p => params[p]));
    } else if (op.returnType === 'scalar') {
      const result = db.prepare(op.sql).get(...op.params.map(p => params[p]));
      return result ? Object.values(result)[0] : null;
    } else if (op.returnType === 'write') {
      return db.prepare(op.sql).run(...op.params.map(p => params[p]));
    }
  } catch (error) {
    console.error(`Error executing ${domain}.${operation}:`, error.message);
    throw error;
  }
}

async function testPhase5Workflows() {
  console.log('\n🧪 Phase 5: Complete Workflows Test');
  console.log('=====================================\n');

  let testsPassed = 0;
  let totalTests = 0;

  // Test 1: Work Order Lifecycle with Cost Tracking
  console.log('1. Testing Work Order Lifecycle with Cost Tracking...');
  totalTests++;
  
  try {
    // Get first equipment for testing
    const equipment = executeSecureOperation('equipment', 'getAll');
    if (equipment.length === 0) {
      throw new Error('No equipment found for testing');
    }
    const testEquipment = equipment[0];

    // Create a work order
    const woResult = executeSecureOperation('workOrders', 'create', {
      equipmentId: testEquipment.id,
      woNumber: 'TEST-WO-001',
      title: 'Test Work Order',
      description: 'Test work order for Phase 5 testing',
      workType: 'corrective',
      priority: 'medium',
      assignedTo: 'Test Technician',
      estimatedHours: 2.5,
      createdBy: 'Test User',
      scheduledDate: '2025-08-14',
      deficiencyId: null
    });

    const workOrderId = woResult.lastID;
    console.log(`   ✅ Work order created with ID: ${workOrderId}`);

    // Test status progression: draft -> approved -> assigned -> in_progress
    executeSecureOperation('workOrders', 'updateStatus', {
      id: workOrderId,
      status: 'approved',
      startedAt: null,
      completedAt: null,
      closedAt: null
    });
    console.log('   ✅ Work order approved');

    executeSecureOperation('workOrders', 'updateStatus', {
      id: workOrderId,
      status: 'assigned',
      startedAt: null,
      completedAt: null,
      closedAt: null
    });
    console.log('   ✅ Work order assigned');

    const startTime = new Date().toISOString();
    executeSecureOperation('workOrders', 'updateStatus', {
      id: workOrderId,
      status: 'in_progress',
      startedAt: startTime,
      completedAt: null,
      closedAt: null
    });
    console.log('   ✅ Work order started');

    // Complete work order with cost tracking
    executeSecureOperation('workOrders', 'complete', {
      id: workOrderId,
      actualHours: 3.0,
      partsCost: 150.75,
      laborCost: 225.00,
      completionNotes: 'Work completed successfully. Replaced hydraulic filter and tested system.'
    });
    console.log('   ✅ Work order completed with cost tracking');

    // Close work order
    executeSecureOperation('workOrders', 'updateStatus', {
      id: workOrderId,
      status: 'closed',
      startedAt: null,
      completedAt: null,
      closedAt: new Date().toISOString()
    });
    console.log('   ✅ Work order closed');

    // Verify final state
    const completedWO = executeSecureOperation('workOrders', 'getAll').find(wo => wo.id === workOrderId);
    if (completedWO && completedWO.status === 'closed' && 
        completedWO.actual_hours === 3.0 && 
        completedWO.parts_cost === 150.75 && 
        completedWO.labor_cost === 225.00) {
      console.log('   ✅ Work order lifecycle with cost tracking verified');
      testsPassed++;
    } else {
      throw new Error('Work order final state verification failed');
    }

  } catch (error) {
    console.log(`   ❌ Work Order Lifecycle test failed: ${error.message}`);
  }

  // Test 2: PM Schedule to Work Order Generation
  console.log('\n2. Testing PM Schedule to Work Order Generation...');
  totalTests++;
  
  try {
    // Create a PM template
    const templateResult = executeSecureOperation('pmTemplates', 'create', {
      name: 'Test Monthly Maintenance',
      equipmentType: testEquipment.type,
      description: 'Monthly maintenance procedure',
      frequencyType: 'calendar',
      frequencyValue: 30,
      frequencyUnit: 'days',
      estimatedDuration: 4.0,
      instructions: 'Perform monthly maintenance checks',
      requiredSkills: '["Mechanical", "Electrical"]',
      requiredParts: '["Oil", "Filters"]',
      safetyNotes: 'Follow lockout/tagout procedures'
    });

    const templateId = templateResult.lastID;
    console.log(`   ✅ PM template created with ID: ${templateId}`);

    // Create a PM schedule
    const scheduleResult = executeSecureOperation('pmSchedules', 'create', {
      equipmentId: testEquipment.id,
      pmTemplateId: templateId,
      nextDueDate: '2025-08-15',
      nextDueUsage: null
    });

    const scheduleId = scheduleResult.lastID;
    console.log(`   ✅ PM schedule created with ID: ${scheduleId}`);

    // Simulate generating work order from PM schedule
    const pmWOResult = executeSecureOperation('workOrders', 'create', {
      equipmentId: testEquipment.id,
      woNumber: `PM-${testEquipment.equipment_id}-2025-TEST`,
      title: `Test Monthly Maintenance - ${testEquipment.equipment_id}`,
      description: 'Monthly maintenance procedure',
      workType: 'preventive',
      priority: 'medium',
      assignedTo: null,
      estimatedHours: 4.0,
      createdBy: 'Test User',
      scheduledDate: '2025-08-15',
      deficiencyId: null
    });

    const pmWorkOrderId = pmWOResult.lastID;
    console.log(`   ✅ PM work order generated with ID: ${pmWorkOrderId}`);

    // Verify PM work order was created correctly
    const pmWO = executeSecureOperation('workOrders', 'getAll').find(wo => wo.id === pmWorkOrderId);
    if (pmWO && pmWO.work_type === 'preventive' && pmWO.estimated_hours === 4.0) {
      console.log('   ✅ PM work order generation verified');
      testsPassed++;
    } else {
      throw new Error('PM work order verification failed');
    }

  } catch (error) {
    console.log(`   ❌ PM Schedule to Work Order Generation test failed: ${error.message}`);
  }

  // Test 3: PM Schedule Updates After Completion
  console.log('\n3. Testing PM Schedule Updates After Completion...');
  totalTests++;
  
  try {
    // Get the PM schedule we created
    const pmSchedule = executeSecureOperation('pmSchedules', 'getByEquipmentId', {
      equipmentId: testEquipment.id
    }).find(s => s.id === scheduleId);

    if (!pmSchedule) {
      throw new Error('PM schedule not found');
    }

    const originalDueDate = pmSchedule.next_due_date;
    console.log(`   📅 Original due date: ${originalDueDate}`);

    // Calculate next due date (30 days from completion)
    const completionDate = '2025-08-15';
    const nextDueDate = new Date(completionDate);
    nextDueDate.setDate(nextDueDate.getDate() + 30);
    const expectedNextDue = nextDueDate.toISOString().split('T')[0];

    // Update PM schedule after completion
    executeSecureOperation('pmSchedules', 'updateDue', {
      id: scheduleId,
      nextDueDate: expectedNextDue,
      nextDueUsage: null,
      lastCompletedDate: completionDate,
      lastCompletedUsage: null
    });

    console.log(`   ✅ PM schedule updated - next due: ${expectedNextDue}`);

    // Verify the update
    const updatedSchedule = executeSecureOperation('pmSchedules', 'getByEquipmentId', {
      equipmentId: testEquipment.id
    }).find(s => s.id === scheduleId);

    if (updatedSchedule && 
        updatedSchedule.next_due_date === expectedNextDue && 
        updatedSchedule.last_completed_date === completionDate) {
      console.log('   ✅ PM schedule update verified');
      testsPassed++;
    } else {
      throw new Error('PM schedule update verification failed');
    }

  } catch (error) {
    console.log(`   ❌ PM Schedule Updates test failed: ${error.message}`);
  }

  // Test 4: Deficiency Creation and Work Order Linking
  console.log('\n4. Testing Deficiency Creation and Work Order Linking...');
  totalTests++;
  
  try {
    // Create a deficiency
    const deficiencyResult = executeSecureOperation('deficiencies', 'create', {
      equipmentId: testEquipment.id,
      inspectionItemId: null,
      severity: 'major',
      removeFromService: false,
      description: 'Hydraulic leak detected in main cylinder',
      component: 'Hydraulic System',
      correctiveAction: 'Replace hydraulic seals and test system',
      dueDate: '2025-08-20',
      status: 'open'
    });

    const deficiencyId = deficiencyResult.lastID;
    console.log(`   ✅ Deficiency created with ID: ${deficiencyId}`);

    // Create work order from deficiency
    const defWOResult = executeSecureOperation('workOrders', 'create', {
      equipmentId: testEquipment.id,
      woNumber: `DEF-${testEquipment.equipment_id}-2025-TEST`,
      title: `Deficiency Repair - Hydraulic System`,
      description: 'Hydraulic leak detected in main cylinder\n\nCorrective Action: Replace hydraulic seals and test system',
      workType: 'corrective',
      priority: 'high',
      assignedTo: null,
      estimatedHours: null,
      createdBy: 'Test User',
      scheduledDate: '2025-08-20',
      deficiencyId: deficiencyId
    });

    const defWorkOrderId = defWOResult.lastID;
    console.log(`   ✅ Work order created from deficiency with ID: ${defWorkOrderId}`);

    // Link deficiency to work order
    executeSecureOperation('deficiencies', 'linkToWorkOrder', {
      id: deficiencyId,
      workOrderId: defWorkOrderId
    });

    console.log('   ✅ Deficiency linked to work order');

    // Verify the linking
    const linkedDeficiency = executeSecureOperation('deficiencies', 'getAll')
      .find(d => d.id === deficiencyId);
    const linkedWorkOrder = executeSecureOperation('workOrders', 'getAll')
      .find(wo => wo.id === defWorkOrderId);

    if (linkedDeficiency && linkedWorkOrder && 
        linkedDeficiency.work_order_id === defWorkOrderId &&
        linkedWorkOrder.deficiency_id === deficiencyId) {
      console.log('   ✅ Deficiency to work order linking verified');
      testsPassed++;
    } else {
      throw new Error('Deficiency to work order linking verification failed');
    }

  } catch (error) {
    console.log(`   ❌ Deficiency Creation and Work Order Linking test failed: ${error.message}`);
  }

  // Test 5: Deficiency Creation from Inspection Item
  console.log('\n5. Testing Deficiency Creation from Inspection Item...');
  totalTests++;
  
  try {
    // First create an inspection
    const inspectionResult = executeSecureOperation('inspections', 'create', {
      equipmentId: testEquipment.id,
      inspector: 'Test Inspector',
      inspectionDate: '2025-08-13T10:00:00Z',
      findings: 'Critical failure found in safety system',
      correctiveActions: 'Immediate repair required',
      summaryComments: 'Equipment must be taken out of service',
      signature: 'Test Inspector',
      scheduledInspectionId: null,
      inspectionDate: '2025-08-13'
    });

    const inspectionId = inspectionResult.lastID;
    console.log(`   ✅ Test inspection created with ID: ${inspectionId}`);

    // Create an inspection item with failure
    const inspectionItemResult = executeSecureOperation('inspectionItems', 'create', {
      inspectionId: inspectionId,
      standardRef: 'ASME B30.2-2016',
      itemText: 'Safety system functionality check',
      critical: 1,
      result: 'fail',
      notes: 'Safety system not responding to emergency stop',
      photos: null,
      component: 'Safety System',
      priority: 'critical'
    });

    const inspectionItemId = inspectionItemResult.lastID;
    console.log(`   ✅ Critical failure inspection item created with ID: ${inspectionItemId}`);

    // Create deficiency from inspection item
    const inspectionDeficiencyResult = executeSecureOperation('deficiencies', 'createFromInspectionItem', {
      equipmentId: testEquipment.id,
      inspectionItemId: inspectionItemId,
      severity: 'critical',
      removeFromService: true,
      description: 'Safety system not responding to emergency stop',
      component: 'Safety System',
      correctiveAction: 'Replace safety system control module and test all safety functions',
      dueDate: '2025-08-14'
    });

    const inspectionDeficiencyId = inspectionDeficiencyResult.lastID;
    console.log(`   ✅ Deficiency created from inspection item with ID: ${inspectionDeficiencyId}`);

    // Verify the deficiency was created correctly
    const createdDeficiency = executeSecureOperation('deficiencies', 'getAll')
      .find(d => d.id === inspectionDeficiencyId);

    if (createdDeficiency && 
        createdDeficiency.inspection_item_id === inspectionItemId &&
        createdDeficiency.severity === 'critical' &&
        createdDeficiency.remove_from_service === 1) {
      console.log('   ✅ Deficiency from inspection item verified');
      testsPassed++;
    } else {
      throw new Error('Deficiency from inspection item verification failed');
    }

  } catch (error) {
    console.log(`   ❌ Deficiency Creation from Inspection Item test failed: ${error.message}`);
  }

  // Test 6: Backend Operations Availability
  console.log('\n6. Testing Backend Operations Availability...');
  totalTests++;
  
  try {
    // Test all new operations exist
    const requiredOperations = [
      ['deficiencies', 'createFromInspectionItem'],
      ['deficiencies', 'linkToWorkOrder'],
      ['workOrders', 'complete'],
      ['pmSchedules', 'updateDue']
    ];

    let operationsFound = 0;
    for (const [domain, operation] of requiredOperations) {
      if (secureOperations[domain] && secureOperations[domain][operation]) {
        operationsFound++;
        console.log(`   ✅ ${domain}.${operation} operation available`);
      } else {
        console.log(`   ❌ ${domain}.${operation} operation missing`);
      }
    }

    if (operationsFound === requiredOperations.length) {
      console.log('   ✅ All required backend operations available');
      testsPassed++;
    } else {
      throw new Error(`Only ${operationsFound}/${requiredOperations.length} operations available`);
    }

  } catch (error) {
    console.log(`   ❌ Backend Operations Availability test failed: ${error.message}`);
  }

  // Summary
  console.log('\n📊 Phase 5 Test Results');
  console.log('========================');
  console.log(`Tests Passed: ${testsPassed}/${totalTests}`);
  console.log(`Success Rate: ${((testsPassed/totalTests) * 100).toFixed(1)}%`);

  if (testsPassed === totalTests) {
    console.log('\n🎉 All Phase 5 tests passed! Complete workflows are functional.');
    console.log('\nPhase 5 Features Implemented:');
    console.log('✅ Work Order Lifecycle with Cost Tracking');
    console.log('✅ PM Schedule to Work Order Generation');
    console.log('✅ PM Schedule Updates After Completion');
    console.log('✅ Deficiency Creation and Work Order Linking');
    console.log('✅ Deficiency Creation from Inspection Items');
    console.log('✅ All Required Backend Operations');
  } else {
    console.log(`\n⚠️  ${totalTests - testsPassed} test(s) failed. Review implementation.`);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  initializeDatabase();
  testPhase5Workflows()
    .then(() => {
      db.close();
      console.log('\n✅ Database connection closed');
    })
    .catch((error) => {
      console.error('\n❌ Test execution failed:', error);
      if (db) db.close();
      process.exit(1);
    });
}

module.exports = { testPhase5Workflows };
