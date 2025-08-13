import React, { useState, useEffect } from 'react';
import './Scheduler.css';

function Scheduler() {
  const [scheduledInspections, setScheduledInspections] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [assignedInspector, setAssignedInspector] = useState('');
  const [editingInspection, setEditingInspection] = useState(null);

  useEffect(() => {
    fetchScheduledInspections();
    fetchEquipment();
  }, []);

  const fetchScheduledInspections = async () => {
    const inspections = await window.api.all('SELECT si.*, e.equipment_id as equipmentIdentifier FROM scheduled_inspections si JOIN equipment e ON si.equipment_id = e.id ORDER BY si.scheduled_date');
    setScheduledInspections(inspections);
  };

  const fetchEquipment = async () => {
    const equipmentList = await window.api.all('SELECT * FROM equipment');
    setEquipment(equipmentList);
  };

  const resetForm = () => {
    setSelectedEquipment('');
    setScheduledDate('');
    setAssignedInspector('');
    setEditingInspection(null);
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEquipment || !scheduledDate) {
      alert('Please select equipment and a date.');
      return;
    }

    if (editingInspection) {
      // Update existing inspection
      await window.api.run(
        'UPDATE scheduled_inspections SET equipment_id = ?, scheduled_date = ?, assigned_inspector = ? WHERE id = ?',
        [selectedEquipment, scheduledDate, assignedInspector, editingInspection.id]
      );
    } else {
      // Add new inspection
      await window.api.run(
        'INSERT INTO scheduled_inspections (equipment_id, scheduled_date, assigned_inspector, status) VALUES (?, ?, ?, ?)',
        [selectedEquipment, scheduledDate, assignedInspector, 'scheduled']
      );
    }

    fetchScheduledInspections();
    resetForm();
  };

  const handleEditInspection = (inspection) => {
    setEditingInspection(inspection);
    setSelectedEquipment(inspection.equipment_id);
    setScheduledDate(inspection.scheduled_date);
    setAssignedInspector(inspection.assigned_inspector);
  };

  const handleDeleteInspection = async (id) => {
    if (window.confirm('Are you sure you want to delete this scheduled inspection?')) {
      await window.api.run('DELETE FROM scheduled_inspections WHERE id = ?', [id]);
      fetchScheduledInspections();
    }
  };

  return (
    <div className="scheduler">
      <h2>Inspection Scheduler</h2>
      <form onSubmit={handleFormSubmit} className="scheduler-form">
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
        <button type="submit">{editingInspection ? 'Update Inspection' : 'Schedule Inspection'}</button>
        {editingInspection && <button type="button" onClick={resetForm}>Cancel Edit</button>}
      </form>

      <div className="scheduled-inspections-list">
        <h3>Upcoming Inspections</h3>
        <ul>
          {scheduledInspections.map((inspection) => (
            <li key={inspection.id}>
              <span>Equipment: {inspection.equipmentIdentifier}</span>
              <span>Date: {inspection.scheduled_date}</span>
              <span>Inspector: {inspection.assigned_inspector || 'N/A'}</span>
              <span>Status: {inspection.status}</span>
              <div className="scheduler-item-buttons">
                <button onClick={() => handleEditInspection(inspection)}>Edit</button>
                <button onClick={() => handleDeleteInspection(inspection.id)} className="delete-button">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Scheduler;