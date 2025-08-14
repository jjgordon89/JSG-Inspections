import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import WorkOrderCard from './WorkOrderCard';
import WorkOrderCreateForm from './WorkOrderCreateForm';
import WorkOrderCompletionForm from './WorkOrderCompletionForm';
import './WorkOrders.css';

const WorkOrders = () => {
  const { currentUser } = useUser();
  const [workOrders, setWorkOrders] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [completionData, setCompletionData] = useState({
    actualHours: '',
    partsCost: '',
    laborCost: '',
    completionNotes: ''
  });

  const [newWorkOrder, setNewWorkOrder] = useState({
    equipmentId: '',
    title: '',
    description: '',
    workType: 'corrective',
    priority: 'medium',
    assignedTo: '',
    estimatedHours: '',
    scheduledDate: '',
    deficiencyId: null
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [workOrdersData, equipmentData] = await Promise.all([
        window.api.workOrders.getAll(),
        window.api.equipment.getAll()
      ]);

      setWorkOrders(workOrdersData);
      setEquipment(equipmentData);
    } catch (err) {
      console.error('Error loading work orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateWONumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `WO-${timestamp}`;
  };

  const handleCreateWorkOrder = async (e) => {
    e.preventDefault();
    
    try {
      const woNumber = generateWONumber();
      const selectedEquipment = equipment.find(eq => eq.id === parseInt(newWorkOrder.equipmentId));
      
      if (!selectedEquipment) {
        throw new Error('Please select valid equipment');
      }

      const createResult = await window.api.workOrders.create({
        equipmentId: parseInt(newWorkOrder.equipmentId),
        woNumber,
        title: newWorkOrder.title,
        description: newWorkOrder.description,
        workType: newWorkOrder.workType,
        priority: newWorkOrder.priority,
        assignedTo: newWorkOrder.assignedTo || null,
        estimatedHours: newWorkOrder.estimatedHours ? parseFloat(newWorkOrder.estimatedHours) : null,
        createdBy: currentUser?.full_name || 'Unknown User',
        scheduledDate: newWorkOrder.scheduledDate || null,
        deficiencyId: newWorkOrder.deficiencyId
      });
      const createdWorkOrderId = createResult?.lastID || createResult?.id || 0;

      // Log audit entry
      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'create',
        entityType: 'work_order',
        entityId: createdWorkOrderId,
        oldValues: null,
        newValues: JSON.stringify({ ...newWorkOrder, woNumber }),
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      setShowCreateForm(false);
      setNewWorkOrder({
        equipmentId: '',
        title: '',
        description: '',
        workType: 'corrective',
        priority: 'medium',
        assignedTo: '',
        estimatedHours: '',
        scheduledDate: '',
        deficiencyId: null
      });
      
      await loadData();
    } catch (err) {
      console.error('Error creating work order:', err);
      setError(err.message);
    }
  };

  const handleStatusChange = async (workOrderId, newStatus) => {
    try {
      const now = new Date().toISOString();
      const updateParams = {
        id: workOrderId,
        status: newStatus,
        startedAt: newStatus === 'in_progress' ? now : null,
        completedAt: newStatus === 'completed' ? now : null,
        closedAt: newStatus === 'closed' ? now : null
      };

      await window.api.workOrders.updateStatus(updateParams);
      
      // Log audit entry
      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'update',
        entityType: 'work_order',
        entityId: workOrderId,
        oldValues: null,
        newValues: JSON.stringify({ status: newStatus }),
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      await loadData();
    } catch (err) {
      console.error('Error updating work order status:', err);
      setError(err.message);
    }
  };

  const handleCompleteWorkOrder = async (workOrder) => {
    setSelectedWorkOrder(workOrder);
    setCompletionData({
      actualHours: '',
      partsCost: '',
      laborCost: '',
      completionNotes: ''
    });
    setShowCompletionForm(true);
  };

  const handleSubmitCompletion = async (e) => {
    e.preventDefault();
    
    try {
      await window.api.workOrders.complete({
        id: selectedWorkOrder.id,
        actualHours: completionData.actualHours ? parseFloat(completionData.actualHours) : null,
        partsCost: completionData.partsCost ? parseFloat(completionData.partsCost) : null,
        laborCost: completionData.laborCost ? parseFloat(completionData.laborCost) : null,
        completionNotes: completionData.completionNotes || null
      });

      // Log audit entry
      await window.api.auditLog.create({
        userId: currentUser?.id || null,
        username: currentUser?.username || 'Unknown User',
        action: 'complete',
        entityType: 'work_order',
        entityId: selectedWorkOrder.id,
        oldValues: JSON.stringify({ status: 'in_progress' }),
        newValues: JSON.stringify({ 
          status: 'completed',
          ...completionData
        }),
        ipAddress: null,
        userAgent: navigator.userAgent
      });

      setShowCompletionForm(false);
      setSelectedWorkOrder(null);
      setCompletionData({
        actualHours: '',
        partsCost: '',
        laborCost: '',
        completionNotes: ''
      });
      
      await loadData();
    } catch (err) {
      console.error('Error completing work order:', err);
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { class: 'status-draft', label: 'Draft' },
      approved: { class: 'status-approved', label: 'Approved' },
      assigned: { class: 'status-assigned', label: 'Assigned' },
      in_progress: { class: 'status-in-progress', label: 'In Progress' },
      completed: { class: 'status-completed', label: 'Completed' },
      closed: { class: 'status-closed', label: 'Closed' },
      cancelled: { class: 'status-cancelled', label: 'Cancelled' }
    };

    const config = statusConfig[status] || { class: 'status-unknown', label: status };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      low: { class: 'priority-low', label: 'Low' },
      medium: { class: 'priority-medium', label: 'Medium' },
      high: { class: 'priority-high', label: 'High' },
      critical: { class: 'priority-critical', label: 'Critical' }
    };

    const config = priorityConfig[priority] || { class: 'priority-unknown', label: priority };
    return <span className={`priority-badge ${config.class}`}>{config.label}</span>;
  };

  const getWorkTypeBadge = (workType) => {
    const typeConfig = {
      preventive: { class: 'type-preventive', label: 'Preventive', icon: '🔧' },
      corrective: { class: 'type-corrective', label: 'Corrective', icon: '⚠️' },
      emergency: { class: 'type-emergency', label: 'Emergency', icon: '🚨' },
      project: { class: 'type-project', label: 'Project', icon: '📋' }
    };

    const config = typeConfig[workType] || { class: 'type-unknown', label: workType, icon: '❓' };
    return (
      <span className={`work-type-badge ${config.class}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  const filteredWorkOrders = workOrders.filter(wo => {
    if (selectedStatus === 'all') return true;
    if (selectedStatus === 'open') return ['draft', 'approved', 'assigned'].includes(wo.status);
    return wo.status === selectedStatus;
  });

  if (loading) {
    return (
      <div className="work-orders">
        <div className="work-orders-header">
          <h1>Work Orders</h1>
        </div>
        <div className="loading-spinner">Loading work orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="work-orders">
        <div className="work-orders-header">
          <h1>Work Orders</h1>
        </div>
        <div className="error-message">
          <p>Error loading work orders: {error}</p>
          <button onClick={loadData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="work-orders">
      <div className="work-orders-header">
        <h1>Work Orders</h1>
        <div className="header-actions">
          <div className="filter-controls">
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="status-filter"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <button 
            className="create-button"
            onClick={() => setShowCreateForm(true)}
          >
            + Create Work Order
          </button>
        </div>
      </div>

      {/* Work Orders Summary */}
      <div className="work-orders-summary">
        <div className="summary-card">
          <span className="summary-value">{workOrders.length}</span>
          <span className="summary-label">Total Work Orders</span>
        </div>
        <div className="summary-card">
          <span className="summary-value status-warning">
            {workOrders.filter(wo => ['draft', 'approved', 'assigned'].includes(wo.status)).length}
          </span>
          <span className="summary-label">Open</span>
        </div>
        <div className="summary-card">
          <span className="summary-value status-good">
            {workOrders.filter(wo => wo.status === 'in_progress').length}
          </span>
          <span className="summary-label">In Progress</span>
        </div>
        <div className="summary-card">
          <span className="summary-value status-critical">
            {workOrders.filter(wo => wo.priority === 'critical').length}
          </span>
          <span className="summary-label">Critical Priority</span>
        </div>
      </div>

      {/* Work Orders List */}
      <div className="work-orders-list">
        {filteredWorkOrders.length === 0 ? (
          <div className="empty-state">
            <p>No work orders found for the selected filter.</p>
            <button 
              className="create-button"
              onClick={() => setShowCreateForm(true)}
            >
              Create First Work Order
            </button>
          </div>
        ) : (
          filteredWorkOrders.map(wo => (
            <WorkOrderCard
              key={wo.id}
              workOrder={wo}
              onStatusChange={handleStatusChange}
              onComplete={handleCompleteWorkOrder}
              onViewDetails={setSelectedWorkOrder}
              getStatusBadge={getStatusBadge}
              getPriorityBadge={getPriorityBadge}
              getWorkTypeBadge={getWorkTypeBadge}
            />
          ))
        )}
      </div>

      {/* Create Work Order Modal */}
      {showCreateForm && (
        <WorkOrderCreateForm
          newWorkOrder={newWorkOrder}
          setNewWorkOrder={setNewWorkOrder}
          equipment={equipment}
          onSubmit={handleCreateWorkOrder}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Work Order Details Modal */}
      {selectedWorkOrder && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h2>Work Order Details - {selectedWorkOrder.wo_number}</h2>
              <button 
                className="close-button"
                onClick={() => setSelectedWorkOrder(null)}
              >
                ×
              </button>
            </div>

            <div className="work-order-details-content">
              <div className="details-section">
                <h3>Basic Information</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Equipment:</span>
                    <span className="detail-value">{selectedWorkOrder.equipment_identifier}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    {getStatusBadge(selectedWorkOrder.status)}
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Priority:</span>
                    {getPriorityBadge(selectedWorkOrder.priority)}
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Work Type:</span>
                    {getWorkTypeBadge(selectedWorkOrder.work_type)}
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Created By:</span>
                    <span className="detail-value">{selectedWorkOrder.created_by}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Created:</span>
                    <span className="detail-value">{new Date(selectedWorkOrder.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>Work Description</h3>
                <div className="description-content">
                  <h4>{selectedWorkOrder.title}</h4>
                  {selectedWorkOrder.description && (
                    <p>{selectedWorkOrder.description}</p>
                  )}
                </div>
              </div>

              <div className="details-section">
                <h3>Schedule & Resources</h3>
                <div className="details-grid">
                  {selectedWorkOrder.assigned_to && (
                    <div className="detail-item">
                      <span className="detail-label">Assigned To:</span>
                      <span className="detail-value">{selectedWorkOrder.assigned_to}</span>
                    </div>
                  )}
                  {selectedWorkOrder.scheduled_date && (
                    <div className="detail-item">
                      <span className="detail-label">Scheduled Date:</span>
                      <span className="detail-value">{new Date(selectedWorkOrder.scheduled_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedWorkOrder.estimated_hours && (
                    <div className="detail-item">
                      <span className="detail-label">Estimated Hours:</span>
                      <span className="detail-value">{selectedWorkOrder.estimated_hours}h</span>
                    </div>
                  )}
                  {selectedWorkOrder.actual_hours && (
                    <div className="detail-item">
                      <span className="detail-label">Actual Hours:</span>
                      <span className="detail-value">{selectedWorkOrder.actual_hours}h</span>
                    </div>
                  )}
                </div>
              </div>

              {(selectedWorkOrder.parts_cost > 0 || selectedWorkOrder.labor_cost > 0) && (
                <div className="details-section">
                  <h3>Costs</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Parts Cost:</span>
                      <span className="detail-value">${selectedWorkOrder.parts_cost || 0}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Labor Cost:</span>
                      <span className="detail-value">${selectedWorkOrder.labor_cost || 0}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Total Cost:</span>
                      <span className="detail-value total-cost">
                        ${(selectedWorkOrder.parts_cost || 0) + (selectedWorkOrder.labor_cost || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedWorkOrder.completion_notes && (
                <div className="details-section">
                  <h3>Completion Notes</h3>
                  <p>{selectedWorkOrder.completion_notes}</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button 
                className="close-modal-button"
                onClick={() => setSelectedWorkOrder(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Work Order Completion Modal */}
      {showCompletionForm && selectedWorkOrder && (
        <WorkOrderCompletionForm
          selectedWorkOrder={selectedWorkOrder}
          completionData={completionData}
          setCompletionData={setCompletionData}
          onSubmit={handleSubmitCompletion}
          onCancel={() => setShowCompletionForm(false)}
        />
      )}
    </div>
  );
};

export default WorkOrders;
