import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Dashboard() {
  const [equipmentStatusData, setEquipmentStatusData] = useState({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    window.api.all('SELECT status, COUNT(*) as count FROM equipment GROUP BY status').then((data) => {
      const labels = data.map((d) => d.status);
      const counts = data.map((d) => d.count);

      setEquipmentStatusData({
        labels,
        datasets: [
          {
            label: 'Equipment by Status',
            data: counts,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
          },
        ],
      });
    });
  }, []);

  return (
    <div>
      <h2>Dashboard</h2>
      <div style={{ width: '600px', margin: 'auto' }}>
        <Bar data={equipmentStatusData} />
      </div>
    </div>
  );
}

export default Dashboard;