import { create } from 'zustand';

const useStore = create((set) => ({
  // State
  refresh: false,
  editingEquipment: null,
  viewingInspectionsFor: null,
  addingInspectionFor: null,
  view: 'equipment',
  isSidebarOpen: true,
  darkMode: false,
  inspectingEquipment: null,

  // Actions
  toggleRefresh: () => set((state) => ({ refresh: !state.refresh })),
  setEditingEquipment: (equipment) => set({ editingEquipment: equipment }),
  setViewingInspectionsFor: (equipmentId) => set({ viewingInspectionsFor: equipmentId }),
  setAddingInspectionFor: (equipmentId) => set({ addingInspectionFor: equipmentId }),
  setInspectingEquipment: (equipment) => set({ inspectingEquipment: equipment }),
  setView: (view) => set({ view }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
}));

export default useStore;