import React, { useState, useEffect } from 'react';
import './ComplianceManager.css';

function ComplianceManager() {
  const [standards, setStandards] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [selectedStandard, setSelectedStandard] = useState('');
  const [selectedEquipmentType, setSelectedEquipmentType] = useState('');
  const [newStandardName, setNewStandardName] = useState('');
  const [newStandardDescription, setNewStandardDescription] = useState('');
  const [newStandardAuthority, setNewStandardAuthority] = useState('');

  useEffect(() => {
    fetchStandards();
    fetchEquipmentTypes();
  }, []);

  const fetchStandards = async () => {
    const standardList = await window.api.all('SELECT * FROM compliance_standards');
    setStandards(standardList);
  };

  const fetchEquipmentTypes = async () => {
    const types = await window.api.all('SELECT DISTINCT type FROM equipment');
    setEquipmentTypes(types.map(t => t.type));
  };

  const handleAddStandard = async (e) => {
    e.preventDefault();
    if (!newStandardName) {
      alert('Please enter a standard name.');
      return;
    }
    await window.api.run(
      'INSERT INTO compliance_standards (name, description, authority) VALUES (?, ?, ?)',
      [newStandardName, newStandardDescription, newStandardAuthority]
    );
    fetchStandards();
    setNewStandardName('');
    setNewStandardDescription('');
    setNewStandardAuthority('');
  };

  const handleAssignStandard = async (e) => {
    e.preventDefault();
    if (!selectedEquipmentType || !selectedStandard) {
      alert('Please select an equipment type and a standard.');
      return;
    }
    await window.api.run(
      'INSERT INTO equipment_type_compliance (equipment_type, standard_id) VALUES (?, ?)',
      [selectedEquipmentType, selectedStandard]
    );
    alert('Standard assigned successfully.');
  };

  return (
    <div className="compliance-manager">
      <h2>Compliance Management</h2>

      <div className="add-standard-form">
        <h3>Add New Standard</h3>
        <form onSubmit={handleAddStandard}>
          <input
            type="text"
            placeholder="Standard Name (e.g., OSHA 1910.179)"
            value={newStandardName}
            onChange={(e) => setNewStandardName(e.target.value)}
            required
          />
          <textarea
            placeholder="Description"
            value={newStandardDescription}
            onChange={(e) => setNewStandardDescription(e.target.value)}
          />
          <input
            type="text"
            placeholder="Authority (e.g., OSHA)"
            value={newStandardAuthority}
            onChange={(e) => setNewStandardAuthority(e.target.value)}
          />
          <button type="submit">Add Standard</button>
        </form>
      </div>

      <div className="assign-standard-form">
        <h3>Assign Standard to Equipment Type</h3>
        <form onSubmit={handleAssignStandard}>
          <select
            value={selectedEquipmentType}
            onChange={(e) => setSelectedEquipmentType(e.target.value)}
            required
          >
            <option value="">Select Equipment Type</option>
            {equipmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={selectedStandard}
            onChange={(e) => setSelectedStandard(e.target.value)}
            required
          >
            <option value="">Select Standard</option>
            {standards.map((standard) => (
              <option key={standard.id} value={standard.id}>
                {standard.name}
              </option>
            ))}
          </select>
          <button type="submit">Assign Standard</button>
        </form>
      </div>
    </div>
  );
}

export default ComplianceManager;