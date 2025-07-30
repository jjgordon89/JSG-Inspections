import React from 'react';
import { useQuery } from 'react-query';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const fetchEquipmentStatus = async () => {
  const data = await window.api.all('SELECT status, COUNT(*) as count FROM equipment GROUP BY status');
  return data;
};

function Dashboard() {
  const { data, isLoading, error } = useQuery('equipmentStatus', fetchEquipmentStatus);

  if (isLoading) return 'Loading...';
  if (error) return 'An error has occurred: ' + error.message;

  const labels = data.map((d) => d.status);
  const counts = data.map((d) => d.count);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Equipment by Status',
        data: counts,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };

  return (
    <div>
      <h2>Dashboard</h2>
      <div style={{ width: '600px', margin: 'auto' }}>
        <Bar data={chartData} />
      </div>
    </div>
  );
}

export default Dashboard;