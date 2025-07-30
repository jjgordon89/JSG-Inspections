import { create } from 'zustand';

/**
 * Equipment Store - Manages equipment-related state
 */
const useEquipmentStore = create((set) => ({
  // State
  refresh: false,
  editingEquipment: null,
  inspectingEquipment: null,

  // Actions
  toggleRefresh: () => set((state) => ({ refresh: !state.refresh })),
  setEditingEquipment: (equipment) => set({ editingEquipment: equipment }),
  setInspectingEquipment: (equipment) => set({ inspectingEquipment: equipment }),
}));

export default useEquipmentStore;