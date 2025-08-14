/**
 * Lazy Component Loading Configuration
 * 
 * This file implements code splitting for React components to reduce the main bundle size.
 * Components are loaded on-demand when needed, improving initial load performance.
 */

import { lazy } from 'react';

// Utility function to create lazy components with error boundaries
const createLazyComponent = (importFunc, componentName) => {
  const LazyComponent = lazy(importFunc);
  LazyComponent.displayName = `Lazy(${componentName})`;
  return LazyComponent;
};

// Core components (keep in main bundle for immediate availability)
export const Dashboard = createLazyComponent(
  () => import('../components/Dashboard'),
  'Dashboard'
);

// Equipment Management
export const Equipment = createLazyComponent(
  () => import('../components/EquipmentList'),
  'EquipmentList'
);

export const EquipmentList = createLazyComponent(
  () => import('../components/EquipmentList'),
  'EquipmentList'
);

export const AddEquipmentForm = createLazyComponent(
  () => import('../components/AddEquipmentForm'),
  'AddEquipmentForm'
);

export const EditEquipmentForm = createLazyComponent(
  () => import('../components/EditEquipmentForm'),
  'EditEquipmentForm'
);

// Inspection Management
export const InspectionForm = createLazyComponent(
  () => import('../components/InspectionForm'),
  'InspectionForm'
);

export const InspectionList = createLazyComponent(
  () => import('../components/InspectionList'),
  'InspectionList'
);

// Work Orders
export const WorkOrders = createLazyComponent(
  () => import('../components/WorkOrders'),
  'WorkOrders'
);

export const WorkOrderCreateForm = createLazyComponent(
  () => import('../components/WorkOrderCreateForm'),
  'WorkOrderCreateForm'
);

export const WorkOrderCompletionForm = createLazyComponent(
  () => import('../components/WorkOrderCompletionForm'),
  'WorkOrderCompletionForm'
);

// Compliance & Maintenance
export const ComplianceManager = createLazyComponent(
  () => import('../components/ComplianceManager'),
  'ComplianceManager'
);

export const PreventiveMaintenance = createLazyComponent(
  () => import('../components/PreventiveMaintenance'),
  'PreventiveMaintenance'
);

export const Deficiencies = createLazyComponent(
  () => import('../components/Deficiencies'),
  'Deficiencies'
);

// Testing & Calibration
export const LoadTests = createLazyComponent(
  () => import('../components/LoadTests'),
  'LoadTests'
);

export const Calibrations = createLazyComponent(
  () => import('../components/Calibrations'),
  'Calibrations'
);

// Credentials & Certificates
export const Credentials = createLazyComponent(
  () => import('../components/Credentials'),
  'Credentials'
);

// Scheduling
export const Scheduler = createLazyComponent(
  () => import('../components/Scheduler'),
  'Scheduler'
);

// Reports
export const ReportGenerator = createLazyComponent(
  () => import('../components/ReportGenerator'),
  'ReportGenerator'
);

// Template Management
export const TemplateBuilder = createLazyComponent(
  () => import('../components/TemplateBuilder'),
  'TemplateBuilder'
);

// Settings
export const Settings = createLazyComponent(
  () => import('../components/Settings'),
  'Settings'
);

// Utilities
export const QrScanner = createLazyComponent(
  () => import('../components/QrScanner'),
  'QrScanner'
);

export const PhotoAnnotation = createLazyComponent(
  () => import('../components/PhotoAnnotation'),
  'PhotoAnnotation'
);

// Performance Monitoring (development/admin only)
export const PerformanceMonitor = createLazyComponent(
  () => import('../components/PerformanceMonitor'),
  'PerformanceMonitor'
);

// Preload critical components for better UX
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be used immediately
  const criticalComponents = [
    () => import('../components/Dashboard'),
    () => import('../components/Equipment'),
    () => import('../components/InspectionForm')
  ];

  // Use requestIdleCallback if available, otherwise setTimeout
  const schedulePreload = (callback) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(callback, { timeout: 2000 });
    } else {
      setTimeout(callback, 100);
    }
  };

  criticalComponents.forEach((importFunc, index) => {
    schedulePreload(() => {
      importFunc().catch(error => {
        console.warn(`Failed to preload component ${index}:`, error);
      });
    });
  });
};

// Component loading states and error handling
export const LoadingFallback = ({ componentName = 'Component' }) => (
  <div className="loading-container" style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    flexDirection: 'column',
    gap: '16px'
  }}>
    <div className="loading-spinner" style={{
      width: '40px',
      height: '40px',
      border: '4px solid #f3f3f3',
      borderTop: '4px solid #007bff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <p style={{ color: '#666', fontSize: '14px' }}>Loading {componentName}...</p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export const ErrorFallback = ({ error, componentName = 'Component' }) => (
  <div className="error-container" style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px',
    border: '1px solid #dc3545',
    borderRadius: '8px',
    backgroundColor: '#f8d7da',
    color: '#721c24'
  }}>
    <h3>Failed to load {componentName}</h3>
    <p>There was an error loading this component.</p>
    <details style={{ marginTop: '10px' }}>
      <summary style={{ cursor: 'pointer' }}>Error Details</summary>
      <pre style={{ 
        marginTop: '10px', 
        padding: '10px', 
        backgroundColor: '#fff', 
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '12px',
        overflow: 'auto',
        maxWidth: '100%'
      }}>
        {error?.message || 'Unknown error'}
      </pre>
    </details>
    <button 
      onClick={() => window.location.reload()} 
      style={{
        padding: '8px 16px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Reload Page
    </button>
  </div>
);

// Bundle analysis helper
export const getBundleInfo = () => {
  const components = {
    Dashboard, Equipment, AddEquipmentForm, EditEquipmentForm,
    InspectionForm, InspectionList, WorkOrders, WorkOrderCreateForm,
    WorkOrderCompletionForm, ComplianceManager, PreventiveMaintenance,
    Deficiencies, LoadTests, Calibrations, Credentials, Scheduler,
    ReportGenerator, TemplateBuilder, Settings, QrScanner,
    PhotoAnnotation, PerformanceMonitor
  };

  return {
    totalLazyComponents: Object.keys(components).length,
    componentNames: Object.keys(components),
    preloadEnabled: typeof preloadCriticalComponents === 'function'
  };
};