import useInspectionStore from '../inspectionStore';

describe('Inspection Store', () => {
  beforeEach(() => {
    // Reset the store to its initial state
    const { getState, setState } = useInspectionStore;
    setState({
      viewingInspectionsFor: null,
      addingInspectionFor: null,
    });
  });

  describe('Initial State', () => {
    it('should have the correct initial state', () => {
      const state = useInspectionStore.getState();
      
      expect(state.viewingInspectionsFor).toBeNull();
      expect(state.addingInspectionFor).toBeNull();
    });
  });

  describe('Actions', () => {
    it('should update viewingInspectionsFor with setViewingInspectionsFor action', () => {
      const { setViewingInspectionsFor } = useInspectionStore.getState();
      
      // Initial state is null
      expect(useInspectionStore.getState().viewingInspectionsFor).toBeNull();
      
      // Set equipment ID
      const mockEquipmentId = 1;
      setViewingInspectionsFor(mockEquipmentId);
      
      const newState = useInspectionStore.getState();
      expect(newState.viewingInspectionsFor).toBe(mockEquipmentId);
      
      // Set to null
      setViewingInspectionsFor(null);
      expect(useInspectionStore.getState().viewingInspectionsFor).toBeNull();
    });

    it('should update addingInspectionFor with setAddingInspectionFor action', () => {
      const { setAddingInspectionFor } = useInspectionStore.getState();
      
      // Initial state is null
      expect(useInspectionStore.getState().addingInspectionFor).toBeNull();
      
      // Set equipment ID
      const mockEquipmentId = 2;
      setAddingInspectionFor(mockEquipmentId);
      
      const newState = useInspectionStore.getState();
      expect(newState.addingInspectionFor).toBe(mockEquipmentId);
      
      // Set to null
      setAddingInspectionFor(null);
      expect(useInspectionStore.getState().addingInspectionFor).toBeNull();
    });
  });
});