import React from 'react';
import { useQuery } from 'react-query';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const fetchDashboardData = async () => {
  const equipmentStatus = await window.api.all('SELECT status, COUNT(*) as count FROM equipment GROUP BY status');
  const inspectionsPerMonth = await window.api.all(`
    SELECT strftime('%Y-%m', inspection_date) as month, COUNT(*) as count
    FROM inspections
    GROUP BY month
    ORDER BY month DESC
    LIMIT 6
  `);
  const upcomingInspections = await window.api.all(`
    SELECT e.equipment_id, s.scheduled_date
    FROM scheduled_inspections s
    JOIN equipment e ON e.id = s.equipment_id
    WHERE s.status = 'scheduled'
    ORDER BY s.scheduled_date ASC
    LIMIT 5
  `);
  const recentFailures = await window.api.all(`
    SELECT e.equipment_id, i.inspection_date
    FROM inspections i
    JOIN equipment e ON e.id = i.equipment_id
    WHERE i.findings LIKE '%"result":"fail"%'
    ORDER BY i.inspection_date DESC
    LIMIT 5
  `);
  const [totalEquipment] = await window.api.all('SELECT COUNT(*) as count FROM equipment');
  const [totalInspections] = await window.api.all('SELECT COUNT(*) as count FROM inspections');

  return {
    equipmentStatus,
    inspectionsPerMonth: inspectionsPerMonth.reverse(),
    upcomingInspections,
    recentFailures,
    totalEquipment: totalEquipment.count,
    totalInspections: totalInspections.count,
  };
};

function Dashboard() {
  const { data, isLoading, error } = useQuery('dashboardData', fetchDashboardData);

  if (isLoading) return 'Loading...';
  if (error) return 'An error has occurred: ' + error.message;

  const { equipmentStatus, inspectionsPerMonth, upcomingInspections, recentFailures, totalEquipment, totalInspections } = data;

  const equipmentStatusChartData = {
    labels: equipmentStatus.map((d) => d.status),
    datasets: [{
      data: equipmentStatus.map((d) => d.count),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
    }],
  };

  const inspectionsPerMonthChartData = {
    labels: inspectionsPerMonth.map((d) => d.month),
    datasets: [{
      label: 'Inspections',
      data: inspectionsPerMonth.map((d) => d.count),
      backgroundColor: '#36A2EB',
    }],
  };

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div className="card stat-card">
          <h3>Total Equipment</h3>
          <p>{totalEquipment}</p>
        </div>
        <div className="card stat-card">
          <h3>Total Inspections</h3>
          <p>{totalInspections}</p>
        </div>
        <div className="card chart-card">
          <h3>Equipment Status</h3>
          <Doughnut data={equipmentStatusChartData} />
        </div>
        <div className="card chart-card">
          <h3>Inspections per Month</h3>
          <Bar data={inspectionsPerMonthChartData} />
        </div>
        <div className="card list-card">
          <h3>Upcoming Inspections</h3>
          <ul>
            {upcomingInspections.map(insp => (
              <li key={insp.scheduled_date + insp.equipment_id}>
                <span>{insp.equipment_id}</span>
                <span>{insp.scheduled_date}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card list-card">
          <h3>Recent Failures</h3>
          <ul>
            {recentFailures.map(fail => (
              <li key={fail.inspection_date + fail.equipment_id}>
                <span>{fail.equipment_id}</span>
                <span>{fail.inspection_date}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
