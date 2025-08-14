import React from 'react';
import './WorkOrderCompletionForm.css';

const WorkOrderCompletionForm = ({ 
  workOrder, 
  completionData, 
  setCompletionData, 
  onSubmit, 
  onCancel 
}) => {
  const handleInputChange = (field, value) => {
    setCompletionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateTotalCost = () => {
    const partsCost = parseFloat(completionData.partsCost) || 0;
    const laborCost = parseFloat(completionData.laborCost) || 0;
    return (partsCost + laborCost).toFixed(2);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Complete Work Order - {workOrder.wo_number}</h2>
          <button 
            className="close-button"
            onClick={onCancel}
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="completion-form">
          <div className="completion-summary">
            <h3>{workOrder.title}</h3>
            <div className="summary-details">
              <div className="summary-item">
                <span className="summary-label">Equipment:</span>
                <span className="summary-value">{workOrder.equipment_identifier}</span>
              </div>
              {workOrder.estimated_hours && (
                <div className="summary-item">
                  <span className="summary-label">Estimated Hours:</span>
                  <span className="summary-value">{workOrder.estimated_hours}h</span>
                </div>
              )}
              <div className="summary-item">
                <span className="summary-label">Work Type:</span>
                <span className="summary-value">{workOrder.work_type}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Priority:</span>
                <span className="summary-value">{workOrder.priority}</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Work Completion Details</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label>Actual Hours Worked *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={completionData.actualHours}
                  onChange={(e) => handleInputChange('actualHours', e.target.value)}
                  placeholder="0.0"
                  required
                />
                <small className="form-help">
                  Total time spent on this work order
                </small>
              </div>

              <div className="form-group">
                <label>Parts Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={completionData.partsCost}
                  onChange={(e) => handleInputChange('partsCost', e.target.value)}
                  placeholder="0.00"
                />
                <small className="form-help">
                  Cost of parts and materials used
                </small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Labor Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={completionData.laborCost}
                  onChange={(e) => handleInputChange('laborCost', e.target.value)}
                  placeholder="0.00"
                />
                <small className="form-help">
                  Labor charges for this work
                </small>
              </div>

              <div className="form-group">
                <label>Total Cost</label>
                <input
                  type="text"
                  value={`$${calculateTotalCost()}`}
                  disabled
                  className="calculated-field"
                />
                <small className="form-help">
                  Automatically calculated total
                </small>
              </div>
            </div>

            <div className="form-group">
              <label>Completion Notes *</label>
              <textarea
                value={completionData.completionNotes}
                onChange={(e) => handleInputChange('completionNotes', e.target.value)}
                rows="6"
                placeholder="Describe work performed, any issues encountered, parts used, and recommendations for future maintenance..."
                required
              />
              <small className="form-help">
                Detailed description of work completed, issues found, and recommendations
              </small>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Complete Work Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkOrderCompletionForm;