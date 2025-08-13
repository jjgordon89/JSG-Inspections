import { create } from 'zustand';

/**
 * Inspection Store - Manages inspection-related state.
 */
const useInspectionStore = create((set) => ({
  /** @type {number|null} The ID of the equipment whose inspections are being viewed. */
  viewingInspectionsFor: null,
  /** @type {number|null} The ID of the equipment for which a new inspection is being added. */
  addingInspectionFor: null,

  /**
   * Sets the equipment ID for viewing inspections.
   * @param {number|null} equipmentId - The equipment ID, or null to clear.
   */
  setViewingInspectionsFor: (equipmentId) => set({ viewingInspectionsFor: equipmentId }),

  /**
   * Sets the equipment ID for adding a new inspection.
   * @param {number|null} equipmentId - The equipment ID, or null to clear.
   */
  setAddingInspectionFor: (equipmentId) => set({ addingInspectionFor: equipmentId }),
}));

export default useInspectionStore;