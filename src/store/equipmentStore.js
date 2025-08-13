import { create } from 'zustand';

/**
 * Equipment Store - Manages equipment-related state.
 */
const useEquipmentStore = create((set) => ({
  /** @type {boolean} A flag to trigger a refresh in the equipment list. */
  refresh: false,
  /** @type {object|null} The equipment object that is currently being edited. */
  editingEquipment: null,
  /** @type {object|null} The equipment object that is currently being inspected. */
  inspectingEquipment: null,

  /**
   * Toggles the refresh flag to force a re-fetch of the equipment list.
   */
  toggleRefresh: () => set((state) => ({ refresh: !state.refresh })),

  /**
   * Sets the equipment to be edited.
   * @param {object|null} equipment - The equipment object to edit, or null to clear.
   */
  setEditingEquipment: (equipment) => set({ editingEquipment: equipment }),

  /**
   * Sets the equipment to be inspected.
   * @param {object|null} equipment - The equipment object to inspect, or null to clear.
   */
  setInspectingEquipment: (equipment) => set({ inspectingEquipment: equipment }),
}));

export default useEquipmentStore;