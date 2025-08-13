import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI Store - Manages UI-related state.
 * This store uses persist middleware to save UI settings to localStorage.
 */
const useUIStore = create(
  persist(
    (set, get) => ({
      /** @type {string} The current view being displayed in the main content area. */
      view: 'equipment',
      /** @type {boolean} Whether the sidebar is currently open. */
      isSidebarOpen: true,
      /** @type {boolean} Whether dark mode is enabled. */
      darkMode: false,
      /** @type {Array} Array of toast notifications */
      toasts: [],

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

      /**
       * Shows a toast notification.
       * @param {string} message - The message to display.
       * @param {string} type - The type of toast ('success', 'error', 'warning', 'info').
       * @param {number} duration - How long to show the toast in milliseconds (default: 5000).
       */
      showToast: (message, type = 'info', duration = 5000) => {
        const id = Date.now() + Math.random();
        const toast = { id, message, type, duration };
        
        set((state) => ({
          toasts: [...state.toasts, toast]
        }));

        // Auto-remove toast after duration
        setTimeout(() => {
          get().removeToast(id);
        }, duration);

        return id;
      },

      /**
       * Removes a toast notification.
       * @param {number} id - The ID of the toast to remove.
       */
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter(toast => toast.id !== id)
      })),

      /**
       * Clears all toast notifications.
       */
      clearToasts: () => set({ toasts: [] }),
    }),
    {
      name: 'ui-storage', // unique name for localStorage
      getStorage: () => localStorage, // storage engine
    }
  )
);

export default useUIStore;
