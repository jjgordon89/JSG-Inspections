import React from 'react';
import './WorkOrderCreateForm.css';

const WorkOrderCreateForm = ({ 
  newWorkOrder, 
  setNewWorkOrder, 
  equipment, 
  onSubmit, 
  onCancel 
}) => {
  const handleInputChange = (field, value) => {
    setNewWorkOrder(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Work Order</h2>
          <button 
            className="close-button"
            onClick={onCancel}
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="create-form">
          <div className="form-row">
            <div className="form-group">
              <label>Equipment *</label>
              <select
                value={newWorkOrder.equipmentId}
                onChange={(e) => handleInputChange('equipmentId', e.target.value)}
                required
              >
                <option value="">Select Equipment</option>
                {equipment.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.identifier} - {eq.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Work Type</label>
              <select
                value={newWorkOrder.workType}
                onChange={(e) => handleInputChange('workType', e.target.value)}
              >
                <option value="corrective">Corrective</option>
                <option value="preventive">Preventive</option>
                <option value="emergency">Emergency</option>
                <option value="project">Project</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={newWorkOrder.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Brief description of work to be performed"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={newWorkOrder.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows="4"
              placeholder="Detailed description of the work required, including any specific instructions or safety considerations"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select
                value={newWorkOrder.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="form-group">
              <label>Estimated Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={newWorkOrder.estimatedHours}
                onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
                placeholder="0.0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Assigned To</label>
              <input
                type="text"
                value={newWorkOrder.assignedTo}
                onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                placeholder="Technician or team member name"
              />
            </div>

            <div className="form-group">
              <label>Scheduled Date</label>
              <input
                type="date"
                value={newWorkOrder.scheduledDate}
                onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Create Work Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkOrderCreateForm;