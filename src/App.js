import React, { Suspense, useEffect } from 'react';
import './App.css';

// Core components (keep in main bundle)
import Toast from './components/Toast';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';
import Login from './components/Login';
import UserHeader from './components/UserHeader';
import { UserProvider, useUser } from './contexts/UserContext';
import { useUIStore, useEquipmentStore, useInspectionStore } from './store';

// Phase 4 enhancements
import PWAManager from './utils/pwaUtils';
import analytics from './utils/analytics';
import advancedTesting from './utils/advancedTesting';
import dataCache from './utils/dataCache';

// Lazy-loaded components
import {
  Dashboard,
  Equipment,
  EquipmentList,
  AddEquipmentForm,
  EditEquipmentForm,
  InspectionForm,
  InspectionList,
  TemplateBuilder,
  Scheduler,
  ReportGenerator,
  ComplianceManager,
  Settings,
  WorkOrders,
  PreventiveMaintenance,
  Deficiencies,
  LoadTests,
  Calibrations,
  Credentials,
  LoadingFallback,
  preloadCriticalComponents
} from './utils/lazyComponents';

import SuspenseWrapper from './components/SuspenseWrapper';

// Preload critical components and initialize Phase 4 enhancements
if (typeof window !== 'undefined') {
  preloadCriticalComponents();
  
  // Initialize PWA features
  const pwaManager = new PWAManager();
  pwaManager.init();
  
  // Initialize analytics
  analytics.trackPageView(window.location.pathname);
  
  // Initialize advanced testing in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Advanced Testing Framework initialized');
  }
}

