import { useUIStore, useEquipmentStore, useInspectionStore } from '../index';

describe('Store Barrel Export', () => {
  describe('Export Structure', () => {
    it('should export all required stores', () => {
      expect(useUIStore).toBeDefined();
      expect(useEquipmentStore).toBeDefined();
      expect(useInspectionStore).toBeDefined();
    });

    it('should export functions (Zustand stores)', () => {
      expect(typeof useUIStore).toBe('function');
      expect(typeof useEquipmentStore).toBe('function');
      expect(typeof useInspectionStore).toBe('function');
    });
  });

  describe('Store Functionality', () => {
    it('should provide working UI store through barrel export', () => {
      const uiState = useUIStore.getState();
      expect(uiState).toHaveProperty('view');
      expect(uiState).toHaveProperty('isSidebarOpen');
      expect(uiState).toHaveProperty('darkMode');
      expect(uiState).toHaveProperty('setView');
      expect(uiState).toHaveProperty('toggleSidebar');
      expect(uiState).toHaveProperty('toggleDarkMode');
    });

    it('should provide working equipment store through barrel export', () => {
      const equipmentState = useEquipmentStore.getState();
      expect(equipmentState).toHaveProperty('refresh');
      expect(equipmentState).toHaveProperty('editingEquipment');
      expect(equipmentState).toHaveProperty('inspectingEquipment');
      expect(equipmentState).toHaveProperty('toggleRefresh');
      expect(equipmentState).toHaveProperty('setEditingEquipment');
      expect(equipmentState).toHaveProperty('setInspectingEquipment');
    });

    it('should provide working inspection store through barrel export', () => {
      const inspectionState = useInspectionStore.getState();
      expect(inspectionState).toHaveProperty('viewingInspectionsFor');
      expect(inspectionState).toHaveProperty('addingInspectionFor');
      expect(inspectionState).toHaveProperty('setViewingInspectionsFor');
      expect(inspectionState).toHaveProperty('setAddingInspectionFor');
    });
  });

  describe('Store Independence', () => {
    it('should maintain separate state for each store', () => {
      const { setView } = useUIStore.getState();
      const { toggleRefresh } = useEquipmentStore.getState();
      const { setViewingInspectionsFor } = useInspectionStore.getState();

      // Make changes to each store
      setView('reports');
      toggleRefresh();
      setViewingInspectionsFor(123);

      // Verify each store maintains its own state
      const uiState = useUIStore.getState();
      const equipmentState = useEquipmentStore.getState();
      const inspectionState = useInspectionStore.getState();

      expect(uiState.view).toBe('reports');
      expect(equipmentState.refresh).toBe(true);
      expect(inspectionState.viewingInspectionsFor).toBe(123);

      // Verify stores don't interfere with each other
      expect(uiState.refresh).toBeUndefined();
      expect(equipmentState.view).toBeUndefined();
      expect(inspectionState.view).toBeUndefined();
    });
  });
});
