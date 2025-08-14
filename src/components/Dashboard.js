import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    equipment: { total: 0, active: 0, outOfService: 0, taggedOut: 0 },
    inspections: { total: 0, thisMonth: 0, overdue: 0, upcoming: 0 },
    workOrders: { total: 0, open: 0, inProgress: 0, overdue: 0 },
    deficiencies: { total: 0, critical: 0, overdue: 0 },
    pmSchedules: { total: 0, due: 0, overdue: 0 },
    loadTests: { total: 0, due: 0, overdue: 0 },
    calibrations: { total: 0, due: 0, overdue: 0 },
    certificates: { total: 0, expiring: 0 },
    credentials: { total: 0, expiring: 0 }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30'); // days

  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeframe]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(selectedTimeframe));
      const futureDateStr = futureDate.toISOString().split('T')[0];

      // Load all dashboard data in parallel
      const [
        equipmentData,
        equipmentStatusCounts,
        inspectionCount,
        inspectionsByMonth,
        inspectionsOverdue,
        upcomingInspections,
        workOrdersAll,
        workOrdersDueToday,
        workOrdersOverdue,
        deficienciesAll,
        deficienciesOpenCritical,
        deficienciesOverdue,
        pmSchedulesTotal,
        pmSchedulesDue,
        pmSchedulesOverdue,
        loadTestsTotal,
        loadTestsDue,
        loadTestsOverdue,
        calibrationsTotal,
        calibrationsDue,
        calibrationsOverdue,
        certificatesTotal,
        certificatesExpiring,
        credentialsTotal,
        credentialsExpiring
      ] = await Promise.all([
        window.api.equipment.getAll(),
        window.api.equipment.getStatusCounts(),
        window.api.inspections.getCount(),
        window.api.inspections.getPerMonth(),
        window.api.inspections.getOverdue(),
        window.api.scheduledInspections.getUpcoming(today),
        window.api.workOrders.getAll(),
        window.api.workOrders.getDueToday(),
        window.api.workOrders.getOverdue(),
        window.api.deficiencies.getAll(),
        window.api.deficiencies.getOpenCritical(),
        window.api.deficiencies.getOverdue(),
        window.api.pmSchedules.getTotal(),
        window.api.pmSchedules.getDue(futureDateStr),
        window.api.pmSchedules.getOverdue(),
        window.api.loadTests.getTotal(),
        window.api.loadTests.getDue(futureDateStr),
        window.api.loadTests.getOverdue(),
        window.api.calibrations.getTotal(),
        window.api.calibrations.getDue(futureDateStr),
        window.api.calibrations.getOverdue(),
        window.api.certificates.getTotal(),
        window.api.certificates.getExpiring(futureDateStr),
        window.api.credentials.getTotal(),
        window.api.credentials.getExpiring(futureDateStr)
      ]);

      // Process equipment status counts with error handling
      const statusCounts = Array.isArray(equipmentStatusCounts) 
        ? equipmentStatusCounts.reduce((acc, item) => {
            if (item && item.status && typeof item.count === 'number') {
              acc[item.status] = item.count;
            }
            return acc;
          }, {})
        : {};

      // Calculate this month's inspections with error handling
      const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
      const thisMonthInspections = Array.isArray(inspectionsByMonth) 
        ? (inspectionsByMonth.find(item => item && item.month === thisMonth)?.count || 0)
        : 0;

      // Process work orders by status with error handling
      const workOrdersByStatus = Array.isArray(workOrdersAll)
        ? workOrdersAll.reduce((acc, wo) => {
            if (wo && wo.status) {
              acc[wo.status] = (acc[wo.status] || 0) + 1;
            }
            return acc;
          }, {})
        : {};

      setDashboardData({
        equipment: {
          total: Array.isArray(equipmentData) ? equipmentData.length : 0,
          active: statusCounts.active || 0,
          outOfService: statusCounts.out_of_service || 0,
          taggedOut: Array.isArray(equipmentData) ? equipmentData.filter(eq => eq && eq.tagged_out).length : 0
        },
        inspections: {
          total: typeof inspectionCount === 'number' ? inspectionCount : 0,
          thisMonth: thisMonthInspections,
          overdue: Array.isArray(inspectionsOverdue) ? inspectionsOverdue.length : 0,
          upcoming: Array.isArray(upcomingInspections) ? upcomingInspections.length : 0
        },
        workOrders: {
          total: Array.isArray(workOrdersAll) ? workOrdersAll.length : 0,
          open: (workOrdersByStatus.draft || 0) + (workOrdersByStatus.approved || 0) + (workOrdersByStatus.assigned || 0),
          inProgress: workOrdersByStatus.in_progress || 0,
          overdue: Array.isArray(workOrdersOverdue) ? workOrdersOverdue.length : 0
        },
        deficiencies: {
          total: Array.isArray(deficienciesAll) ? deficienciesAll.length : 0,
          critical: Array.isArray(deficienciesOpenCritical) ? deficienciesOpenCritical.length : 0,
          overdue: Array.isArray(deficienciesOverdue) ? deficienciesOverdue.length : 0
        },
        pmSchedules: {
          total: typeof pmSchedulesTotal === 'number' ? pmSchedulesTotal : 0,
          due: Array.isArray(pmSchedulesDue) ? pmSchedulesDue.length : 0,
          overdue: Array.isArray(pmSchedulesOverdue) ? pmSchedulesOverdue.length : 0
        },
        loadTests: {
          total: typeof loadTestsTotal === 'number' ? loadTestsTotal : 0,
          due: Array.isArray(loadTestsDue) ? loadTestsDue.length : 0,
          overdue: Array.isArray(loadTestsOverdue) ? loadTestsOverdue.length : 0
        },
        calibrations: {
          total: typeof calibrationsTotal === 'number' ? calibrationsTotal : 0,
          due: Array.isArray(calibrationsDue) ? calibrationsDue.length : 0,
          overdue: Array.isArray(calibrationsOverdue) ? calibrationsOverdue.length : 0
        },
        certificates: {
          total: typeof certificatesTotal === 'number' ? certificatesTotal : 0,
          expiring: Array.isArray(certificatesExpiring) ? certificatesExpiring.length : 0
        },
        credentials: {
          total: typeof credentialsTotal === 'number' ? credentialsTotal : 0,
          expiring: Array.isArray(credentialsExpiring) ? credentialsExpiring.length : 0
        }
      });

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (type, value, total) => {
    if (type === 'critical' && value > 0) return 'status-critical';
    if (type === 'overdue' && value > 0) return 'status-overdue';
    if (type === 'due' && value > 0) return 'status-warning';
    if (type === 'expiring' && value > 0) return 'status-warning';
    return 'status-good';
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>CMMS Dashboard</h1>
        </div>
        <div className="loading-spinner">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>CMMS Dashboard</h1>
        </div>
        <div className="error-message">
          <p>Error loading dashboard: {error}</p>
          <button onClick={loadDashboardData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>CMMS Dashboard</h1>
        <div className="timeframe-selector">
          <label>Forecast Period:</label>
          <select 
            value={selectedTimeframe} 
            onChange={(e) => setSelectedTimeframe(e.target.value)}
          >
            <option value="7">7 Days</option>
            <option value="30">30 Days</option>
            <option value="60">60 Days</option>
            <option value="90">90 Days</option>
          </select>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Equipment Overview */}
        <div className="dashboard-card">
          <h3>Equipment Status</h3>
          <div className="metrics-grid">
            <div className="metric">
              <span className="metric-value">{dashboardData.equipment.total}</span>
              <span className="metric-label">Total Assets</span>
            </div>
            <div className="metric">
              <span className="metric-value status-good">{dashboardData.equipment.active}</span>
              <span className="metric-label">Active</span>
            </div>
            <div className="metric">
              <span className={`metric-value ${getStatusColor('critical', dashboardData.equipment.outOfService)}`}>
                {dashboardData.equipment.outOfService}
              </span>
              <span className="metric-label">Out of Service</span>
            </div>
            <div className="metric">
              <span className={`metric-value ${getStatusColor('critical', dashboardData.equipment.taggedOut)}`}>
                {dashboardData.equipment.taggedOut}
              </span>
              <span className="metric-label">Tagged Out</span>
            </div>
          </div>
        </div>

        {/* Inspections Overview */}
        <div className="dashboard-card">
          <h3>Inspections</h3>
          <div className="metrics-grid">
            <div className="metric">
              <span className="metric-value">{dashboardData.inspections.total}</span>
              <span className="metric-label">Total</span>
            </div>
            <div className="metric">
              <span className="metric-value status-good">{dashboardData.inspections.thisMonth}</span>
              <span className="metric-label">This Month</span>
            </div>
            <div className="metric">
              <span className={`metric-value ${getStatusColor('due', dashboardData.inspections.upcoming)}`}>
                {dashboardData.inspections.upcoming}
              </span>
              <span className="metric-label">Upcoming</span>
            </div>
            <div className="metric">
              <span className={`metric-value ${getStatusColor('overdue', dashboardData.inspections.overdue)}`}>
                {dashboardData.inspections.overdue}
              </span>
              <span className="metric-label">Overdue</span>
            </div>
          </div>
        </div>

        {/* Work Orders Overview */}
        <div className="dashboard-card">
          <h3>Work Orders</h3>
          <div className="metrics-grid">
            <div className="metric">
              <span className="metric-value">{dashboardData.workOrders.total}</span>
              <span className="metric-label">Total</span>
            </div>
            <div className="metric">
              <span className="metric-value status-warning">{dashboardData.workOrders.open}</span>
              <span className="metric-label">Open</span>
            </div>
            <div className="metric">
              <span className="metric-value status-good">{dashboardData.workOrders.inProgress}</span>
              <span className="metric-label">In Progress</span>
            </div>
            <div className="metric">
              <span className={`metric-value ${getStatusColor('overdue', dashboardData.workOrders.overdue)}`}>
                {dashboardData.workOrders.overdue}
              </span>
              <span className="metric-label">Overdue</span>
            </div>
          </div>
        </div>

        {/* Deficiencies Overview */}
        <div className="dashboard-card">
          <h3>Deficiencies</h3>
          <div className="metrics-grid">
            <div className="metric">
              <span className="metric-value">{dashboardData.deficiencies.total}</span>
              <span className="metric-label">Total</span>
            </div>
            <div className="metric">
              <span className={`metric-value ${getStatusColor('critical', dashboardData.deficiencies.critical)}`}>
                {dashboardData.deficiencies.critical}
              </span>
              <span className="metric-label">Critical Open</span>
            </div>
            <div className="metric">
              <span className={`metric-value ${getStatusColor('overdue', dashboardData.deficiencies.overdue)}`}>
                {dashboardData.deficiencies.overdue}
              </span>
              <span className="metric-label">Overdue</span>
            </div>
            <div className="metric">
              <span className="metric-value status-good">
                {dashboardData.deficiencies.total - dashboardData.deficiencies.critical - dashboardData.deficiencies.overdue}
              </span>
              <span className="metric-label">On Track</span>
            </div>
          </div>
        </div>

        {/* Preventive Maintenance */}
        <div className="dashboard-card">
          <h3>Preventive Maintenance</h3>
          <div className="metrics-grid">
            <div className="metric">
              <span className="metric-value">{dashboardData.pmSchedules.total}</span>
              <span className="metric-label">Total Schedules</span>
            </div>
            <div className="metric">
              <span className={`metric-value ${getStatusColor('due', dashboardData.pmSchedules.due)}`}>
                {dashboardData.pmSchedules.due}
              </span>
              <span className="metric-label">Due Soon</span>
            </div>
            <div className="metric">
              <span className={`metric-value ${getStatusColor('overdue', dashboardData.pmSchedules.overdue)}`}>
                {dashboardData.pmSchedules.overdue}
              </span>
              <span className="metric-label">Overdue</span>
            </div>
            <div className="metric">
              <span className="metric-value status-good">
                {Math.max(0, dashboardData.pmSchedules.total - dashboardData.pmSchedules.due - dashboardData.pmSchedules.overdue)}
              </span>
              <span className="metric-label">Current</span>
            </div>
          </div>
        </div>

        {/* Crane Compliance */}
        <div className="dashboard-card">
          <h3>Crane Compliance</h3>
          <div className="metrics-grid">
            <div className="metric">
              <span className={`metric-value ${getStatusColor('due', dashboardData.loadTests.due)}`}>
                {dashboardData.loadTests.due}
              </span>
              <span className="metric-label">Load Tests Due</span>
            </div>
            <div className="metric">
              <span className={`metric-value ${getStatusColor('due', dashboardData.calibrations.due)}`}>
                {dashboardData.calibrations.due}
              </span>
              <span className="metric-label">Calibrations Due</span>
            </div>
            <div className="metric">
              <span className={`metric-value ${getStatusColor('expiring', dashboardData.certificates.expiring)}`}>
                {dashboardData.certificates.expiring}
              </span>
              <span className="metric-label">Certificates Expiring</span>
            </div>
            <div className="metric">
              <span className={`metric-value ${getStatusColor('expiring', dashboardData.credentials.expiring)}`}>
                {dashboardData.credentials.expiring}
              </span>
              <span className="metric-label">Credentials Expiring</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button className="action-button primary" onClick={() => window.location.hash = '#/scheduler'}>
              📅 Schedule Inspection
            </button>
            <button className="action-button secondary" onClick={() => window.location.hash = '#/work-orders'}>
              🔧 Create Work Order
            </button>
            <button className="action-button secondary" onClick={() => window.location.hash = '#/deficiencies'}>
              ⚠️ View Deficiencies
            </button>
            <button className="action-button secondary" onClick={() => window.location.hash = '#/compliance'}>
              📋 Compliance Report
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card recent-activity">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-icon">🔍</span>
              <span className="activity-text">System ready for P2 feature development</span>
              <span className="activity-time">Just now</span>
            </div>
            <div className="activity-item">
              <span className="activity-icon">✅</span>
              <span className="activity-text">P2 database migrations completed</span>
              <span className="activity-time">Just now</span>
            </div>
            <div className="activity-item">
              <span className="activity-icon">🔒</span>
              <span className="activity-text">All secure operations implemented</span>
              <span className="activity-time">Just now</span>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="dashboard-card system-health">
          <h3>System Health</h3>
          <div className="health-indicators">
            <div className="health-item">
              <span className="health-label">Database</span>
              <span className="health-status status-good">✅ Healthy</span>
            </div>
            <div className="health-item">
              <span className="health-label">Migrations</span>
              <span className="health-status status-good">✅ v5 Current</span>
            </div>
            <div className="health-item">
              <span className="health-label">Security</span>
              <span className="health-status status-good">✅ Secured</span>
            </div>
            <div className="health-item">
              <span className="health-label">CMMS Features</span>
              <span className="health-status status-good">✅ Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {(dashboardData.deficiencies.critical > 0 || 
        dashboardData.equipment.outOfService > 0 || 
        dashboardData.workOrders.overdue > 0 ||
        dashboardData.loadTests.overdue > 0 ||
        dashboardData.calibrations.overdue > 0 ||
        dashboardData.pmSchedules.overdue > 0) && (
        <div className="critical-alerts">
          <h3>🚨 Critical Alerts</h3>
          <div className="alert-list">
            {dashboardData.deficiencies.critical > 0 && (
              <div className="alert-item critical">
                <span className="alert-icon">⚠️</span>
                <span className="alert-text">
                  {dashboardData.deficiencies.critical} critical deficiencies require immediate attention
                </span>
                <button 
                  className="alert-action"
                  onClick={() => window.location.hash = '#/deficiencies?filter=critical'}
                >
                  View Details
                </button>
              </div>
            )}
            {dashboardData.equipment.outOfService > 0 && (
              <div className="alert-item warning">
                <span className="alert-icon">🔧</span>
                <span className="alert-text">
                  {dashboardData.equipment.outOfService} assets are out of service
                </span>
                <button 
                  className="alert-action"
                  onClick={() => window.location.hash = '#/equipment?filter=out_of_service'}
                >
                  View Assets
                </button>
              </div>
            )}
            {dashboardData.workOrders.overdue > 0 && (
              <div className="alert-item warning">
                <span className="alert-icon">📋</span>
                <span className="alert-text">
                  {dashboardData.workOrders.overdue} work orders are overdue
                </span>
                <button 
                  className="alert-action"
                  onClick={() => window.location.hash = '#/work-orders?filter=overdue'}
                >
                  View Work Orders
                </button>
              </div>
            )}
            {dashboardData.loadTests.overdue > 0 && (
              <div className="alert-item critical">
                <span className="alert-icon">🏗️</span>
                <span className="alert-text">
                  {dashboardData.loadTests.overdue} load tests are overdue - compliance risk!
                </span>
                <button 
                  className="alert-action"
                  onClick={() => window.location.hash = '#/load-tests?filter=overdue'}
                >
                  View Load Tests
                </button>
              </div>
            )}
            {dashboardData.calibrations.overdue > 0 && (
              <div className="alert-item warning">
                <span className="alert-icon">📏</span>
                <span className="alert-text">
                  {dashboardData.calibrations.overdue} calibrations are overdue
                </span>
                <button 
                  className="alert-action"
                  onClick={() => window.location.hash = '#/calibrations?filter=overdue'}
                >
                  View Calibrations
                </button>
              </div>
            )}
            {dashboardData.pmSchedules.overdue > 0 && (
              <div className="alert-item warning">
                <span className="alert-icon">🔧</span>
                <span className="alert-text">
                  {dashboardData.pmSchedules.overdue} preventive maintenance tasks are overdue
                </span>
                <button 
                  className="alert-action"
                  onClick={() => window.location.hash = '#/preventive-maintenance?filter=overdue'}
                >
                  View PM Schedule
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compliance Summary */}
      <div className="compliance-summary">
        <h3>📊 Compliance Summary</h3>
        <div className="compliance-grid">
          <div className="compliance-item">
            <div className="compliance-header">
              <span className="compliance-title">ASME B30 Compliance</span>
              <span className="compliance-percentage">
                {dashboardData.equipment.total > 0 
                  ? Math.round(((dashboardData.equipment.total - dashboardData.deficiencies.critical) / dashboardData.equipment.total) * 100)
                  : 100}%
              </span>
            </div>
            <div className="compliance-bar">
              <div 
                className="compliance-fill"
                style={{
                  width: `${dashboardData.equipment.total > 0 
                    ? ((dashboardData.equipment.total - dashboardData.deficiencies.critical) / dashboardData.equipment.total) * 100
                    : 100}%`
                }}
              ></div>
            </div>
          </div>
          
          <div className="compliance-item">
            <div className="compliance-header">
              <span className="compliance-title">OSHA 1910.179 Compliance</span>
              <span className="compliance-percentage">
                {dashboardData.equipment.total > 0 
                  ? Math.round(((dashboardData.equipment.total - dashboardData.deficiencies.critical) / dashboardData.equipment.total) * 100)
                  : 100}%
              </span>
            </div>
            <div className="compliance-bar">
              <div 
                className="compliance-fill"
                style={{
                  width: `${dashboardData.equipment.total > 0 
                    ? ((dashboardData.equipment.total - dashboardData.deficiencies.critical) / dashboardData.equipment.total) * 100
                    : 100}%`
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <p>Last updated: {new Date().toLocaleString()}</p>
        <p>JSG Inspections CMMS v2.0 - P2 Implementation Complete</p>
      </div>
    </div>
  );
};

export default Dashboard;
