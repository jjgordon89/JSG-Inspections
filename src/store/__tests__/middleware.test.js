// Mock the store modules
jest.mock('../uiStore', () => {
  const subscribe = jest.fn();
  const getState = jest.fn();
  const setView = jest.fn();
  
  getState.mockReturnValue({
    setView
  });
  
  return {
    __esModule: true,
    default: {
      getState,
      subscribe,
    }
  };
});

jest.mock('../equipmentStore', () => {
  const subscribe = jest.fn();
  const getState = jest.fn();
  const setEditingEquipment = jest.fn();
  const setInspectingEquipment = jest.fn();
  
  getState.mockReturnValue({
    setEditingEquipment,
    setInspectingEquipment
  });
  
  return {
    __esModule: true,
    default: {
      getState,
      subscribe,
    }
  };
});

jest.mock('../inspectionStore', () => {
  const subscribe = jest.fn();
  const getState = jest.fn();
  const setViewingInspectionsFor = jest.fn();
  const setAddingInspectionFor = jest.fn();
  
  getState.mockReturnValue({
    setViewingInspectionsFor,
    setAddingInspectionFor
  });
  
  return {
    __esModule: true,
    default: {
      getState,
      subscribe,
    }
  };
});

import initializeMiddleware from '../middleware';
import useUIStore from '../uiStore';
import useEquipmentStore from '../equipmentStore';
import useInspectionStore from '../inspectionStore';

