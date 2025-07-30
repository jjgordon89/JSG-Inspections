import { create } from 'zustand';

/**
 * Inspection Store - Manages inspection-related state
 */
const useInspectionStore = create((set) => ({
  // State
  viewingInspectionsFor: null,
  addingInspectionFor: null,

  // Actions
  setViewingInspectionsFor: (equipmentId) => set({ viewingInspectionsFor: equipmentId }),
  setAddingInspectionFor: (equipmentId) => set({ addingInspectionFor: equipmentId }),
}));

export default useInspectionStore;