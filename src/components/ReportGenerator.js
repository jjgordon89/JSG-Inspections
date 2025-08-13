import React, { useState, useEffect } from 'react';
import { generateHistoryReport } from '../utils/generatePdf';
import './ReportGenerator.css';

function ReportGenerator() {
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    const equipmentList = await window.api.all('SELECT * FROM equipment');
    setEquipment(equipmentList);
  };

  const handleGenerateReport = async () => {
    if (!selectedEquipment) {
      alert('Please select a piece of equipment.');
      return;
    }

    const equipmentDetails = await window.api.get('SELECT * FROM equipment WHERE id = ?', [selectedEquipment]);

    let sql = 'SELECT * FROM inspections WHERE equipment_id = ?';
    const params = [selectedEquipment];

    if (startDate) {
      sql += ' AND inspection_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND inspection_date <= ?';
      params.push(endDate);
    }
    sql += ' ORDER BY inspection_date DESC';

    const inspectionHistory = await window.api.all(sql, params);

    if (inspectionHistory.length === 0) {
      alert('No inspections found for the selected criteria.');
      return;
    }

    generateHistoryReport(equipmentDetails, inspectionHistory);
  };

  return (
    <div className="report-generator">
      <h2>Inspection History Report</h2>
      <div className="report-options">
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
        <label>
          Start Date:
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End Date:
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <button onClick={handleGenerateReport}>Generate History Report</button>
      </div>
    </div>
  );
}

export default ReportGenerator;