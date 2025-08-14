import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import './Calibrations.css';

const Calibrations = () => {
  const { currentUser } = useUser();
  const [calibrations, setCalibrations] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateCalibration, setShowCreateCalibration] = useState(false);
  const [showScheduleNext, setShowScheduleNext] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, due, overdue, current
  const [selectedCalibration, setSelectedCalibration] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [newCalibration, setNewCalibration] = useState({
    equipmentId: '',
    instrumentType: '',
    calibrationDate: new Date().toISOString().split('T')[0],
    calibrationDueDate: '',
    calibratedBy: '',
    calibrationAgency: '',
    certificateNumber: '',
    calibrationResults: 'pass',
    accuracyTolerance: '',
    actualAccuracy: '',
    adjustmentsMade: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
    checkUpcomingCalibrations();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [equipmentData] = await Promise.all([
        window.api.equipment.getAll()
      ]);

      setEquipment(equipmentData);

      // Load calibrations for all equipment
      const calibrationsPromises = equipmentData.map(eq => 
        window.api.calibrations.getByEquipmentId(eq.id)
      );
      const calibrationsResults = await Promise.all(calibrationsPromises);
      const allCalibrations = calibrationsResults.flat();
      setCalibrations(allCalibrations);

    } catch (err) {
      console.error('Error loading calibrations data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Phase 6: Calibration Scheduling and Tracking
  const checkUpcomingCalibrations = async () => {
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      const dueCalibrations = await window.api.calibrations.getDue(thirtyDaysFromNow.toISOString().split('T')[0]);
      const overdueCalibrations = await window.api.calibrations.getOverdue();
      
      const newNotifications = [];
      
      // Add overdue notifications
      overdueCalibrations.forEach(calibration => {
        newNotifications.push({
          type: 'critical',
          message: `Calibration for ${calibration.equipment_identifier} is overdue (due: ${new Date(calibration.calibration_due_date).toLocaleDateString()})`,
          equipmentId: calibration.equipment_id,
          calibrationId: calibration.id,
          dueDate: calibration.calibration_due_date
        });
      });
      
      // Add upcoming notifications
      dueCalibrations.forEach(calibration => {
        const dueDate = new Date(calibration.calibration_due_date);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue <= 30 && daysUntilDue >= 0) {
          newNotifications.push({
            type: daysUntilDue <= 7 ? 'warning' : 'info',
            message: `Calibration for ${calibration.equipment_identifier} due in ${daysUntilDue} days (${dueDate.toLocaleDateString()})`,
            equipmentId: calibration.equipment_id,
            calibrationId: calibration.id,
            dueDate: calibration.calibration_due_date
          });
        }
      });
      
      setNotifications(newNotifications);
    } catch (err) {
      console.error('Error checking upcoming calibrations:', err);
    }
  };

  const handleCreateCalibration = async (e) => {
    e.preventDefault();
    
    try {
      // Calculate due date if not provided (typically 1 year for most instruments)
      let dueDate = newCalibration.calibrationDueDate;
      if (!dueDate) {
        const calibrationDate = new Date(newCalibration.calibrationDate);
        const nextDue = new Date(calibrationDate);
        nextDue.setFullYear(nextDue.getFullYear() + 1);
        dueDate = nextDue.toISOString().split('T')[0];
      }

      const calibrationData = {
        ...newCalibration,
        equipmentId: parseInt(newCalibration.equipmentId),
        calibrationDueDate: dueDate
      };

      const createResult = await window.api.calibrations.create(calibrationData);
      const createdCalibrationId = createResult?.lastID || createResult?.id || 0;

      // Log audit entry
      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'create',
        entityType: 'calibration',
        entityId: createdCalibrationId,
        oldValues: null,
        newValues: JSON.stringify(calibrationData),
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      // Generate certificate if calibration passed
      if (newCalibration.calibrationResults === 'pass') {
        const equipmentItem = equipment.find(eq => eq.id === parseInt(newCalibration.equipmentId));
        const certificateNumber = `CAL-${equipmentItem?.equipment_id}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
        
        await window.api.certificates.create({
          certificateNumber,
          certificateType: 'calibration',
          equipmentId: parseInt(newCalibration.equipmentId),
          entityId: createdCalibrationId,
          issueDate: newCalibration.calibrationDate,
          expirationDate: dueDate,
          issuedBy: newCalibration.calibratedBy,
          qrCodeData: `${window.location.origin}/verify/${certificateNumber}`,
          certificateHash: null // Will be calculated when certificate is generated
        });
      }

      setShowCreateCalibration(false);
      setShowScheduleNext(false);
      resetNewCalibration();
      await loadData();
      await checkUpcomingCalibrations(); // Refresh notifications
    } catch (err) {
      console.error('Error creating calibration:', err);
      setError(err.message);
    }
  };

  // Phase 6: Schedule Next Calibration
  const handleScheduleNext = async (calibration) => {
    try {
      const equipmentItem = equipment.find(eq => eq.id === calibration.equipment_id);
      
      // Calculate next calibration date (typically 1 year)
      const lastCalibrationDate = new Date(calibration.calibration_date);
      const nextCalibrationDate = new Date(lastCalibrationDate);
      nextCalibrationDate.setFullYear(nextCalibrationDate.getFullYear() + 1);

      // Pre-populate form with previous calibration data
      setNewCalibration({
        equipmentId: calibration.equipment_id.toString(),
        instrumentType: calibration.instrument_type,
        calibrationDate: nextCalibrationDate.toISOString().split('T')[0],
        calibrationDueDate: '',
        calibratedBy: calibration.calibrated_by,
        calibrationAgency: calibration.calibration_agency || '',
        certificateNumber: '',
        calibrationResults: 'pass',
        accuracyTolerance: calibration.accuracy_tolerance || '',
        actualAccuracy: '',
        adjustmentsMade: '',
        notes: `Scheduled follow-up to calibration #${calibration.id}`
      });

      setSelectedCalibration(calibration);
      setShowScheduleNext(true);
    } catch (err) {
      console.error('Error scheduling next calibration:', err);
      setError(err.message);
    }
  };

  const resetNewCalibration = () => {
    setNewCalibration({
      equipmentId: '',
      instrumentType: '',
      calibrationDate: new Date().toISOString().split('T')[0],
      calibrationDueDate: '',
      calibratedBy: '',
      calibrationAgency: '',
      certificateNumber: '',
      calibrationResults: 'pass',
      accuracyTolerance: '',
      actualAccuracy: '',
      adjustmentsMade: '',
      notes: ''
    });
    setSelectedCalibration(null);
  };

  const getCalibrationStatus = (calibration) => {
    if (!calibration.calibration_due_date) return 'no-date';
    
    const today = new Date();
    const dueDate = new Date(calibration.calibration_due_date);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 30) return 'due-soon';
    if (diffDays <= 90) return 'upcoming';
    return 'current';
  };

  const getStatusBadge = (calibration) => {
    const status = getCalibrationStatus(calibration);
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

  const getFilteredCalibrations = () => {
    let filtered = calibrations;

    if (selectedEquipmentId) {
      filtered = filtered.filter(cal => cal.equipment_id === parseInt(selectedEquipmentId));
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(cal => getCalibrationStatus(cal) === filterStatus);
    }

    return filtered.sort((a, b) => new Date(b.calibration_date) - new Date(a.calibration_date));
  };

  const getInstrumentEquipment = () => {
    return equipment.filter(eq => 
      eq.type && (
        eq.type.toLowerCase().includes('crane') ||
        eq.type.toLowerCase().includes('hoist') ||
        eq.type.toLowerCase().includes('scale') ||
        eq.type.toLowerCase().includes('gauge') ||
        eq.type.toLowerCase().includes('meter') ||
        eq.type.toLowerCase().includes('load') ||
        eq.type.toLowerCase().includes('test')
      )
    );
  };

  const instrumentTypes = [
    'Load Block',
    'Load Cell',
    'Pressure Gauge',
    'Torque Wrench',
    'Dynamometer',
    'Scale',
    'Test Weight',
    'Multimeter',
    'Oscilloscope',
    'Calibrator',
    'Other'
  ];

  if (loading) {
    return (
      <div className="calibrations">
        <div className="calibrations-header">
          <h1>Calibrations</h1>
        </div>
        <div className="loading-spinner">Loading calibrations data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="calibrations">
        <div className="calibrations-header">
          <h1>Calibrations</h1>
        </div>
        <div className="error-message">
          <p>Error loading calibrations: {error}</p>
          <button onClick={loadData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filteredCalibrations = getFilteredCalibrations();
  const instrumentEquipment = getInstrumentEquipment();

  return (
    <div className="calibrations">
      <div className="calibrations-header">
        <h1>Calibrations</h1>
        <div className="header-actions">
          <button 
            className="create-button"
            onClick={() => setShowCreateCalibration(true)}
          >
            + Record Calibration
          </button>
        </div>
      </div>

      {/* Phase 6: Calibration Notifications */}
      {notifications.length > 0 && (
        <div className="calibration-notifications">
          <h3>🔔 Calibration Alerts</h3>
          {notifications.map((notification, index) => (
            <div key={index} className={`notification ${notification.type}`}>
              <span className="notification-message">{notification.message}</span>
              <button 
                className="notification-action"
                onClick={() => handleScheduleNext({ 
                  equipment_id: notification.equipmentId, 
                  id: notification.calibrationId,
                  calibration_due_date: notification.dueDate 
                })}
              >
                Schedule Calibration
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="calibrations-summary">
        <div className="summary-card">
          <span className="summary-value">{calibrations.length}</span>
          <span className="summary-label">Total Calibrations</span>
        </div>
        <div className="summary-card">
          <span className="summary-value status-critical">
            {calibrations.filter(c => getCalibrationStatus(c) === 'overdue').length}
          </span>
          <span className="summary-label">Overdue</span>
        </div>
        <div className="summary-card">
          <span className="summary-value status-warning">
            {calibrations.filter(c => getCalibrationStatus(c) === 'due-soon').length}
          </span>
          <span className="summary-label">Due Soon</span>
        </div>
        <div className="summary-card">
          <span className="summary-value status-good">
            {calibrations.filter(c => c.calibration_results === 'pass').length}
          </span>
          <span className="summary-label">Passed</span>
        </div>
      </div>

      {/* Filters */}
      <div className="calibrations-filters">
        <div className="filter-group">
          <label>Equipment:</label>
          <select
            value={selectedEquipmentId}
            onChange={(e) => setSelectedEquipmentId(e.target.value)}
          >
            <option value="">All Equipment</option>
            {instrumentEquipment.map(eq => (
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

      {/* Calibrations List */}
      <div className="calibrations-list">
        {filteredCalibrations.length === 0 ? (
          <div className="empty-state">
            <p>No calibrations found matching the current filters.</p>
            <button 
              className="create-button"
              onClick={() => setShowCreateCalibration(true)}
            >
              Record First Calibration
            </button>
          </div>
        ) : (
          filteredCalibrations.map(calibration => {
            const equipmentItem = equipment.find(eq => eq.id === calibration.equipment_id);
            return (
              <div key={calibration.id} className="calibration-card">
                <div className="calibration-header">
                  <div className="calibration-title">
                    <h3>{equipmentItem?.equipment_id} - {calibration.instrument_type}</h3>
                    <span className="equipment-type">{equipmentItem?.type}</span>
                  </div>
                  <div className="calibration-badges">
                    {getStatusBadge(calibration)}
                    <span className={`result-badge ${calibration.calibration_results}`}>
                      {calibration.calibration_results === 'pass' ? '✅ Passed' : 
                       calibration.calibration_results === 'fail' ? '❌ Failed' : '⚠️ Limited'}
                    </span>
                  </div>
                </div>

                <div className="calibration-details">
                  <div className="detail-row">
                    <span className="detail-label">Calibration Date:</span>
                    <span className="detail-value">{new Date(calibration.calibration_date).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Due Date:</span>
                    <span className="detail-value">{new Date(calibration.calibration_due_date).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Calibrated By:</span>
                    <span className="detail-value">{calibration.calibrated_by}</span>
                  </div>
                  {calibration.calibration_agency && (
                    <div className="detail-row">
                      <span className="detail-label">Agency:</span>
                      <span className="detail-value">{calibration.calibration_agency}</span>
                    </div>
                  )}
                  {calibration.certificate_number && (
                    <div className="detail-row">
                      <span className="detail-label">Certificate:</span>
                      <span className="detail-value">{calibration.certificate_number}</span>
                    </div>
                  )}
                  {calibration.accuracy_tolerance && (
                    <div className="detail-row">
                      <span className="detail-label">Tolerance:</span>
                      <span className="detail-value">{calibration.accuracy_tolerance}</span>
                    </div>
                  )}
                  {calibration.actual_accuracy && (
                    <div className="detail-row">
                      <span className="detail-label">Actual Accuracy:</span>
                      <span className="detail-value">{calibration.actual_accuracy}</span>
                    </div>
                  )}
                </div>

                {calibration.adjustments_made && (
                  <div className="calibration-adjustments">
                    <h4>🔧 Adjustments Made:</h4>
                    <p>{calibration.adjustments_made}</p>
                  </div>
                )}

                {calibration.notes && (
                  <div className="calibration-notes">
                    <h4>📝 Notes:</h4>
                    <p>{calibration.notes}</p>
                  </div>
                )}

                <div className="calibration-actions">
                  <button className="action-button view-certificate">
                    View Certificate
                  </button>
                  <button 
                    className="action-button schedule-next"
                    onClick={() => handleScheduleNext(calibration)}
                  >
                    Schedule Next Calibration
                  </button>
                  <button className="action-button edit">
                    Edit Calibration
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Schedule Calibration Modal */}
      {(showCreateCalibration || showScheduleNext) && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h2>{showScheduleNext ? 'Schedule Next Calibration' : 'Record Calibration'}</h2>
              <button 
                className="close-button"
                onClick={() => {
                  setShowCreateCalibration(false);
                  setShowScheduleNext(false);
                  resetNewCalibration();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCalibration} className="create-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Equipment *</label>
                  <select
                    value={newCalibration.equipmentId}
                    onChange={(e) => setNewCalibration({...newCalibration, equipmentId: e.target.value})}
                    required
                    disabled={showScheduleNext}
                  >
                    <option value="">Select Equipment</option>
                    {instrumentEquipment.map(eq => (
                      <option key={eq.id} value={eq.id}>
                        {eq.equipment_id} - {eq.type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Instrument Type *</label>
                  <select
                    value={newCalibration.instrumentType}
                    onChange={(e) => setNewCalibration({...newCalibration, instrumentType: e.target.value})}
                    required
                  >
                    <option value="">Select Instrument Type</option>
                    {instrumentTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Calibration Date *</label>
                  <input
                    type="date"
                    value={newCalibration.calibrationDate}
                    onChange={(e) => setNewCalibration({...newCalibration, calibrationDate: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={newCalibration.calibrationDueDate}
                    onChange={(e) => setNewCalibration({...newCalibration, calibrationDueDate: e.target.value})}
                    placeholder="Will be auto-calculated if blank"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Calibrated By *</label>
                  <input
                    type="text"
                    value={newCalibration.calibratedBy}
                    onChange={(e) => setNewCalibration({...newCalibration, calibratedBy: e.target.value})}
                    required
                    placeholder="Technician name"
                  />
                </div>

                <div className="form-group">
                  <label>Calibration Agency</label>
                  <input
                    type="text"
                    value={newCalibration.calibrationAgency}
                    onChange={(e) => setNewCalibration({...newCalibration, calibrationAgency: e.target.value})}
                    placeholder="External calibration service"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Certificate Number</label>
                  <input
                    type="text"
                    value={newCalibration.certificateNumber}
                    onChange={(e) => setNewCalibration({...newCalibration, certificateNumber: e.target.value})}
                    placeholder="Calibration certificate number"
                  />
                </div>

                <div className="form-group">
                  <label>Calibration Results *</label>
                  <select
                    value={newCalibration.calibrationResults}
                    onChange={(e) => setNewCalibration({...newCalibration, calibrationResults: e.target.value})}
                    required
                  >
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                    <option value="limited">Limited</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Accuracy Tolerance</label>
                  <input
                    type="text"
                    value={newCalibration.accuracyTolerance}
                    onChange={(e) => setNewCalibration({...newCalibration, accuracyTolerance: e.target.value})}
                    placeholder="e.g., ±0.1% or ±1 lb"
                  />
                </div>

                <div className="form-group">
                  <label>Actual Accuracy</label>
                  <input
                    type="text"
                    value={newCalibration.actualAccuracy}
                    onChange={(e) => setNewCalibration({...newCalibration, actualAccuracy: e.target.value})}
                    placeholder="e.g., ±0.05% or ±0.5 lb"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Adjustments Made</label>
                <textarea
                  value={newCalibration.adjustmentsMade}
                  onChange={(e) => setNewCalibration({...newCalibration, adjustmentsMade: e.target.value})}
                  rows="3"
                  placeholder="Describe any adjustments or repairs made during calibration"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={newCalibration.notes}
                  onChange={(e) => setNewCalibration({...newCalibration, notes: e.target.value})}
                  rows="3"
                  placeholder="Additional notes about the calibration"
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCreateCalibration(false);
                    setShowScheduleNext(false);
                    resetNewCalibration();
                  }} 
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  {showScheduleNext ? 'Schedule Next Calibration' : 'Record Calibration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calibrations;
