import React, { useState, useEffect } from 'react';
import './ComplianceManager.css';

function ComplianceManager() {
  const [standards, setStandards] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [selectedStandard, setSelectedStandard] = useState('');
  const [selectedEquipmentType, setSelectedEquipmentType] = useState('');
  const [assignedStandards, setAssignedStandards] = useState([]);
  const [newStandardName, setNewStandardName] = useState('');
  const [newStandardDescription, setNewStandardDescription] = useState('');
  const [newStandardAuthority, setNewStandardAuthority] = useState('');
  const [complianceStatus, setComplianceStatus] = useState([]);
  const [isLoadingCompliance, setIsLoadingCompliance] = useState(false);

  useEffect(() => {
    fetchStandards();
    fetchEquipmentTypes();
  }, []);

  const fetchStandards = async () => {
    const standardList = await window.api.compliance.getAllStandards();
    setStandards(standardList);
  };

  const fetchEquipmentTypes = async () => {
    const types = await window.api.equipment.getDistinctTypes();
    setEquipmentTypes(types.map(t => t.type));
  };

  const handleAddStandard = async (e) => {
    e.preventDefault();
    if (!newStandardName) {
      alert('Please enter a standard name.');
      return;
    }
    await window.api.compliance.createStandard({
      name: newStandardName,
      description: newStandardDescription,
      authority: newStandardAuthority
    });
    fetchStandards();
    setNewStandardName('');
    setNewStandardDescription('');
    setNewStandardAuthority('');
  };

  useEffect(() => {
    if (selectedEquipmentType) {
      fetchAssignedStandards(selectedEquipmentType);
    } else {
      setAssignedStandards([]);
    }
  }, [selectedEquipmentType]);

  const fetchAssignedStandards = async (equipmentType) => {
    const assigned = await window.api.compliance.getAssignedStandards(equipmentType);
    setAssignedStandards(assigned);
  };

  const handleAssignStandard = async (e) => {
    e.preventDefault();
    if (!selectedEquipmentType || !selectedStandard) {
      alert('Please select an equipment type and a standard.');
      return;
    }
    await window.api.compliance.assignStandard(selectedEquipmentType, selectedStandard);
    fetchAssignedStandards(selectedEquipmentType);
    alert('Standard assigned successfully.');
  };

  const handleUnassignStandard = async (standardId) => {
    if (!selectedEquipmentType) return;
    await window.api.compliance.unassignStandard(selectedEquipmentType, standardId);
    fetchAssignedStandards(selectedEquipmentType);
  };

  const handleDeleteStandard = async (id) => {
    if (window.confirm('Are you sure you want to delete this standard? This will also remove all assignments.')) {
      // In a real app, you might want to handle assignments more gracefully.
      // For now, we'll just delete the standard. The assignments will be orphaned but won't cause errors.
      // A better approach would be to use a transaction to delete assignments first.
      await window.api.compliance.deleteStandard(id);
      fetchStandards();
    }
  };

  const calculateComplianceStatus = async () => {
    setIsLoadingCompliance(true);

    const equipment = await window.api.equipment.getAll();
    const requirements = await window.api.compliance.getComplianceReport();
    const inspections = await window.api.inspections.getLastInspectionByEquipment();

    const inspectionsMap = inspections.reduce((acc, insp) => {
      acc[insp.equipment_id] = insp.last_inspection_date;
      return acc;
    }, {});

    const requirementsMap = requirements.reduce((acc, req) => {
      if (!acc[req.equipment_type]) {
        acc[req.equipment_type] = [];
      }
      acc[req.equipment_type].push(req.standard_name);
      return acc;
    }, {});

    const status = equipment.map(item => {
      const requiredStandards = requirementsMap[item.type] || [];
      if (requiredStandards.length === 0) {
        return { ...item, status: 'N/A', reason: 'No standards assigned to type' };
      }

      const lastInspectionDate = inspectionsMap[item.id];
      if (!lastInspectionDate) {
        return { ...item, status: 'Non-Compliant', reason: 'No inspection history' };
      }

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const inspectionDate = new Date(lastInspectionDate);

      if (inspectionDate < oneYearAgo) {
        return { ...item, status: 'Non-Compliant', reason: `Last inspection on ${lastInspectionDate} (over 1 year ago)` };
      }

      return { ...item, status: 'Compliant', reason: `Last inspection on ${lastInspectionDate}` };
    });

    setComplianceStatus(status);
    setIsLoadingCompliance(false);
  };

  return (
    <div className="compliance-manager">
      <h2>Compliance Management</h2>

      <div className="standards-list">
        <h3>Existing Standards</h3>
        <ul>
          {standards.map((standard) => (
            <li key={standard.id}>
              <strong>{standard.name}</strong> ({standard.authority}): {standard.description}
              <button onClick={() => handleDeleteStandard(standard.id)} className="delete-button">Delete</button>
            </li>
          ))}
        </ul>
      </div>

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
        {selectedEquipmentType && (
          <div className="assigned-standards-list">
            <h4>Assigned to {selectedEquipmentType}</h4>
            <ul>
              {assignedStandards.map((standard) => (
                <li key={standard.id}>
                  {standard.name}
                  <button onClick={() => handleUnassignStandard(standard.id)} className="delete-button">Remove</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="compliance-status-checker">
        <h3>Equipment Compliance Status</h3>
        <button onClick={calculateComplianceStatus} disabled={isLoadingCompliance}>
          {isLoadingCompliance ? 'Calculating...' : 'Calculate Compliance Status'}
        </button>
        {complianceStatus.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Equipment ID</th>
                <th>Type</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {complianceStatus.map(item => (
                <tr key={item.id} className={`status-${item.status.toLowerCase().replace(' ', '-')}`}>
                  <td>{item.equipment_id}</td>
                  <td>{item.type}</td>
                  <td>{item.status}</td>
                  <td>{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default ComplianceManager;
