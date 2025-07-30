import React, { useState, useEffect } from 'react';
import './Scheduler.css';

function Scheduler() {
  const [scheduledInspections, setScheduledInspections] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [assignedInspector, setAssignedInspector] = useState('');

  useEffect(() => {
    fetchScheduledInspections();
    fetchEquipment();
  }, []);

  const fetchScheduledInspections = async () => {
    const inspections = await window.api.all('SELECT * FROM scheduled_inspections');
    setScheduledInspections(inspections);
  };

  const fetchEquipment = async () => {
    const equipmentList = await window.api.all('SELECT * FROM equipment');
    setEquipment(equipmentList);
  };

  const handleScheduleInspection = async (e) => {
    e.preventDefault();
    if (!selectedEquipment || !scheduledDate) {
      alert('Please select equipment and a date.');
      return;
    }
    await window.api.run(
      'INSERT INTO scheduled_inspections (equipment_id, scheduled_date, assigned_inspector, status) VALUES (?, ?, ?, ?)',
      [selectedEquipment, scheduledDate, assignedInspector, 'scheduled']
    );
    fetchScheduledInspections();
    setSelectedEquipment('');
    setScheduledDate('');
    setAssignedInspector('');
  };

  return (
    <div className="scheduler">
      <h2>Inspection Scheduler</h2>
      <form onSubmit={handleScheduleInspection} className="scheduler-form">
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
        <button type="submit">Schedule Inspection</button>
      </form>

      <div className="scheduled-inspections-list">
        <h3>Upcoming Inspections</h3>
        <ul>
          {scheduledInspections.map((inspection) => (
            <li key={inspection.id}>
              <span>Equipment ID: {inspection.equipment_id}</span>
              <span>Date: {inspection.scheduled_date}</span>
              <span>Inspector: {inspection.assigned_inspector}</span>
              <span>Status: {inspection.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Scheduler;