import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI Store - Manages UI-related state
 * Uses persist middleware to save UI settings to localStorage
 */
const useUIStore = create(
  persist(
    (set) => ({
      // State
      view: 'equipment',
      isSidebarOpen: true,
      darkMode: false,

      // Actions
      setView: (view) => set({ view }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: 'ui-storage', // unique name for localStorage
      getStorage: () => localStorage, // storage engine
    }
  )
);

export default useUIStore;