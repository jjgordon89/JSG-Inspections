import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import './Deficiencies.css';

function Deficiencies() {
  const { currentUser } = useUser();
  const [deficiencies, setDeficiencies] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreateDeficiencyForm, setShowCreateDeficiencyForm] = useState(false);
  const [newDeficiency, setNewDeficiency] = useState({
    equipmentId: '',
    severity: 'minor',
    removeFromService: false,
    description: '',
    component: '',
    correctiveAction: '',
    dueDate: ''
  });

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [deficienciesResult, equipmentResult] = await Promise.all([
        filter === 'all' ? window.api.deficiencies.getAll() : window.api.deficiencies.getByStatus(filter),
        window.api.equipment.getAll()
      ]);
      
      setDeficiencies(deficienciesResult);
      setEquipment(equipmentResult);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeficiencies = async () => {
    try {
      setLoading(true);
      let result;
      
      if (filter === 'all') {
        result = await window.api.deficiencies.getAll();
      } else {
        result = await window.api.deficiencies.getByStatus(filter);
      }
      
      setDeficiencies(result);
    } catch (error) {
      console.error('Error fetching deficiencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeficiency = async (e) => {
    e.preventDefault();
    
    try {
      const createResult = await window.api.deficiencies.create({
        equipmentId: parseInt(newDeficiency.equipmentId),
        inspectionItemId: null,
        severity: newDeficiency.severity,
        removeFromService: newDeficiency.removeFromService,
        description: newDeficiency.description,
        component: newDeficiency.component,
        correctiveAction: newDeficiency.correctiveAction,
        dueDate: newDeficiency.dueDate || null,
        status: 'open'
      });
      const createdDeficiencyId = createResult?.lastID || createResult?.id || 0;

      // Log audit entry
      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'create',
        entityType: 'deficiency',
        entityId: createdDeficiencyId,
        oldValues: null,
        newValues: JSON.stringify(newDeficiency),
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      setShowCreateDeficiencyForm(false);
      setNewDeficiency({
        equipmentId: '',
        severity: 'minor',
        removeFromService: false,
        description: '',
        component: '',
        correctiveAction: '',
        dueDate: ''
      });
      
      await loadData();
    } catch (error) {
      console.error('Error creating deficiency:', error);
      alert('Failed to create deficiency. Please try again.');
    }
  };

  const handleCreateWorkOrderFromDeficiency = async (deficiency) => {
    try {
      const equipmentItem = equipment.find(eq => eq.id === deficiency.equipment_id);
      if (!equipmentItem) {
        alert('Equipment not found');
        return;
      }

      // Generate unique work order number
      const woNumber = `DEF-${equipmentItem.equipment_id}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      
      const workOrderData = {
        equipmentId: deficiency.equipment_id,
        woNumber,
        title: `Deficiency Repair - ${deficiency.component || equipmentItem.equipment_id}`,
        description: `${deficiency.description}\n\nCorrective Action: ${deficiency.corrective_action || 'To be determined'}`,
        workType: 'corrective',
        priority: deficiency.severity === 'critical' ? 'critical' : deficiency.severity === 'major' ? 'high' : 'medium',
        assignedTo: null,
        estimatedHours: null,
        createdBy: currentUser?.full_name || 'Unknown User',
        scheduledDate: deficiency.due_date,
        deficiencyId: deficiency.id
      };

      const createWOResult = await window.api.workOrders.create(workOrderData);
      const createdWOId = createWOResult?.lastID || createWOResult?.id || 0;

      // Link the deficiency to the work order
      await window.api.deficiencies.linkToWorkOrder(deficiency.id, createdWOId);

      // Log audit entries
      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'create',
        entityType: 'work_order',
        entityId: createdWOId,
        oldValues: null,
        newValues: JSON.stringify(workOrderData),
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'link',
        entityType: 'deficiency',
        entityId: deficiency.id,
        oldValues: JSON.stringify({ work_order_id: null }),
        newValues: JSON.stringify({ work_order_id: createdWOId }),
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      alert(`Work Order ${woNumber} created and linked to deficiency!`);
      await loadData();
      
    } catch (error) {
      console.error('Error creating work order from deficiency:', error);
      alert('Failed to create work order. Please try again.');
    }
  };

  const updateDeficiencyStatus = async (deficiencyId, newStatus) => {
    try {
      const deficiency = deficiencies.find(d => d.id === deficiencyId);
      if (!deficiency) return;

      const oldStatus = deficiency.status;

      await window.api.deficiencies.update({
        id: deficiencyId,
        severity: deficiency.severity,
        removeFromService: deficiency.remove_from_service,
        description: deficiency.description,
        component: deficiency.component,
        correctiveAction: deficiency.corrective_action,
        dueDate: deficiency.due_date,
        status: newStatus
      });

      // Log audit entry
      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'update',
        entityType: 'deficiency',
        entityId: deficiencyId,
        oldValues: JSON.stringify({ status: oldStatus }),
        newValues: JSON.stringify({ status: newStatus }),
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      fetchDeficiencies();
    } catch (error) {
      console.error('Error updating deficiency status:', error);
      alert('Failed to update deficiency status. Please try again.');
    }
  };

  const closeDeficiency = async (deficiencyId) => {
    try {
      const verificationSignature = currentUser?.full_name || 'Unknown User';
      await window.api.deficiencies.close(deficiencyId, verificationSignature);

      // Log audit entry
      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'close',
        entityType: 'deficiency',
        entityId: deficiencyId,
        oldValues: JSON.stringify({ status: 'verified' }),
        newValues: JSON.stringify({ status: 'closed', verificationSignature }),
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      fetchDeficiencies();
    } catch (error) {
      console.error('Error closing deficiency:', error);
      alert('Failed to close deficiency. Please try again.');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'major': return '#fd7e14';
      case 'minor': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#dc3545';
      case 'in_progress': return '#ffc107';
      case 'verified': return '#17a2b8';
      case 'closed': return '#28a745';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <div className="deficiencies-loading">Loading deficiencies...</div>;
  }

  return (
    <div className="deficiencies">
      <div className="deficiencies-header">
        <h2>Deficiency Management</h2>
        <div className="header-actions">
          <div className="deficiencies-filters">
            <label>Filter by status:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Deficiencies</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="verified">Verified</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <button 
            className="create-button"
            onClick={() => setShowCreateDeficiencyForm(true)}
          >
            + Create Deficiency
          </button>
        </div>
      </div>

      {deficiencies.length === 0 ? (
        <div className="no-deficiencies">
          <p>No deficiencies found for the selected filter.</p>
        </div>
      ) : (
        <div className="deficiencies-grid">
          {deficiencies.map((deficiency) => (
            <div key={deficiency.id} className="deficiency-card">
              <div className="deficiency-header">
                <div className="deficiency-badges">
                  <span 
                    className="severity-badge" 
                    style={{ backgroundColor: getSeverityColor(deficiency.severity) }}
                  >
                    {deficiency.severity.toUpperCase()}
                  </span>
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: getStatusColor(deficiency.status) }}
                  >
                    {deficiency.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {deficiency.remove_from_service && (
                    <span className="oos-badge">OUT OF SERVICE</span>
                  )}
                </div>
                <div className="deficiency-id">#{deficiency.id}</div>
              </div>

              <div className="deficiency-details">
                <h4>Equipment: {deficiency.equipment_identifier}</h4>
                {deficiency.component && (
                  <p><strong>Component:</strong> {deficiency.component}</p>
                )}
                <p><strong>Description:</strong> {deficiency.description}</p>
                {deficiency.corrective_action && (
                  <p><strong>Corrective Action:</strong> {deficiency.corrective_action}</p>
                )}
                <p><strong>Created:</strong> {formatDate(deficiency.created_at)}</p>
                {deficiency.due_date && (
                  <p><strong>Due Date:</strong> {formatDate(deficiency.due_date)}</p>
                )}
                {deficiency.closed_at && (
                  <p><strong>Closed:</strong> {formatDate(deficiency.closed_at)}</p>
                )}
              </div>

              <div className="deficiency-actions">
                {deficiency.status === 'open' && (
                  <>
                    <button 
                      onClick={() => updateDeficiencyStatus(deficiency.id, 'in_progress')}
                      className="progress-btn"
                    >
                      Start Work
                    </button>
                    <button 
                      onClick={() => handleCreateWorkOrderFromDeficiency(deficiency)}
                      className="create-wo-btn"
                    >
                      Create Work Order
                    </button>
                  </>
                )}
                {deficiency.status === 'in_progress' && (
                  <button 
                    onClick={() => updateDeficiencyStatus(deficiency.id, 'verified')}
                    className="verify-btn"
                  >
                    Mark Verified
                  </button>
                )}
                {deficiency.status === 'verified' && (
                  <button 
                    onClick={() => closeDeficiency(deficiency.id)}
                    className="close-btn"
                  >
                    Close Deficiency
                  </button>
                )}
                {deficiency.status !== 'closed' && (
                  <button 
                    onClick={() => {
                      // In a real app, this would open an edit modal
                      alert('Edit functionality would be implemented here');
                    }}
                    className="edit-btn"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Deficiency Modal */}
      {showCreateDeficiencyForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create Deficiency</h2>
              <button 
                className="close-button"
                onClick={() => setShowCreateDeficiencyForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateDeficiency} className="create-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Equipment *</label>
                  <select
                    value={newDeficiency.equipmentId}
                    onChange={(e) => setNewDeficiency({...newDeficiency, equipmentId: e.target.value})}
                    required
                  >
                    <option value="">Select Equipment</option>
                    {equipment.map(eq => (
                      <option key={eq.id} value={eq.id}>
                        {eq.equipment_id} - {eq.type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Severity *</label>
                  <select
                    value={newDeficiency.severity}
                    onChange={(e) => setNewDeficiency({...newDeficiency, severity: e.target.value})}
                    required
                  >
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Component</label>
                  <input
                    type="text"
                    value={newDeficiency.component}
                    onChange={(e) => setNewDeficiency({...newDeficiency, component: e.target.value})}
                    placeholder="e.g., Hydraulic System, Wire Rope, Hook Block"
                  />
                </div>

                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={newDeficiency.dueDate}
                    onChange={(e) => setNewDeficiency({...newDeficiency, dueDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={newDeficiency.description}
                  onChange={(e) => setNewDeficiency({...newDeficiency, description: e.target.value})}
                  required
                  rows="3"
                  placeholder="Detailed description of the deficiency"
                />
              </div>

              <div className="form-group">
                <label>Corrective Action</label>
                <textarea
                  value={newDeficiency.correctiveAction}
                  onChange={(e) => setNewDeficiency({...newDeficiency, correctiveAction: e.target.value})}
                  rows="3"
                  placeholder="Required corrective action to resolve the deficiency"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newDeficiency.removeFromService}
                    onChange={(e) => setNewDeficiency({...newDeficiency, removeFromService: e.target.checked})}
                  />
                  Remove equipment from service
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateDeficiencyForm(false)} className="cancel-button">
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  Create Deficiency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Deficiencies;
