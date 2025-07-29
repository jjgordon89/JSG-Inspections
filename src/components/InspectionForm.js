import React, { useState } from 'react';
import './AddEquipmentForm.css';

function InspectionForm({ equipmentId, onInspectionAdded, onCancel }) {
  const [inspector, setInspector] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [findings, setFindings] = useState('');
  const [correctiveActions, setCorrectiveActions] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await window.api.run(
      'INSERT INTO inspections (equipment_id, inspector, inspection_date, findings, corrective_actions) VALUES (?, ?, ?, ?, ?)',
      [equipmentId, inspector, inspectionDate, findings, correctiveActions]
    );
    onInspectionAdded();
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add New Inspection</h3>
      <input
        type="text"
        value={inspector}
        onChange={(e) => setInspector(e.target.value)}
        placeholder="Inspector"
      />
      <input
        type="date"
        value={inspectionDate}
        onChange={(e) => setInspectionDate(e.target.value)}
      />
      <textarea
        value={findings}
        onChange={(e) => setFindings(e.target.value)}
        placeholder="Findings"
      ></textarea>
      <textarea
        value={correctiveActions}
        onChange={(e) => setCorrectiveActions(e.target.value)}
        placeholder="Corrective Actions"
      ></textarea>
      <button type="submit">Add Inspection</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}

export default InspectionForm;