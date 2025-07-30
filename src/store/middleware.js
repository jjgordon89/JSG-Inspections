import useUIStore from './uiStore';
import useEquipmentStore from './equipmentStore';
import useInspectionStore from './inspectionStore';

/**
 * Store Middleware - Handles cross-store communication
 * Sets up listeners for key state changes that trigger actions in other stores
 */
const initializeMiddleware = () => {
  // Keep track of previous states to detect changes
  let prevUIState = useUIStore.getState();
  let prevEquipmentState = useEquipmentStore.getState();
  let prevInspectionState = useInspectionStore.getState();

  // Subscribe to UI store changes
  useUIStore.subscribe((state) => {
    // When view changes, reset certain states in other stores
    if (state.view !== prevUIState.view) {
      // If view is not equipment-related, reset equipment editing state
      if (state.view !== 'equipment' && state.view !== 'inspection') {
        useEquipmentStore.getState().setEditingEquipment(null);
        useEquipmentStore.getState().setInspectingEquipment(null);
        useInspectionStore.getState().setViewingInspectionsFor(null);
        useInspectionStore.getState().setAddingInspectionFor(null);
      }
    }
    
    prevUIState = state;
  });

  // Subscribe to Equipment store changes
  useEquipmentStore.subscribe((state) => {
    // When editing equipment changes
    if (state.editingEquipment !== prevEquipmentState.editingEquipment) {
      // If editing equipment is set, switch to equipment view
      if (state.editingEquipment) {
        useUIStore.getState().setView('equipment');
      }
    }

    // When inspecting equipment changes
    if (state.inspectingEquipment !== prevEquipmentState.inspectingEquipment) {
      // If inspecting equipment is set, reset viewing inspections
      if (state.inspectingEquipment) {
        useInspectionStore.getState().setViewingInspectionsFor(state.inspectingEquipment.id);
      }
    }
    
    prevEquipmentState = state;
  });

  // Subscribe to Inspection store changes
  useInspectionStore.subscribe((state) => {
    // When viewing inspections changes
    if (state.viewingInspectionsFor !== prevInspectionState.viewingInspectionsFor) {
      // If viewing inspections is set, switch to inspection view
      if (state.viewingInspectionsFor) {
        useUIStore.getState().setView('inspection');
      }
    }

    // When adding inspection changes
    if (state.addingInspectionFor !== prevInspectionState.addingInspectionFor) {
      // If adding inspection is set, switch to inspection form view
      if (state.addingInspectionFor) {
        useUIStore.getState().setView('inspection-form');
      }
    }
    
    prevInspectionState = state;
  });
};

export default initializeMiddleware;