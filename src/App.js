import React from 'react';
import './App.css';
import Toast from './components/Toast';
import EquipmentList from './components/EquipmentList';
import AddEquipmentForm from './components/AddEquipmentForm';
import EditEquipmentForm from './components/EditEquipmentForm';
import InspectionForm from './components/InspectionForm';
import InspectionList from './components/InspectionList';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';
import TemplateBuilder from './components/TemplateBuilder';
import Scheduler from './components/Scheduler';
import ReportGenerator from './components/ReportGenerator';
import ComplianceManager from './components/ComplianceManager';
import Settings from './components/Settings';
import WorkOrders from './components/WorkOrders';
import PreventiveMaintenance from './components/PreventiveMaintenance';
import Deficiencies from './components/Deficiencies';
import LoadTests from './components/LoadTests';
import Calibrations from './components/Calibrations';
import Credentials from './components/Credentials';
import Login from './components/Login';
import UserHeader from './components/UserHeader';
import { UserProvider, useUser } from './contexts/UserContext';
import { useUIStore, useEquipmentStore, useInspectionStore } from './store';

// Main authenticated application component
function AuthenticatedApp() {
  // UI state from uiStore
  const view = useUIStore((state) => state.view);
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const darkMode = useUIStore((state) => state.darkMode);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const toggleDarkMode = useUIStore((state) => state.toggleDarkMode);
  
  // Equipment state from equipmentStore
  const refresh = useEquipmentStore((state) => state.refresh);
  const editingEquipment = useEquipmentStore((state) => state.editingEquipment);
  const inspectingEquipment = useEquipmentStore((state) => state.inspectingEquipment);
  const toggleRefresh = useEquipmentStore((state) => state.toggleRefresh);
  const setEditingEquipment = useEquipmentStore((state) => state.setEditingEquipment);
  const setInspectingEquipment = useEquipmentStore((state) => state.setInspectingEquipment);
  
  // Inspection state from inspectionStore
  const viewingInspectionsFor = useInspectionStore((state) => state.viewingInspectionsFor);
  const addingInspectionFor = useInspectionStore((state) => state.addingInspectionFor);
  const setViewingInspectionsFor = useInspectionStore((state) => state.setViewingInspectionsFor);
  const setAddingInspectionFor = useInspectionStore((state) => state.setAddingInspectionFor);

  const showToast = useUIStore((state) => state.showToast);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={toggleDarkMode}
              style={{
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
            <UserHeader />
          </div>
        </header>
        <main>
          {view === 'dashboard' && <Dashboard />}
          {view === 'templateBuilder' && <TemplateBuilder />}
          {view === 'scheduler' && <Scheduler />}
          {view === 'reporting' && <ReportGenerator />}
          {view === 'workOrders' && <WorkOrders />}
          {view === 'preventiveMaintenance' && <PreventiveMaintenance />}
          {view === 'deficiencies' && <Deficiencies />}
          {view === 'loadTests' && <LoadTests />}
          {view === 'calibrations' && <Calibrations />}
          {view === 'credentials' && <Credentials />}
          {view === 'compliance' && <ComplianceManager />}
          {view === 'settings' && <Settings />}
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
                    const equipment = await window.api.secureOperation('equipment', 'getById', { id: viewingInspectionsFor });
                    setAddingInspectionFor(equipment);
                  }}
                >
                  Add Inspection
                </button>
                <InspectionList showToast={showToast} />
              </div>
            </Modal>
          )}
        </main>
        <Toast />
      </div>
    </div>
  );
}

// Main App component with authentication wrapper
function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

// App content that handles authentication state
function AppContent() {
  const { isAuthenticated, isLoading } = useUser();
  const darkMode = useUIStore((state) => state.darkMode);

  if (isLoading) {
    return (
      <div className={`App${darkMode ? ' dark' : ''}`}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '1.2rem',
          color: '#718096'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`App${darkMode ? ' dark' : ''}`}>
        <Login />
      </div>
    );
  }

  return <AuthenticatedApp />;
}

export default App;
