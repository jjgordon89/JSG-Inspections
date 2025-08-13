import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI Store - Manages UI-related state.
 * This store uses persist middleware to save UI settings to localStorage.
 */
const useUIStore = create(
  persist(
    (set) => ({
      /** @type {string} The current view being displayed in the main content area. */
      view: 'equipment',
      /** @type {boolean} Whether the sidebar is currently open. */
      isSidebarOpen: true,
      /** @type {boolean} Whether dark mode is enabled. */
      darkMode: false,

      /**
       * Sets the current view.
       * @param {string} view - The name of the view to display.
       */
      setView: (view) => set({ view }),

      /**
       * Toggles the visibility of the sidebar.
       */
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      /**
       * Toggles dark mode on and off.
       */
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: 'ui-storage', // unique name for localStorage
      getStorage: () => localStorage, // storage engine
    }
  )
);

export default useUIStore;