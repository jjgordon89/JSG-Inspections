import React from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import EquipmentList from './components/EquipmentList';
import AddEquipmentForm from './components/AddEquipmentForm';
import EditEquipmentForm from './components/EditEquipmentForm';
import InspectionForm from './components/InspectionForm';
import InspectionList from './components/InspectionList';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';
import useStore from './store';

function App() {
  const refresh = useStore((state) => state.refresh);
  const editingEquipment = useStore((state) => state.editingEquipment);
  const viewingInspectionsFor = useStore((state) => state.viewingInspectionsFor);
  const addingInspectionFor = useStore((state) => state.addingInspectionFor);
  const inspectingEquipment = useStore((state) => state.inspectingEquipment);
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);
  const darkMode = useStore((state) => state.darkMode);
  const view = useStore((state) => state.view);
  const toggleRefresh = useStore((state) => state.toggleRefresh);
  const setEditingEquipment = useStore((state) => state.setEditingEquipment);
  const setViewingInspectionsFor = useStore((state) => state.setViewingInspectionsFor);
  const setAddingInspectionFor = useStore((state) => state.setAddingInspectionFor);
  const setInspectingEquipment = useStore((state) => state.setInspectingEquipment);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const toggleDarkMode = useStore((state) => state.toggleDarkMode);

  const showToast = (message) => {
    toast(message);
  };

  const handleEquipmentAdded = () => {
    toggleRefresh();
    showToast('Equipment added');
  };

  const handleEquipmentUpdated = () => {
    setEditingEquipment(null);
    toggleRefresh();
    showToast('Equipment updated');
  };

  const handleCancelEdit = () => {
    setEditingEquipment(null);
  };

  const handleCloseInspections = () => {
    setViewingInspectionsFor(null);
  };

  const handleInspectionAdded = () => {
    setAddingInspectionFor(null);
    toggleRefresh();
    showToast('Inspection added');
  };

  const handleCancelAddInspection = () => {
    setAddingInspectionFor(null);
  };

  const handleStartInspection = (equipment) => {
    setInspectingEquipment(equipment);
  };

  const handleInspectionComplete = () => {
    setInspectingEquipment(null);
    toggleRefresh();
    showToast('Inspection complete');
  };

  return (
    <div className={`App${darkMode ? ' dark' : ''}`}>
      <Sidebar
        toggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />
      <div className="main-content">
        <header className="App-header">
          <h1>JSG Inspections</h1>
          <button
            onClick={toggleDarkMode}
            style={{
              marginLeft: '1rem',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              background: darkMode ? '#ffe082' : '#23272f',
              color: darkMode ? '#23272f' : '#ffe082',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'background 0.2s, color 0.2s',
            }}
            aria-label="Toggle dark mode"
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </header>
        <main>
          {view === 'dashboard' && <Dashboard />}
          {view === 'equipment' && !inspectingEquipment && (
            <>
              <AddEquipmentForm onEquipmentAdded={handleEquipmentAdded} showToast={showToast} />
              <EquipmentList
                key={refresh}
                onEdit={setEditingEquipment}
                onViewInspections={setViewingInspectionsFor}
                onInspect={handleStartInspection}
                showToast={showToast}
              />
            </>
          )}
          {inspectingEquipment && (
            <InspectionForm
              equipment={inspectingEquipment}
              onInspectionAdded={handleInspectionComplete}
              onCancel={() => {
                setInspectingEquipment(null);
              }}
              showToast={showToast}
            />
          )}
          {editingEquipment && (
            <Modal onClose={handleCancelEdit}>
              <EditEquipmentForm
                equipment={editingEquipment}
                onEquipmentUpdated={handleEquipmentUpdated}
                onCancel={handleCancelEdit}
                showToast={showToast}
              />
            </Modal>
          )}
          {addingInspectionFor && (
            <Modal onClose={handleCancelAddInspection}>
              <InspectionForm
                equipment={typeof addingInspectionFor === 'object' ? addingInspectionFor : { id: addingInspectionFor, type: '' }}
                onInspectionAdded={handleInspectionAdded}
                onCancel={handleCancelAddInspection}
                showToast={showToast}
              />
            </Modal>
          )}
          {viewingInspectionsFor && (
            <Modal onClose={handleCloseInspections}>
              <div>
                <button onClick={handleCloseInspections}>Back to Equipment</button>
                <button
                  onClick={async () => {
                    const equipment = await window.api.get('SELECT * FROM equipment WHERE id = ?', [viewingInspectionsFor]);
                    setAddingInspectionFor(equipment);
                  }}
                >
                  Add Inspection
                </button>
                <InspectionList equipmentId={viewingInspectionsFor} showToast={showToast} />
              </div>
            </Modal>
          )}
        </main>
        <ToastContainer />
      </div>
    </div>
  );
}

export default App;
