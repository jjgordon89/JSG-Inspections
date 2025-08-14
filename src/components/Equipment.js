import React, { useState } from 'react';
import AddEquipmentForm from './AddEquipmentForm';
import EquipmentList from './EquipmentList';
import { useEquipmentStore } from '../store';
import './Equipment.css';

function Equipment({ onViewInspections, showToast }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const searchTerm = useEquipmentStore((state) => state.searchTerm);
  const setSearchTerm = useEquipmentStore((state) => state.setSearchTerm);
  const filterStatus = useEquipmentStore((state) => state.filterStatus);
  const setFilterStatus = useEquipmentStore((state) => state.setFilterStatus);

  const handleEquipmentAdded = () => {
    setShowAddForm(false);
    if (showToast) {
      showToast('Equipment added successfully!', 'success');
    }
  };

  return (
    <div className="equipment-container" data-testid="equipment-container">
      <div className="equipment-header">
        <h2>Equipment Management</h2>
        <div className="equipment-controls">
          <input
            type="text"
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="under maintenance">Under Maintenance</option>
          </select>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
          >
            {showAddForm ? 'Cancel' : 'Add Equipment'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="add-equipment-section">
          <AddEquipmentForm 
            onEquipmentAdded={handleEquipmentAdded} 
            showToast={showToast} 
          />
        </div>
      )}

      <EquipmentList 
        onViewInspections={onViewInspections} 
        showToast={showToast}
        searchTerm={searchTerm}
        filterStatus={filterStatus}
      />
    </div>
  );
}

export default Equipment;