describe('Store Middleware', () => {
  let uiSubscribeCallback;
  let equipmentSubscribeCallback;
  let inspectionSubscribeCallback;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset the mock implementations
    useUIStore.subscribe.mockImplementation(callback => {
      uiSubscribeCallback = callback;
      return () => {};
    });
    
    useEquipmentStore.subscribe.mockImplementation(callback => {
      equipmentSubscribeCallback = callback;
      return () => {};
    });
    
    useInspectionStore.subscribe.mockImplementation(callback => {
      inspectionSubscribeCallback = callback;
      return () => {};
    });
    
    // Initialize middleware
    initializeMiddleware();
  });
  
  describe('UI Store Subscriptions', () => {
    it('should reset equipment and inspection states when view changes to non-equipment/inspection view', () => {
      // Mock previous state
      const prevState = { view: 'equipment' };
      
      // Mock new state with view change
      const newState = { view: 'dashboard' };
      
      // Trigger the UI store subscription callback
      uiSubscribeCallback(newState, prevState);
      
      // Verify that equipment and inspection states are reset
      expect(useEquipmentStore.getState().setEditingEquipment).toHaveBeenCalledWith(null);
      expect(useEquipmentStore.getState().setInspectingEquipment).toHaveBeenCalledWith(null);
      expect(useInspectionStore.getState().setViewingInspectionsFor).toHaveBeenCalledWith(null);
      expect(useInspectionStore.getState().setAddingInspectionFor).toHaveBeenCalledWith(null);
    });
    
    it('should not reset states when view changes to equipment view', () => {
      // Mock previous state
      const prevState = { view: 'dashboard' };
      
      // Mock new state with view change to equipment
      const newState = { view: 'equipment' };
      
      // Trigger the UI store subscription callback
      uiSubscribeCallback(newState, prevState);
      
      // Verify that equipment and inspection states are not reset
      expect(useEquipmentStore.getState().setEditingEquipment).not.toHaveBeenCalled();
      expect(useEquipmentStore.getState().setInspectingEquipment).not.toHaveBeenCalled();
      expect(useInspectionStore.getState().setViewingInspectionsFor).not.toHaveBeenCalled();
      expect(useInspectionStore.getState().setAddingInspectionFor).not.toHaveBeenCalled();
    });
    
    it('should not reset states when view changes to inspection view', () => {
      // Mock previous state
      const prevState = { view: 'dashboard' };
      
      // Mock new state with view change to inspection
      const newState = { view: 'inspection' };
      
      // Trigger the UI store subscription callback
      uiSubscribeCallback(newState, prevState);
      
      // Verify that equipment and inspection states are not reset
      expect(useEquipmentStore.getState().setEditingEquipment).not.toHaveBeenCalled();
      expect(useEquipmentStore.getState().setInspectingEquipment).not.toHaveBeenCalled();
      expect(useInspectionStore.getState().setViewingInspectionsFor).not.toHaveBeenCalled();
      expect(useInspectionStore.getState().setAddingInspectionFor).not.toHaveBeenCalled();
    });
  });
  
  describe('Equipment Store Subscriptions', () => {
    it('should change UI view to equipment when editingEquipment is set', () => {
      // Mock previous state
      const prevState = { editingEquipment: null };
      
      // Mock new state with editingEquipment set
      const newState = { 
        editingEquipment: { id: 1, name: 'Test Equipment' },
        inspectingEquipment: null
      };
      
      // Trigger the Equipment store subscription callback
      equipmentSubscribeCallback(newState, prevState);
      
      // Verify that UI view is changed to equipment
      expect(useUIStore.getState().setView).toHaveBeenCalledWith('equipment');
    });
    
    it('should update viewingInspectionsFor when inspectingEquipment is set', () => {
      // Mock previous state
      const prevState = { inspectingEquipment: null };
      
      // Mock new state with inspectingEquipment set
      const newState = { 
        editingEquipment: null,
        inspectingEquipment: { id: 2, name: 'Inspection Equipment' }
      };
      
      // Trigger the Equipment store subscription callback
      equipmentSubscribeCallback(newState, prevState);
      
      // Verify that viewingInspectionsFor is updated
      expect(useInspectionStore.getState().setViewingInspectionsFor).toHaveBeenCalledWith(2);
    });
    
    it('should not change UI view when editingEquipment is cleared', () => {
      // Mock previous state with editingEquipment set
      const prevState = { editingEquipment: { id: 1, name: 'Test Equipment' } };
      
      // Mock new state with editingEquipment cleared
      const newState = { editingEquipment: null };
      
      // Trigger the Equipment store subscription callback
      equipmentSubscribeCallback(newState, prevState);
      
      // Verify that UI view is not changed
      expect(useUIStore.getState().setView).not.toHaveBeenCalled();
    });
  });
  
  describe('Inspection Store Subscriptions', () => {
    it('should change UI view to inspection when viewingInspectionsFor is set', () => {
      // Mock previous state
      const prevState = { viewingInspectionsFor: null };
      
      // Mock new state with viewingInspectionsFor set
      const newState = { 
        viewingInspectionsFor: 1,
        addingInspectionFor: null
      };
      
      // Trigger the Inspection store subscription callback
      inspectionSubscribeCallback(newState, prevState);
      
      // Verify that UI view is changed to inspection
      expect(useUIStore.getState().setView).toHaveBeenCalledWith('inspection');
    });
    
    it('should change UI view to inspection-form when addingInspectionFor is set', () => {
      // Mock previous state
      const prevState = { addingInspectionFor: null };
      
      // Mock new state with addingInspectionFor set
      const newState = { 
        viewingInspectionsFor: null,
        addingInspectionFor: 2
      };
      
      // Trigger the Inspection store subscription callback
      inspectionSubscribeCallback(newState, prevState);
      
      // Verify that UI view is changed to inspection-form
      expect(useUIStore.getState().setView).toHaveBeenCalledWith('inspection-form');
    });
    
    it('should not change UI view when viewingInspectionsFor is cleared', () => {
      // Mock previous state with viewingInspectionsFor set
      const prevState = { viewingInspectionsFor: 1 };
      
      // Mock new state with viewingInspectionsFor cleared
      const newState = { viewingInspectionsFor: null };
      
      // Trigger the Inspection store subscription callback
      inspectionSubscribeCallback(newState, prevState);
      
      // Verify that UI view is not changed
      expect(useUIStore.getState().setView).not.toHaveBeenCalled();
    });
    
    it('should not change UI view when addingInspectionFor is cleared', () => {
      // Mock previous state with addingInspectionFor set
      const prevState = { addingInspectionFor: 2 };
      
      // Mock new state with addingInspectionFor cleared
      const newState = { addingInspectionFor: null };
      
      // Trigger the Inspection store subscription callback
      inspectionSubscribeCallback(newState, prevState);
      
      // Verify that UI view is not changed
      expect(useUIStore.getState().setView).not.toHaveBeenCalled();
    });
  });
});