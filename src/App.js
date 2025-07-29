import React, { useState } from 'react';
import './App.css';
import EquipmentList from './components/EquipmentList';
import AddEquipmentForm from './components/AddEquipmentForm';
import EditEquipmentForm from './components/EditEquipmentForm';
import InspectionForm from './components/InspectionForm';
import InspectionList from './components/InspectionList';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';

function App() {
  const [refresh, setRefresh] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [viewingInspectionsFor, setViewingInspectionsFor] = useState(null);
  const [addingInspectionFor, setAddingInspectionFor] = useState(null);
  const [view, setView] = useState('equipment');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleEquipmentAdded = () => {
    setRefresh(!refresh);
  };

  const handleEquipmentUpdated = () => {
    setEditingEquipment(null);
    setRefresh(!refresh);
  };

  const handleEdit = (equipment) => {
    setEditingEquipment(equipment);
  };

  const handleCancelEdit = () => {
    setEditingEquipment(null);
  };

  const handleViewInspections = (equipmentId) => {
    setViewingInspectionsFor(equipmentId);
  };

  const handleCloseInspections = () => {
    setViewingInspectionsFor(null);
  };

  const handleAddInspection = (equipmentId) => {
    setAddingInspectionFor(equipmentId);
  };

  const handleInspectionAdded = () => {
    setAddingInspectionFor(null);
    setRefresh(!refresh);
  };

  const handleCancelAddInspection = () => {
    setAddingInspectionFor(null);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="App">
      <Sidebar setView={setView} toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <div className={`main-content ${isSidebarOpen ? 'open' : 'closed'}`}>
        <header className="App-header">
          <h1>JSG Inspections</h1>
        </header>
        <main>
          {view === 'dashboard' ? (
            <Dashboard />
          ) : (
            <>
              {editingEquipment ? (
                <EditEquipmentForm
                  equipment={editingEquipment}
                  onEquipmentUpdated={handleEquipmentUpdated}
                  onCancel={handleCancelEdit}
                />
              ) : addingInspectionFor ? (
                <InspectionForm
                  equipmentId={addingInspectionFor}
                  onInspectionAdded={handleInspectionAdded}
                  onCancel={handleCancelAddInspection}
                />
              ) : (
                <AddEquipmentForm onEquipmentAdded={handleEquipmentAdded} />
              )}
              {viewingInspectionsFor ? (
                <div>
                  <button onClick={handleCloseInspections}>Back to Equipment</button>
                  <button onClick={() => handleAddInspection(viewingInspectionsFor)}>Add Inspection</button>
                  <InspectionList equipmentId={viewingInspectionsFor} />
                </div>
              ) : (
                <EquipmentList key={refresh} onEdit={handleEdit} onViewInspections={handleViewInspections} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;