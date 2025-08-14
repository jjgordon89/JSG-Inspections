import React, { useState, useEffect } from 'react';
import './Scheduler.css';

function Scheduler() {
  const [scheduledInspections, setScheduledInspections] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [assignedInspector, setAssignedInspector] = useState('');
  const [editingInspection, setEditingInspection] = useState(null);

  useEffect(() => {
    fetchScheduledInspections();
    fetchEquipment();
  }, []);

  const fetchScheduledInspections = async () => {
    try {
      const inspections = await window.api.secureOperation('scheduledInspections', 'getAll');
      setScheduledInspections(inspections);
    } catch (error) {
      console.error('Error fetching scheduled inspections:', error);
    }
  };

  const fetchEquipment = async () => {
    try {
      const equipmentList = await window.api.secureOperation('equipment', 'getAll');
      setEquipment(equipmentList);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  const resetForm = () => {
    setSelectedEquipment('');
    setScheduledDate('');
    setAssignedInspector('');
    setEditingInspection(null);
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEquipment || !scheduledDate) {
      alert('Please select equipment and a date.');
      return;
    }

    try {
      if (editingInspection) {
        // Update existing inspection
        await window.api.secureOperation('scheduledInspections', 'update', {
          equipmentId: parseInt(selectedEquipment),
          scheduledDate,
          assignedInspector,
          id: editingInspection.id
        });
      } else {
        // Add new inspection
        await window.api.secureOperation('scheduledInspections', 'create', {
          equipmentId: parseInt(selectedEquipment),
          scheduledDate,
          assignedInspector,
          status: 'scheduled'
        });
      }

      fetchScheduledInspections();
      resetForm();
    } catch (error) {
      console.error('Error saving scheduled inspection:', error);
      alert('Failed to save scheduled inspection. Please try again.');
    }
  };

  const handleEditInspection = (inspection) => {
    setEditingInspection(inspection);
    setSelectedEquipment(inspection.equipment_id);
    setScheduledDate(inspection.scheduled_date);
    setAssignedInspector(inspection.assigned_inspector);
  };

  const handleDeleteInspection = async (id) => {
    if (window.confirm('Are you sure you want to delete this scheduled inspection?')) {
      try {
        await window.api.secureOperation('scheduledInspections', 'delete', { id });
        fetchScheduledInspections();
      } catch (error) {
        console.error('Error deleting scheduled inspection:', error);
        alert('Failed to delete scheduled inspection. Please try again.');
      }
    }
  };

  const handleStatusChange = async (inspectionId, newStatus) => {
    try {
      await window.api.secureOperation('scheduledInspections', 'updateStatus', {
        id: inspectionId,
        status: newStatus
      });
      fetchScheduledInspections();
    } catch (error) {
      console.error('Error updating inspection status:', error);
      alert('Failed to update inspection status. Please try again.');
    }
  };

  const startInspection = (inspection) => {
    // This would typically navigate to the inspection form
    // For now, we'll just update the status to in_progress
    handleStatusChange(inspection.id, 'in_progress');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return '#007bff';
      case 'in_progress': return '#ffc107';
      case 'completed': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <div className="scheduler">
      <h2>Inspection Scheduler</h2>
      <form onSubmit={handleFormSubmit} className="scheduler-form">
        <select
          value={selectedEquipment}
          onChange={(e) => setSelectedEquipment(e.target.value)}
          required
        >
          <option value="">Select Equipment</option>
          {equipment.map((item) => (
            <option key={item.id} value={item.id}>
              {item.equipment_id} - {item.type}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Assigned Inspector"
          value={assignedInspector}
          onChange={(e) => setAssignedInspector(e.target.value)}
        />
        <button type="submit">{editingInspection ? 'Update Inspection' : 'Schedule Inspection'}</button>
        {editingInspection && <button type="button" onClick={resetForm}>Cancel Edit</button>}
      </form>

      <div className="scheduled-inspections-list">
        <h3>Scheduled Inspections</h3>
        {scheduledInspections.length === 0 ? (
          <p>No scheduled inspections found.</p>
        ) : (
          <div className="inspections-grid">
            {scheduledInspections.map((inspection) => (
              <div key={inspection.id} className="inspection-card">
                <div className="inspection-header">
                  <h4>{inspection.equipmentIdentifier}</h4>
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: getStatusColor(inspection.status) }}
                  >
                    {inspection.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="inspection-details">
                  <p><strong>Date:</strong> {new Date(inspection.scheduled_date).toLocaleDateString()}</p>
                  <p><strong>Inspector:</strong> {inspection.assigned_inspector || 'Unassigned'}</p>
                </div>
                <div className="inspection-actions">
                  {inspection.status === 'scheduled' && (
                    <button 
                      onClick={() => startInspection(inspection)}
                      className="start-btn"
                    >
                      Start Inspection
                    </button>
                  )}
                  {inspection.status === 'in_progress' && (
                    <button 
                      onClick={() => handleStatusChange(inspection.id, 'completed')}
                      className="complete-btn"
                    >
                      Mark Complete
                    </button>
                  )}
                  <button 
                    onClick={() => handleEditInspection(inspection)}
                    className="edit-btn"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteInspection(inspection.id)} 
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Scheduler;
