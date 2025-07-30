import useEquipmentStore from '../equipmentStore';

describe('Equipment Store', () => {
  beforeEach(() => {
    // Reset the store to its initial state
    const { getState, setState } = useEquipmentStore;
    setState({
      refresh: false,
      editingEquipment: null,
      inspectingEquipment: null,
    });
  });

  describe('Initial State', () => {
    it('should have the correct initial state', () => {
      const state = useEquipmentStore.getState();
      
      expect(state.refresh).toBe(false);
      expect(state.editingEquipment).toBeNull();
      expect(state.inspectingEquipment).toBeNull();
    });
  });

  describe('Actions', () => {
    it('should toggle refresh state with toggleRefresh action', () => {
      const { toggleRefresh } = useEquipmentStore.getState();
      
      // Initial state is false
      expect(useEquipmentStore.getState().refresh).toBe(false);
      
      // Toggle to true
      toggleRefresh();
      expect(useEquipmentStore.getState().refresh).toBe(true);
      
      // Toggle back to false
      toggleRefresh();
      expect(useEquipmentStore.getState().refresh).toBe(false);
    });

    it('should update editingEquipment with setEditingEquipment action', () => {
      const { setEditingEquipment } = useEquipmentStore.getState();
      
      // Initial state is null
      expect(useEquipmentStore.getState().editingEquipment).toBeNull();
      
      // Set equipment
      const mockEquipment = { id: 1, name: 'Test Equipment' };
      setEditingEquipment(mockEquipment);
      
      const newState = useEquipmentStore.getState();
      expect(newState.editingEquipment).toEqual(mockEquipment);
      
      // Set to null
      setEditingEquipment(null);
      expect(useEquipmentStore.getState().editingEquipment).toBeNull();
    });

    it('should update inspectingEquipment with setInspectingEquipment action', () => {
      const { setInspectingEquipment } = useEquipmentStore.getState();
      
      // Initial state is null
      expect(useEquipmentStore.getState().inspectingEquipment).toBeNull();
      
      // Set equipment
      const mockEquipment = { id: 2, name: 'Inspection Equipment' };
      setInspectingEquipment(mockEquipment);
      
      const newState = useEquipmentStore.getState();
      expect(newState.inspectingEquipment).toEqual(mockEquipment);
      
      // Set to null
      setInspectingEquipment(null);
      expect(useEquipmentStore.getState().inspectingEquipment).toBeNull();
    });
  });
});