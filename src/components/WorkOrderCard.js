import React from 'react';
import './WorkOrderCard.css';

const WorkOrderCard = ({ 
  workOrder, 
  onStatusChange, 
  onComplete, 
  onViewDetails,
  getStatusBadge,
  getPriorityBadge,
  getWorkTypeBadge 
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const canChangeStatus = (currentStatus) => {
    return ['draft', 'approved', 'assigned', 'in_progress'].includes(currentStatus);
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      'draft': 'approved',
      'approved': 'assigned',
      'assigned': 'in_progress',
      'in_progress': 'completed'
    };
    return statusFlow[currentStatus];
  };

  const getStatusAction = (status) => {
    const actions = {
      'draft': 'Approve',
      'approved': 'Assign',
      'assigned': 'Start Work',
      'in_progress': 'Complete'
    };
    return actions[status] || 'Update';
  };

  return (
    <div className="work-order-card">
      <div className="card-header">
        <div className="wo-number">{workOrder.wo_number}</div>
        <div className="card-badges">
          {getStatusBadge(workOrder.status)}
          {getPriorityBadge(workOrder.priority)}
          {getWorkTypeBadge(workOrder.work_type)}
        </div>
      </div>

      <div className="card-content">
        <h3 className="wo-title">{workOrder.title}</h3>
        <p className="wo-description">{workOrder.description}</p>
        
        <div className="wo-details">
          <div className="detail-item">
            <span className="detail-label">Equipment:</span>
            <span className="detail-value">{workOrder.equipment_identifier}</span>
          </div>
          
          {workOrder.assigned_to && (
            <div className="detail-item">
              <span className="detail-label">Assigned to:</span>
              <span className="detail-value">{workOrder.assigned_to}</span>
            </div>
          )}
          
          <div className="detail-item">
            <span className="detail-label">Created:</span>
            <span className="detail-value">{formatDate(workOrder.created_at)}</span>
          </div>
          
          {workOrder.scheduled_date && (
            <div className="detail-item">
              <span className="detail-label">Scheduled:</span>
              <span className="detail-value">{formatDate(workOrder.scheduled_date)}</span>
            </div>
          )}
          
          {workOrder.estimated_hours && (
            <div className="detail-item">
              <span className="detail-label">Est. Hours:</span>
              <span className="detail-value">{workOrder.estimated_hours}h</span>
            </div>
          )}
          
          {workOrder.actual_hours && (
            <div className="detail-item">
              <span className="detail-label">Actual Hours:</span>
              <span className="detail-value">{workOrder.actual_hours}h</span>
            </div>
          )}
          
          {(workOrder.parts_cost || workOrder.labor_cost) && (
            <div className="detail-item">
              <span className="detail-label">Total Cost:</span>
              <span className="detail-value">
                {formatCurrency((workOrder.parts_cost || 0) + (workOrder.labor_cost || 0))}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="card-actions">
        <button 
          className="view-details-btn"
          onClick={() => onViewDetails(workOrder)}
        >
          View Details
        </button>
        
        {canChangeStatus(workOrder.status) && (
          <>
            {workOrder.status === 'in_progress' ? (
              <button 
                className="complete-btn"
                onClick={() => onComplete(workOrder)}
              >
                Complete
              </button>
            ) : (
              <button 
                className="status-btn"
                onClick={() => onStatusChange(workOrder.id, getNextStatus(workOrder.status))}
              >
                {getStatusAction(workOrder.status)}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WorkOrderCard;