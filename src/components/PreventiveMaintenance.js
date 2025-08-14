import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import './PreventiveMaintenance.css';

const PreventiveMaintenance = () => {
  const { currentUser } = useUser();
  const [pmTemplates, setPmTemplates] = useState([]);
  const [pmSchedules, setPmSchedules] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' or 'templates'
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    equipmentType: '',
    description: '',
    frequencyType: 'calendar',
    frequencyValue: '',
    frequencyUnit: 'days',
    estimatedDuration: '',
    instructions: '',
    requiredSkills: '',
    requiredParts: '',
    safetyNotes: ''
  });

  const [newSchedule, setNewSchedule] = useState({
    equipmentId: '',
    pmTemplateId: '',
    nextDueDate: '',
    nextDueUsage: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [templatesData, equipmentData] = await Promise.all([
        window.api.pmTemplates.getAll(),
        window.api.equipment.getAll()
      ]);

      setPmTemplates(templatesData);
      setEquipment(equipmentData);

      // Load schedules for all equipment
      const schedulesPromises = equipmentData.map(eq => 
        window.api.pmSchedules.getByEquipmentId(eq.id)
      );
      const schedulesResults = await Promise.all(schedulesPromises);
      const allSchedules = schedulesResults.flat();
      setPmSchedules(allSchedules);

    } catch (err) {
      console.error('Error loading PM data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    
    try {
      const createTemplateResult = await window.api.pmTemplates.create({
        name: newTemplate.name,
        equipmentType: newTemplate.equipmentType,
        description: newTemplate.description,
        frequencyType: newTemplate.frequencyType,
        frequencyValue: parseInt(newTemplate.frequencyValue),
        frequencyUnit: newTemplate.frequencyUnit,
        estimatedDuration: newTemplate.estimatedDuration ? parseFloat(newTemplate.estimatedDuration) : null,
        instructions: newTemplate.instructions,
        requiredSkills: newTemplate.requiredSkills ? JSON.stringify(newTemplate.requiredSkills.split(',').map(s => s.trim())) : null,
        requiredParts: newTemplate.requiredParts ? JSON.stringify(newTemplate.requiredParts.split(',').map(s => s.trim())) : null,
        safetyNotes: newTemplate.safetyNotes
      });
      const createdTemplateId = createTemplateResult?.lastID || createTemplateResult?.id || 0;

      // Log audit entry
      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'create',
        entityType: 'pm_template',
        entityId: createdTemplateId,
        oldValues: null,
        newValues: JSON.stringify(newTemplate),
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      setShowCreateTemplate(false);
      setNewTemplate({
        name: '',
        equipmentType: '',
        description: '',
        frequencyType: 'calendar',
        frequencyValue: '',
        frequencyUnit: 'days',
        estimatedDuration: '',
        instructions: '',
        requiredSkills: '',
        requiredParts: '',
        safetyNotes: ''
      });
      
      await loadData();
    } catch (err) {
      console.error('Error creating PM template:', err);
      setError(err.message);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    
    try {
      const createScheduleResult = await window.api.pmSchedules.create({
        equipmentId: parseInt(newSchedule.equipmentId),
        pmTemplateId: parseInt(newSchedule.pmTemplateId),
        nextDueDate: newSchedule.nextDueDate,
        nextDueUsage: newSchedule.nextDueUsage ? parseFloat(newSchedule.nextDueUsage) : null
      });
      const createdScheduleId = createScheduleResult?.lastID || createScheduleResult?.id || 0;

      // Log audit entry
      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'create',
        entityType: 'pm_schedule',
        entityId: createdScheduleId,
        oldValues: null,
        newValues: JSON.stringify(newSchedule),
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      setShowCreateSchedule(false);
      setNewSchedule({
        equipmentId: '',
        pmTemplateId: '',
        nextDueDate: '',
        nextDueUsage: ''
      });
      
      await loadData();
    } catch (err) {
      console.error('Error creating PM schedule:', err);
      setError(err.message);
    }
  };

  const getFrequencyDisplay = (template) => {
    const { frequency_type, frequency_value, frequency_unit } = template;
    
    if (frequency_type === 'calendar') {
      return `Every ${frequency_value} ${frequency_unit}`;
    } else if (frequency_type === 'usage') {
      return `Every ${frequency_value} ${frequency_unit}`;
    } else {
      return `Condition-based (${frequency_value} ${frequency_unit})`;
    }
  };

  const getDueStatus = (dueDate) => {
    if (!dueDate) return 'no-date';
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 7) return 'due-soon';
    if (diffDays <= 30) return 'upcoming';
    return 'current';
  };

  const getDueStatusBadge = (dueDate) => {
    const status = getDueStatus(dueDate);
    const statusConfig = {
      'overdue': { class: 'due-overdue', label: 'Overdue' },
      'due-soon': { class: 'due-soon', label: 'Due Soon' },
      'upcoming': { class: 'due-upcoming', label: 'Upcoming' },
      'current': { class: 'due-current', label: 'Current' },
      'no-date': { class: 'due-no-date', label: 'No Date' }
    };

    const config = statusConfig[status];
    return <span className={`due-badge ${config.class}`}>{config.label}</span>;
  };

  const handleGenerateWorkOrder = async (schedule) => {
    try {
      const equipmentItem = equipment.find(eq => eq.id === schedule.equipment_id);
      const template = pmTemplates.find(t => t.id === schedule.pm_template_id);
      
      if (!equipmentItem || !template) {
        setError('Equipment or template not found');
        return;
      }

      // Generate unique work order number
      const woNumber = `PM-${equipmentItem.equipment_id}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      
      const workOrderData = {
        equipmentId: schedule.equipment_id,
        woNumber,
        title: `${template.name} - ${equipmentItem.equipment_id}`,
        description: template.description || `Preventive maintenance for ${equipmentItem.equipment_id}`,
        workType: 'preventive',
        priority: getDueStatus(schedule.next_due_date) === 'overdue' ? 'high' : 'medium',
        assignedTo: null,
        estimatedHours: template.estimated_duration || null,
        createdBy: currentUser?.full_name || 'Unknown User',
        scheduledDate: schedule.next_due_date,
        deficiencyId: null,
        pmScheduleId: schedule.id
      };

      const createWOResult = await window.api.workOrders.create(workOrderData);
      const createdWOId = createWOResult?.lastID || createWOResult?.id || 0;

      // Log audit entry
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

      alert(`Work Order ${woNumber} created successfully!`);
      await loadData(); // Refresh data to show updated state
      
    } catch (err) {
      console.error('Error generating work order:', err);
      setError(err.message);
    }
  };

  const calculateNextDueDate = (template, lastCompletedDate = null) => {
    const baseDate = lastCompletedDate ? new Date(lastCompletedDate) : new Date();
    const { frequency_type, frequency_value, frequency_unit } = template;
    
    if (frequency_type === 'calendar') {
      switch (frequency_unit) {
        case 'days':
          baseDate.setDate(baseDate.getDate() + frequency_value);
          break;
        case 'weeks':
          baseDate.setDate(baseDate.getDate() + (frequency_value * 7));
          break;
        case 'months':
          baseDate.setMonth(baseDate.getMonth() + frequency_value);
          break;
        default:
          baseDate.setDate(baseDate.getDate() + frequency_value);
      }
    }
    
    return baseDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  };

  const handleUpdatePMScheduleAfterCompletion = async (pmScheduleId, completedDate) => {
    try {
      const schedule = pmSchedules.find(s => s.id === pmScheduleId);
      if (!schedule) return;

      const template = pmTemplates.find(t => t.id === schedule.pm_template_id);
      if (!template) return;

      const nextDueDate = calculateNextDueDate(template, completedDate);
      
      await window.api.pmSchedules.updateDue({
        id: pmScheduleId,
        nextDueDate,
        nextDueUsage: null, // For now, we'll handle usage-based separately
        lastCompletedDate: completedDate,
        lastCompletedUsage: null
      });

      // Log audit entry
      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'update',
        entityType: 'pm_schedule',
        entityId: pmScheduleId,
        oldValues: JSON.stringify({ 
          next_due_date: schedule.next_due_date,
          last_completed_date: schedule.last_completed_date 
        }),
        newValues: JSON.stringify({ 
          next_due_date: nextDueDate,
          last_completed_date: completedDate 
        }),
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      await loadData(); // Refresh data to show updated schedule
      
    } catch (err) {
      console.error('Error updating PM schedule:', err);
      setError(err.message);
    }
  };

  const getEquipmentTypes = () => {
    return [...new Set(equipment.map(eq => eq.type).filter(Boolean))];
  };

  if (loading) {
    return (
      <div className="preventive-maintenance">
        <div className="pm-header">
          <h1>Preventive Maintenance</h1>
        </div>
        <div className="loading-spinner">Loading PM data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="preventive-maintenance">
        <div className="pm-header">
          <h1>Preventive Maintenance</h1>
        </div>
        <div className="error-message">
          <p>Error loading PM data: {error}</p>
          <button onClick={loadData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="preventive-maintenance">
      <div className="pm-header">
        <h1>Preventive Maintenance</h1>
        <div className="header-actions">
          <div className="tab-selector">
            <button 
              className={`tab-button ${activeTab === 'schedules' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedules')}
            >
              📅 Schedules ({pmSchedules.length})
            </button>
            <button 
              className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              📋 Templates ({pmTemplates.length})
            </button>
          </div>
          <div className="action-buttons">
            {activeTab === 'schedules' && (
              <button 
                className="create-button"
                onClick={() => setShowCreateSchedule(true)}
              >
                + Schedule PM
              </button>
            )}
            {activeTab === 'templates' && (
              <button 
                className="create-button"
                onClick={() => setShowCreateTemplate(true)}
              >
                + Create Template
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PM Schedules Tab */}
      {activeTab === 'schedules' && (
        <div className="pm-schedules">
          <div className="pm-summary">
            <div className="summary-card">
              <span className="summary-value">{pmSchedules.length}</span>
              <span className="summary-label">Total Schedules</span>
            </div>
            <div className="summary-card">
              <span className="summary-value status-warning">
                {pmSchedules.filter(s => getDueStatus(s.next_due_date) === 'due-soon').length}
              </span>
              <span className="summary-label">Due Soon</span>
            </div>
            <div className="summary-card">
              <span className="summary-value status-critical">
                {pmSchedules.filter(s => getDueStatus(s.next_due_date) === 'overdue').length}
              </span>
              <span className="summary-label">Overdue</span>
            </div>
            <div className="summary-card">
              <span className="summary-value status-good">
                {pmSchedules.filter(s => getDueStatus(s.next_due_date) === 'current').length}
              </span>
              <span className="summary-label">Current</span>
            </div>
          </div>

          <div className="schedules-list">
            {pmSchedules.length === 0 ? (
              <div className="empty-state">
                <p>No PM schedules configured.</p>
                <button 
                  className="create-button"
                  onClick={() => setShowCreateSchedule(true)}
                >
                  Create First Schedule
                </button>
              </div>
            ) : (
              pmSchedules.map(schedule => {
                const equipmentItem = equipment.find(eq => eq.id === schedule.equipment_id);
                return (
                  <div key={schedule.id} className="schedule-card">
                    <div className="schedule-header">
                      <div className="schedule-title">
                        <h3>{schedule.template_name}</h3>
                        <span className="schedule-equipment">
                          {equipmentItem?.equipment_id} - {equipmentItem?.type}
                        </span>
                      </div>
                      <div className="schedule-badges">
                        {getDueStatusBadge(schedule.next_due_date)}
                        <span className="frequency-badge">
                          {getFrequencyDisplay(schedule)}
                        </span>
                      </div>
                    </div>

                    <div className="schedule-details">
                      <div className="detail-row">
                        <span className="detail-label">Next Due:</span>
                        <span className="detail-value">
                          {schedule.next_due_date ? new Date(schedule.next_due_date).toLocaleDateString() : 'Not scheduled'}
                        </span>
                      </div>
                      {schedule.last_completed_date && (
                        <div className="detail-row">
                          <span className="detail-label">Last Completed:</span>
                          <span className="detail-value">{new Date(schedule.last_completed_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {schedule.next_due_usage && (
                        <div className="detail-row">
                          <span className="detail-label">Usage Due:</span>
                          <span className="detail-value">{schedule.next_due_usage} {schedule.frequency_unit}</span>
                        </div>
                      )}
                    </div>

                    <div className="schedule-actions">
                      <button 
                        className="action-button generate-wo"
                        onClick={() => handleGenerateWorkOrder(schedule)}
                      >
                        Generate Work Order
                      </button>
                      <button className="action-button view-history">
                        View History
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* PM Templates Tab */}
      {activeTab === 'templates' && (
        <div className="pm-templates">
          <div className="templates-summary">
            <div className="summary-card">
              <span className="summary-value">{pmTemplates.length}</span>
              <span className="summary-label">Total Templates</span>
            </div>
            <div className="summary-card">
              <span className="summary-value status-good">
                {pmTemplates.filter(t => t.frequency_type === 'calendar').length}
              </span>
              <span className="summary-label">Calendar-Based</span>
            </div>
            <div className="summary-card">
              <span className="summary-value status-warning">
                {pmTemplates.filter(t => t.frequency_type === 'usage').length}
              </span>
              <span className="summary-label">Usage-Based</span>
            </div>
            <div className="summary-card">
              <span className="summary-value status-info">
                {pmTemplates.filter(t => t.frequency_type === 'condition').length}
              </span>
              <span className="summary-label">Condition-Based</span>
            </div>
          </div>

          <div className="templates-list">
            {pmTemplates.length === 0 ? (
              <div className="empty-state">
                <p>No PM templates created.</p>
                <button 
                  className="create-button"
                  onClick={() => setShowCreateTemplate(true)}
                >
                  Create First Template
                </button>
              </div>
            ) : (
              pmTemplates.map(template => (
                <div key={template.id} className="template-card">
                  <div className="template-header">
                    <div className="template-title">
                      <h3>{template.name}</h3>
                      <span className="template-equipment-type">{template.equipment_type}</span>
                    </div>
                    <div className="template-badges">
                      <span className={`frequency-type-badge ${template.frequency_type}`}>
                        {template.frequency_type}
                      </span>
                      <span className="frequency-badge">
                        {getFrequencyDisplay(template)}
                      </span>
                    </div>
                  </div>

                  {template.description && (
                    <div className="template-description">
                      <p>{template.description}</p>
                    </div>
                  )}

                  <div className="template-details">
                    {template.estimated_duration && (
                      <div className="detail-row">
                        <span className="detail-label">Estimated Duration:</span>
                        <span className="detail-value">{template.estimated_duration} hours</span>
                      </div>
                    )}
                    {template.required_skills && (
                      <div className="detail-row">
                        <span className="detail-label">Required Skills:</span>
                        <span className="detail-value">
                          {JSON.parse(template.required_skills).join(', ')}
                        </span>
                      </div>
                    )}
                    {template.required_parts && (
                      <div className="detail-row">
                        <span className="detail-label">Required Parts:</span>
                        <span className="detail-value">
                          {JSON.parse(template.required_parts).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {template.instructions && (
                    <div className="template-instructions">
                      <h4>Instructions:</h4>
                      <p>{template.instructions}</p>
                    </div>
                  )}

                  {template.safety_notes && (
                    <div className="template-safety">
                      <h4>⚠️ Safety Notes:</h4>
                      <p>{template.safety_notes}</p>
                    </div>
                  )}

                  <div className="template-actions">
                    <button className="action-button edit">
                      Edit Template
                    </button>
                    <button className="action-button create-schedule">
                      Create Schedule
                    </button>
                    <button className="action-button deactivate">
                      Deactivate
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateTemplate && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h2>Create PM Template</h2>
              <button 
                className="close-button"
                onClick={() => setShowCreateTemplate(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="create-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Template Name *</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    required
                    placeholder="e.g., Monthly Crane Inspection"
                  />
                </div>

                <div className="form-group">
                  <label>Equipment Type *</label>
                  <select
                    value={newTemplate.equipmentType}
                    onChange={(e) => setNewTemplate({...newTemplate, equipmentType: e.target.value})}
                    required
                  >
                    <option value="">Select Equipment Type</option>
                    {getEquipmentTypes().map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  rows="3"
                  placeholder="Brief description of the maintenance procedure"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Frequency Type *</label>
                  <select
                    value={newTemplate.frequencyType}
                    onChange={(e) => setNewTemplate({...newTemplate, frequencyType: e.target.value})}
                    required
                  >
                    <option value="calendar">Calendar-Based</option>
                    <option value="usage">Usage-Based</option>
                    <option value="condition">Condition-Based</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Frequency Value *</label>
                  <input
                    type="number"
                    min="1"
                    value={newTemplate.frequencyValue}
                    onChange={(e) => setNewTemplate({...newTemplate, frequencyValue: e.target.value})}
                    required
                    placeholder="e.g., 30"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Frequency Unit</label>
                  <select
                    value={newTemplate.frequencyUnit}
                    onChange={(e) => setNewTemplate({...newTemplate, frequencyUnit: e.target.value})}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="hours">Hours</option>
                    <option value="cycles">Cycles</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Estimated Duration (hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newTemplate.estimatedDuration}
                    onChange={(e) => setNewTemplate({...newTemplate, estimatedDuration: e.target.value})}
                    placeholder="e.g., 2.5"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Instructions</label>
                <textarea
                  value={newTemplate.instructions}
                  onChange={(e) => setNewTemplate({...newTemplate, instructions: e.target.value})}
                  rows="4"
                  placeholder="Detailed step-by-step maintenance instructions"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Required Skills (comma-separated)</label>
                  <input
                    type="text"
                    value={newTemplate.requiredSkills}
                    onChange={(e) => setNewTemplate({...newTemplate, requiredSkills: e.target.value})}
                    placeholder="e.g., Electrical, Hydraulics, Rigging"
                  />
                </div>

                <div className="form-group">
                  <label>Required Parts (comma-separated)</label>
                  <input
                    type="text"
                    value={newTemplate.requiredParts}
                    onChange={(e) => setNewTemplate({...newTemplate, requiredParts: e.target.value})}
                    placeholder="e.g., Oil filter, Hydraulic fluid, Grease"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Safety Notes</label>
                <textarea
                  value={newTemplate.safetyNotes}
                  onChange={(e) => setNewTemplate({...newTemplate, safetyNotes: e.target.value})}
                  rows="3"
                  placeholder="Important safety considerations and precautions"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateTemplate(false)} className="cancel-button">
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Schedule Modal */}
      {showCreateSchedule && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create PM Schedule</h2>
              <button 
                className="close-button"
                onClick={() => setShowCreateSchedule(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="create-form">
              <div className="form-group">
                <label>Equipment *</label>
                <select
                  value={newSchedule.equipmentId}
                  onChange={(e) => setNewSchedule({...newSchedule, equipmentId: e.target.value})}
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
                <label>PM Template *</label>
                <select
                  value={newSchedule.pmTemplateId}
                  onChange={(e) => setNewSchedule({...newSchedule, pmTemplateId: e.target.value})}
                  required
                >
                  <option value="">Select PM Template</option>
                  {pmTemplates
                    .filter(template => {
                      if (!newSchedule.equipmentId) return true;
                      const selectedEquipment = equipment.find(eq => eq.id === parseInt(newSchedule.equipmentId));
                      return selectedEquipment && template.equipment_type === selectedEquipment.type;
                    })
                    .map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({getFrequencyDisplay(template)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Next Due Date *</label>
                <input
                  type="date"
                  value={newSchedule.nextDueDate}
                  onChange={(e) => setNewSchedule({...newSchedule, nextDueDate: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Next Due Usage (if usage-based)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newSchedule.nextDueUsage}
                  onChange={(e) => setNewSchedule({...newSchedule, nextDueUsage: e.target.value})}
                  placeholder="e.g., 1000 (hours/cycles)"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateSchedule(false)} className="cancel-button">
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreventiveMaintenance;