// Main authenticated application component
function AuthenticatedApp() {
  // UI state from uiStore
  const view = useUIStore((state) => state.view);
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const darkMode = useUIStore((state) => state.darkMode);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  
  // Phase 4: Analytics and PWA integration
  useEffect(() => {
    // Track view changes
    analytics.trackEvent('view_change', { view, timestamp: Date.now() });
    
    // Track page view for analytics
    analytics.trackPageView(`/app/${view}`);
  }, [view]);
  
  useEffect(() => {
    // Track dark mode preference
    analytics.trackEvent('theme_change', { darkMode, timestamp: Date.now() });
  }, [darkMode]);
  
  useEffect(() => {
    // Track sidebar usage
    analytics.trackEvent('sidebar_toggle', { isOpen: isSidebarOpen, timestamp: Date.now() });
  }, [isSidebarOpen]);
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
    
    // Phase 4: Track equipment events
    analytics.trackEquipmentEvent('added', {
      id: 'new_equipment',
      type: 'unknown',
      location: 'unknown',
      status: 'active'
    });
  };

  const handleEquipmentUpdated = () => {
    setEditingEquipment(null);
    toggleRefresh();
    showToast('Equipment updated');
    
    // Phase 4: Track equipment events
    if (editingEquipment) {
      analytics.trackEquipmentEvent('updated', {
        id: editingEquipment.id,
        type: editingEquipment.type || 'unknown',
        location: editingEquipment.location || 'unknown',
        status: editingEquipment.status || 'active'
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingEquipment(null);
    analytics.trackEvent('equipment_edit_cancelled', { timestamp: Date.now() });
  };

  const handleCloseInspections = () => {
    setViewingInspectionsFor(null);
    analytics.trackEvent('inspection_list_closed', { timestamp: Date.now() });
  };

  const handleInspectionAdded = () => {
    setAddingInspectionFor(null);
    toggleRefresh();
    showToast('Inspection added');
    
    // Phase 4: Track inspection events
    analytics.trackInspectionEvent('added', {
      id: 'new_inspection',
      type: 'manual',
      status: 'completed',
      duration: 0,
      equipmentId: addingInspectionFor?.id || 'unknown'
    });
  };

  const handleCancelAddInspection = () => {
    setAddingInspectionFor(null);
    analytics.trackEvent('inspection_add_cancelled', { timestamp: Date.now() });
  };

  const handleStartInspection = (equipment) => {
    setInspectingEquipment(equipment);
    
    // Phase 4: Track inspection start
    analytics.trackInspectionEvent('started', {
      id: 'inspection_' + Date.now(),
      type: 'manual',
      status: 'in_progress',
      duration: 0,
      equipmentId: equipment.id
    });
  };

  const handleInspectionComplete = () => {
    setInspectingEquipment(null);
    toggleRefresh();
    showToast('Inspection complete');
    
    // Phase 4: Track inspection completion
    if (inspectingEquipment) {
      analytics.trackInspectionEvent('completed', {
        id: 'inspection_' + Date.now(),
        type: 'manual',
        status: 'completed',
        duration: 0,
        equipmentId: inspectingEquipment.id
      });
    }
  };

  return (
    <div className={`App${darkMode ? ' dark' : ''}`}>
      {/* Phase 4: PWA Install Prompt */}
      <div id="pwa-install-banner" className="pwa-banner" style={{ display: 'none' }}>
        <div className="pwa-banner-content">
          <span>Install JSG Inspections for a better experience</span>
          <button id="pwa-install-btn" className="pwa-install-button">Install</button>
          <button id="pwa-dismiss-btn" className="pwa-dismiss-button">×</button>
        </div>
      </div>
      
      {/* Phase 4: PWA Update Notification */}
      <div id="pwa-update-banner" className="pwa-update-banner" style={{ display: 'none' }}>
        <div className="pwa-banner-content">
          <span>A new version is available</span>
          <button id="pwa-update-btn" className="pwa-update-button">Update</button>
          <button id="pwa-update-dismiss-btn" className="pwa-dismiss-button">×</button>
        </div>
      </div>
      
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
          {view === 'dashboard' && (
            <SuspenseWrapper componentName="Dashboard">
              <Dashboard />
            </SuspenseWrapper>
          )}
          {view === 'templateBuilder' && (
            <SuspenseWrapper componentName="TemplateBuilder">
              <TemplateBuilder />
            </SuspenseWrapper>
          )}
          {view === 'scheduler' && (
            <SuspenseWrapper componentName="Scheduler">
              <Scheduler />
            </SuspenseWrapper>
          )}
          {view === 'reporting' && (
            <SuspenseWrapper componentName="ReportGenerator">
              <ReportGenerator />
            </SuspenseWrapper>
          )}
          {view === 'workOrders' && (
            <SuspenseWrapper componentName="WorkOrders">
              <WorkOrders />
            </SuspenseWrapper>
          )}
          {view === 'preventiveMaintenance' && (
            <SuspenseWrapper componentName="PreventiveMaintenance">
              <PreventiveMaintenance />
            </SuspenseWrapper>
          )}
          {view === 'deficiencies' && (
            <SuspenseWrapper componentName="Deficiencies">
              <Deficiencies />
            </SuspenseWrapper>
          )}
          {view === 'loadTests' && (
            <SuspenseWrapper componentName="LoadTests">
              <LoadTests />
            </SuspenseWrapper>
          )}
          {view === 'calibrations' && (
            <SuspenseWrapper componentName="Calibrations">
              <Calibrations />
            </SuspenseWrapper>
          )}
          {view === 'credentials' && (
            <SuspenseWrapper componentName="Credentials">
              <Credentials />
            </SuspenseWrapper>
          )}
          {view === 'compliance' && (
            <SuspenseWrapper componentName="ComplianceManager">
              <ComplianceManager />
            </SuspenseWrapper>
          )}
          {view === 'settings' && (
            <SuspenseWrapper componentName="Settings">
              <Settings />
            </SuspenseWrapper>
          )}
          {view === 'equipment' && !inspectingEquipment && (
            <>
              <SuspenseWrapper componentName="AddEquipmentForm">
                <AddEquipmentForm onEquipmentAdded={handleEquipmentAdded} showToast={showToast} />
              </SuspenseWrapper>
              <SuspenseWrapper componentName="Equipment">
                <Equipment
                  key={refresh}
                  onEdit={setEditingEquipment}
                  onViewInspections={setViewingInspectionsFor}
                  onInspect={handleStartInspection}
                  showToast={showToast}
                />
              </SuspenseWrapper>
            </>
          )}
          {inspectingEquipment && (
            <SuspenseWrapper componentName="InspectionForm">
              <InspectionForm
                onInspectionAdded={handleInspectionComplete}
                onCancel={() => {
                  setInspectingEquipment(null);
                }}
                showToast={showToast}
              />
            </SuspenseWrapper>
          )}
          {editingEquipment && (
            <Modal onClose={handleCancelEdit}>
              <SuspenseWrapper componentName="EditEquipmentForm">
                <EditEquipmentForm
                  equipment={editingEquipment}
                  onEquipmentUpdated={handleEquipmentUpdated}
                  onCancel={handleCancelEdit}
                  showToast={showToast}
                />
              </SuspenseWrapper>
            </Modal>
          )}
          {addingInspectionFor && (
            <Modal onClose={handleCancelAddInspection}>
              <SuspenseWrapper componentName="InspectionForm">
                <InspectionForm
                  onInspectionAdded={handleInspectionAdded}
                  onCancel={handleCancelAddInspection}
                  showToast={showToast}
                />
              </SuspenseWrapper>
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
                <SuspenseWrapper componentName="InspectionList">
                  <InspectionList showToast={showToast} />
                </SuspenseWrapper>
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
