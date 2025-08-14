import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import './LoadTests.css';

const LoadTests = () => {
  const { currentUser } = useUser();
  const [loadTests, setLoadTests] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateTest, setShowCreateTest] = useState(false);
  const [showScheduleNext, setShowScheduleNext] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, due, overdue, current
  const [selectedTest, setSelectedTest] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [newTest, setNewTest] = useState({
    equipmentId: '',
    testDate: new Date().toISOString().split('T')[0],
    testType: 'annual',
    testLoadPercentage: 100,
    ratedCapacity: '',
    testLoad: '',
    testDuration: '',
    inspector: '',
    testResults: 'pass',
    deficienciesFound: '',
    correctiveActions: '',
    nextTestDue: '',
    certificateNumber: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
    checkUpcomingTests();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [equipmentData] = await Promise.all([
        window.api.equipment.getAll()
      ]);

      setEquipment(equipmentData);

      // Load load tests for all equipment
      const loadTestsPromises = equipmentData.map(eq => 
        window.api.loadTests.getByEquipmentId(eq.id)
      );
      const loadTestsResults = await Promise.all(loadTestsPromises);
      const allLoadTests = loadTestsResults.flat();
      setLoadTests(allLoadTests);

    } catch (err) {
      console.error('Error loading load tests data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Phase 6: Load Test Scheduling and Tracking
  const checkUpcomingTests = async () => {
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      const dueTests = await window.api.loadTests.getDue(thirtyDaysFromNow.toISOString().split('T')[0]);
      const overdueTests = await window.api.loadTests.getOverdue();
      
      const newNotifications = [];
      
      // Add overdue notifications
      overdueTests.forEach(test => {
        newNotifications.push({
          type: 'critical',
          message: `Load test for ${test.equipment_identifier} is overdue (due: ${new Date(test.next_test_due).toLocaleDateString()})`,
          equipmentId: test.equipment_id,
          testId: test.id,
          dueDate: test.next_test_due
        });
      });
      
      // Add upcoming notifications
      dueTests.forEach(test => {
        const dueDate = new Date(test.next_test_due);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue <= 30 && daysUntilDue >= 0) {
          newNotifications.push({
            type: daysUntilDue <= 7 ? 'warning' : 'info',
            message: `Load test for ${test.equipment_identifier} due in ${daysUntilDue} days (${dueDate.toLocaleDateString()})`,
            equipmentId: test.equipment_id,
            testId: test.id,
            dueDate: test.next_test_due
          });
        }
      });
      
      setNotifications(newNotifications);
    } catch (err) {
      console.error('Error checking upcoming tests:', err);
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    
    try {
      // Calculate test load if not provided
      const calculatedTestLoad = newTest.testLoad || 
        (parseFloat(newTest.ratedCapacity) * (newTest.testLoadPercentage / 100));

      // Calculate next test due date (typically 1 year for annual tests)
      const testDate = new Date(newTest.testDate);
      const nextDue = new Date(testDate);
      if (newTest.testType === 'annual') {
        nextDue.setFullYear(nextDue.getFullYear() + 1);
      } else if (newTest.testType === 'periodic') {
        nextDue.setMonth(nextDue.getMonth() + 6); // 6 months for periodic
      } else {
        nextDue.setFullYear(nextDue.getFullYear() + 1); // Default to 1 year
      }

      const testData = {
        ...newTest,
        equipmentId: parseInt(newTest.equipmentId),
        testLoadPercentage: parseInt(newTest.testLoadPercentage),
        ratedCapacity: parseFloat(newTest.ratedCapacity),
        testLoad: calculatedTestLoad,
        testDuration: newTest.testDuration ? parseInt(newTest.testDuration) : null,
        nextTestDue: newTest.nextTestDue || nextDue.toISOString().split('T')[0]
      };

      const createResult = await window.api.loadTests.create(testData);
      const createdLoadTestId = createResult?.lastID || createResult?.id || 0;

      // Log audit entry
      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'create',
        entityType: 'load_test',
        entityId: createdLoadTestId,
        oldValues: null,
        newValues: JSON.stringify(testData),
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      // Generate certificate if test passed
      if (newTest.testResults === 'pass') {
        const equipmentItem = equipment.find(eq => eq.id === parseInt(newTest.equipmentId));
        const certificateNumber = `LT-${equipmentItem?.equipment_id}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
        
        await window.api.certificates.create({
          certificateNumber,
          certificateType: 'load_test',
          equipmentId: parseInt(newTest.equipmentId),
          entityId: createdLoadTestId,
          issueDate: newTest.testDate,
          expirationDate: nextDue.toISOString().split('T')[0],
          issuedBy: newTest.inspector,
          qrCodeData: `${window.location.origin}/verify/${certificateNumber}`,
          certificateHash: null // Will be calculated when certificate is generated
        });
      }

      setShowCreateTest(false);
      resetNewTest();
      await loadData();
      await checkUpcomingTests(); // Refresh notifications
    } catch (err) {
      console.error('Error creating load test:', err);
      setError(err.message);
    }
  };

  // Phase 6: Schedule Next Load Test
  const handleScheduleNext = async (test) => {
    try {
      const equipmentItem = equipment.find(eq => eq.id === test.equipment_id);
      
      // Calculate next test date based on test type
      const lastTestDate = new Date(test.test_date);
      const nextTestDate = new Date(lastTestDate);
      
      if (test.test_type === 'annual') {
        nextTestDate.setFullYear(nextTestDate.getFullYear() + 1);
      } else if (test.test_type === 'periodic') {
        nextTestDate.setMonth(nextTestDate.getMonth() + 6);
      } else {
        nextTestDate.setFullYear(nextTestDate.getFullYear() + 1);
      }

      // Pre-populate form with previous test data
      setNewTest({
        equipmentId: test.equipment_id.toString(),
        testDate: nextTestDate.toISOString().split('T')[0],
        testType: test.test_type,
        testLoadPercentage: test.test_load_percentage,
        ratedCapacity: test.rated_capacity.toString(),
        testLoad: '',
        testDuration: test.test_duration?.toString() || '',
        inspector: test.inspector,
        testResults: 'pass',
        deficienciesFound: '',
        correctiveActions: '',
        nextTestDue: '',
        certificateNumber: '',
        notes: `Scheduled follow-up to test #${test.id}`
      });

      setSelectedTest(test);
      setShowScheduleNext(true);
    } catch (err) {
      console.error('Error scheduling next test:', err);
      setError(err.message);
    }
  };

  const resetNewTest = () => {
    setNewTest({
      equipmentId: '',
      testDate: new Date().toISOString().split('T')[0],
      testType: 'annual',
      testLoadPercentage: 100,
      ratedCapacity: '',
      testLoad: '',
      testDuration: '',
      inspector: '',
      testResults: 'pass',
      deficienciesFound: '',
      correctiveActions: '',
      nextTestDue: '',
      certificateNumber: '',
      notes: ''
    });
    setSelectedTest(null);
  };

  const getTestStatus = (test) => {
    if (!test.next_test_due) return 'no-date';
    
    const today = new Date();
    const dueDate = new Date(test.next_test_due);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 30) return 'due-soon';
    if (diffDays <= 90) return 'upcoming';
    return 'current';
  };

  const getStatusBadge = (test) => {
    const status = getTestStatus(test);
    const statusConfig = {
      'overdue': { class: 'status-overdue', label: 'Overdue' },
      'due-soon': { class: 'status-due-soon', label: 'Due Soon' },
      'upcoming': { class: 'status-upcoming', label: 'Due in 90 Days' },
      'current': { class: 'status-current', label: 'Current' },
      'no-date': { class: 'status-no-date', label: 'No Due Date' }
    };

    const config = statusConfig[status];
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const getFilteredTests = () => {
    let filtered = loadTests;

    if (selectedEquipmentId) {
      filtered = filtered.filter(test => test.equipment_id === parseInt(selectedEquipmentId));
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(test => getTestStatus(test) === filterStatus);
    }

    return filtered.sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
  };

  const getCraneEquipment = () => {
    return equipment.filter(eq => 
      eq.type && (
        eq.type.toLowerCase().includes('crane') ||
        eq.type.toLowerCase().includes('hoist') ||
        eq.type.toLowerCase().includes('lift')
      )
    );
  };

  if (loading) {
    return (
      <div className="load-tests">
        <div className="load-tests-header">
          <h1>Load Tests</h1>
        </div>
        <div className="loading-spinner">Loading load tests data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="load-tests">
        <div className="load-tests-header">
          <h1>Load Tests</h1>
        </div>
        <div className="error-message">
          <p>Error loading load tests: {error}</p>
          <button onClick={loadData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filteredTests = getFilteredTests();
  const craneEquipment = getCraneEquipment();

  return (
    <div className="load-tests">
      <div className="load-tests-header">
        <h1>Load Tests</h1>
        <div className="header-actions">
          <button 
            className="create-button"
            onClick={() => setShowCreateTest(true)}
          >
            + Schedule Load Test
          </button>
        </div>
      </div>

      {/* Phase 6: Load Test Notifications */}
      {notifications.length > 0 && (
        <div className="load-test-notifications">
          <h3>🔔 Load Test Alerts</h3>
          {notifications.map((notification, index) => (
            <div key={index} className={`notification ${notification.type}`}>
              <span className="notification-message">{notification.message}</span>
              <button 
                className="notification-action"
                onClick={() => handleScheduleNext({ 
                  equipment_id: notification.equipmentId, 
                  id: notification.testId,
                  next_test_due: notification.dueDate 
                })}
              >
                Schedule Test
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="load-tests-summary">
        <div className="summary-card">
          <span className="summary-value">{loadTests.length}</span>
          <span className="summary-label">Total Tests</span>
        </div>
        <div className="summary-card">
          <span className="summary-value status-critical">
            {loadTests.filter(t => getTestStatus(t) === 'overdue').length}
          </span>
          <span className="summary-label">Overdue</span>
        </div>
        <div className="summary-card">
          <span className="summary-value status-warning">
            {loadTests.filter(t => getTestStatus(t) === 'due-soon').length}
          </span>
          <span className="summary-label">Due Soon</span>
        </div>
        <div className="summary-card">
          <span className="summary-value status-good">
            {loadTests.filter(t => t.test_results === 'pass').length}
          </span>
          <span className="summary-label">Passed</span>
        </div>
      </div>

      {/* Filters */}
      <div className="load-tests-filters">
        <div className="filter-group">
          <label>Equipment:</label>
          <select
            value={selectedEquipmentId}
            onChange={(e) => setSelectedEquipmentId(e.target.value)}
          >
            <option value="">All Equipment</option>
            {craneEquipment.map(eq => (
              <option key={eq.id} value={eq.id}>
                {eq.equipment_id} - {eq.type}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="overdue">Overdue</option>
            <option value="due-soon">Due Soon</option>
            <option value="upcoming">Upcoming</option>
            <option value="current">Current</option>
          </select>
        </div>
      </div>

      {/* Load Tests List */}
      <div className="load-tests-list">
        {filteredTests.length === 0 ? (
          <div className="empty-state">
            <p>No load tests found matching the current filters.</p>
            <button 
              className="create-button"
              onClick={() => setShowCreateTest(true)}
            >
              Schedule First Load Test
            </button>
          </div>
        ) : (
          filteredTests.map(test => {
            const equipmentItem = equipment.find(eq => eq.id === test.equipment_id);
            return (
              <div key={test.id} className="load-test-card">
                <div className="test-header">
                  <div className="test-title">
                    <h3>{equipmentItem?.equipment_id} - {equipmentItem?.type}</h3>
                    <span className="test-type">{test.test_type} Load Test</span>
                  </div>
                  <div className="test-badges">
                    {getStatusBadge(test)}
                    <span className={`result-badge ${test.test_results}`}>
                      {test.test_results === 'pass' ? '✅ Passed' : '❌ Failed'}
                    </span>
                  </div>
                </div>

                <div className="test-details">
                  <div className="detail-row">
                    <span className="detail-label">Test Date:</span>
                    <span className="detail-value">{new Date(test.test_date).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Test Load:</span>
                    <span className="detail-value">
                      {test.test_load} lbs ({test.test_load_percentage}% of {test.rated_capacity} lbs)
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Inspector:</span>
                    <span className="detail-value">{test.inspector}</span>
                  </div>
                  {test.next_test_due && (
                    <div className="detail-row">
                      <span className="detail-label">Next Test Due:</span>
                      <span className="detail-value">{new Date(test.next_test_due).toLocaleDateString()}</span>
                    </div>
                  )}
                  {test.certificate_number && (
                    <div className="detail-row">
                      <span className="detail-label">Certificate:</span>
                      <span className="detail-value">{test.certificate_number}</span>
                    </div>
                  )}
                </div>

                {test.deficiencies_found && (
                  <div className="test-deficiencies">
                    <h4>⚠️ Deficiencies Found:</h4>
                    <p>{test.deficiencies_found}</p>
                  </div>
                )}

                {test.corrective_actions && (
                  <div className="test-actions-taken">
                    <h4>🔧 Corrective Actions:</h4>
                    <p>{test.corrective_actions}</p>
                  </div>
                )}

                {test.notes && (
                  <div className="test-notes">
                    <h4>📝 Notes:</h4>
                    <p>{test.notes}</p>
                  </div>
                )}

                <div className="test-actions">
                  <button className="action-button view-certificate">
                    View Certificate
                  </button>
                  <button 
                    className="action-button schedule-next"
                    onClick={() => handleScheduleNext(test)}
                  >
                    Schedule Next Test
                  </button>
                  <button className="action-button edit">
                    Edit Test
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Schedule Load Test Modal */}
      {(showCreateTest || showScheduleNext) && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h2>{showScheduleNext ? 'Schedule Next Load Test' : 'Schedule Load Test'}</h2>
              <button 
                className="close-button"
                onClick={() => {
                  setShowCreateTest(false);
                  setShowScheduleNext(false);
                  resetNewTest();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="create-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Equipment *</label>
                  <select
                    value={newTest.equipmentId}
                    onChange={(e) => setNewTest({...newTest, equipmentId: e.target.value})}
                    required
                    disabled={showScheduleNext}
                  >
                    <option value="">Select Equipment</option>
                    {craneEquipment.map(eq => (
                      <option key={eq.id} value={eq.id}>
                        {eq.equipment_id} - {eq.type} ({eq.capacity} lbs)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Test Date *</label>
                  <input
                    type="date"
                    value={newTest.testDate}
                    onChange={(e) => setNewTest({...newTest, testDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Test Type *</label>
                  <select
                    value={newTest.testType}
                    onChange={(e) => setNewTest({...newTest, testType: e.target.value})}
                    required
                  >
                    <option value="annual">Annual</option>
                    <option value="periodic">Periodic</option>
                    <option value="initial">Initial</option>
                    <option value="after_repair">After Repair</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Test Load Percentage *</label>
                  <select
                    value={newTest.testLoadPercentage}
                    onChange={(e) => setNewTest({...newTest, testLoadPercentage: e.target.value})}
                    required
                  >
                    <option value="100">100% (Rated Load)</option>
                    <option value="110">110% (Proof Load)</option>
                    <option value="125">125% (Initial Test)</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Rated Capacity (lbs) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newTest.ratedCapacity}
                    onChange={(e) => setNewTest({...newTest, ratedCapacity: e.target.value})}
                    required
                    placeholder="e.g., 5000"
                  />
                </div>

                <div className="form-group">
                  <label>Test Duration (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={newTest.testDuration}
                    onChange={(e) => setNewTest({...newTest, testDuration: e.target.value})}
                    placeholder="e.g., 10"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Inspector *</label>
                  <input
                    type="text"
                    value={newTest.inspector}
                    onChange={(e) => setNewTest({...newTest, inspector: e.target.value})}
                    required
                    placeholder="Inspector name"
                  />
                </div>

                <div className="form-group">
                  <label>Test Results *</label>
                  <select
                    value={newTest.testResults}
                    onChange={(e) => setNewTest({...newTest, testResults: e.target.value})}
                    required
                  >
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                  </select>
                </div>
              </div>

              {newTest.testResults === 'fail' && (
                <div className="form-group">
                  <label>Deficiencies Found *</label>
                  <textarea
                    value={newTest.deficienciesFound}
                    onChange={(e) => setNewTest({...newTest, deficienciesFound: e.target.value})}
                    rows="3"
                    required
                    placeholder="Describe deficiencies found during the test"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Corrective Actions</label>
                <textarea
                  value={newTest.correctiveActions}
                  onChange={(e) => setNewTest({...newTest, correctiveActions: e.target.value})}
                  rows="3"
                  placeholder="Describe any corrective actions taken"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Certificate Number</label>
                  <input
                    type="text"
                    value={newTest.certificateNumber}
                    onChange={(e) => setNewTest({...newTest, certificateNumber: e.target.value})}
                    placeholder="Will be auto-generated if blank"
                  />
                </div>

                <div className="form-group">
                  <label>Next Test Due</label>
                  <input
                    type="date"
                    value={newTest.nextTestDue}
                    onChange={(e) => setNewTest({...newTest, nextTestDue: e.target.value})}
                    placeholder="Will be auto-calculated if blank"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={newTest.notes}
                  onChange={(e) => setNewTest({...newTest, notes: e.target.value})}
                  rows="3"
                  placeholder="Additional notes about the test"
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCreateTest(false);
                    setShowScheduleNext(false);
                    resetNewTest();
                  }} 
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  {showScheduleNext ? 'Schedule Next Test' : 'Create Load Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadTests;
