import { create } from 'zustand';
import useUIStore from './uiStore';
import useEquipmentStore from './equipmentStore';
import useInspectionStore from './inspectionStore';
import initializeMiddleware from './middleware';

// Re-export all stores
export { default as useUIStore } from './uiStore';
export { default as useEquipmentStore } from './equipmentStore';
export { default as useInspectionStore } from './inspectionStore';

/**
 * Initialize cross-store communication middleware
 */
initializeMiddleware();

/**
 * Legacy Store - Provides backward compatibility for gradual migration
 * This store combines all domain-specific stores into a single API that
 * matches the original store's interface
 */
const useLegacyStore = create((set, get) => {
  // Subscribe to all stores to keep the legacy store in sync
  useUIStore.subscribe((uiState) => {
    // Update only UI-related state in the legacy store
    set({
      view: uiState.view,
      isSidebarOpen: uiState.isSidebarOpen,
      darkMode: uiState.darkMode,
    });
  });

  useEquipmentStore.subscribe((equipmentState) => {
    // Update only equipment-related state in the legacy store
    set({
      refresh: equipmentState.refresh,
      editingEquipment: equipmentState.editingEquipment,
      inspectingEquipment: equipmentState.inspectingEquipment,
    });
  });

  useInspectionStore.subscribe((inspectionState) => {
    // Update only inspection-related state in the legacy store
    set({
      viewingInspectionsFor: inspectionState.viewingInspectionsFor,
      addingInspectionFor: inspectionState.addingInspectionFor,
    });
  });

  return {
    // Combined state from all stores
    ...useUIStore.getState(),
    ...useEquipmentStore.getState(),
    ...useInspectionStore.getState(),

    // Actions that delegate to the appropriate domain-specific store
    toggleRefresh: () => useEquipmentStore.getState().toggleRefresh(),
    setEditingEquipment: (equipment) => useEquipmentStore.getState().setEditingEquipment(equipment),
    setViewingInspectionsFor: (equipmentId) => useInspectionStore.getState().setViewingInspectionsFor(equipmentId),
    setAddingInspectionFor: (equipmentId) => useInspectionStore.getState().setAddingInspectionFor(equipmentId),
    setInspectingEquipment: (equipment) => useEquipmentStore.getState().setInspectingEquipment(equipment),
    setView: (view) => useUIStore.getState().setView(view),
    toggleSidebar: () => useUIStore.getState().toggleSidebar(),
    toggleDarkMode: () => useUIStore.getState().toggleDarkMode(),
  };
});

// Default export is the legacy store for backward compatibility
export default useLegacyStore;