import useUIStore from '../uiStore';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('UI Store', () => {
  beforeEach(() => {
    // Clear the store before each test
    localStorage.clear();
    jest.clearAllMocks();
    
    // Reset the store to its initial state
    const { getState, setState } = useUIStore;
    setState({
      view: 'equipment',
      isSidebarOpen: true,
      darkMode: false,
    });
  });

  describe('Initial State', () => {
    it('should have the correct initial state', () => {
      const state = useUIStore.getState();
      
      expect(state.view).toBe('equipment');
      expect(state.isSidebarOpen).toBe(true);
      expect(state.darkMode).toBe(false);
    });
  });

  describe('Actions', () => {
    it('should update view with setView action', () => {
      const { setView } = useUIStore.getState();
      
      setView('inspections');
      
      const newState = useUIStore.getState();
      expect(newState.view).toBe('inspections');
    });

    it('should toggle sidebar with toggleSidebar action', () => {
      const { toggleSidebar } = useUIStore.getState();
      
      // Initial state is true
      expect(useUIStore.getState().isSidebarOpen).toBe(true);
      
      // Toggle to false
      toggleSidebar();
      expect(useUIStore.getState().isSidebarOpen).toBe(false);
      
      // Toggle back to true
      toggleSidebar();
      expect(useUIStore.getState().isSidebarOpen).toBe(true);
    });

    it('should toggle dark mode with toggleDarkMode action', () => {
      const { toggleDarkMode } = useUIStore.getState();
      
      // Initial state is false
      expect(useUIStore.getState().darkMode).toBe(false);
      
      // Toggle to true
      toggleDarkMode();
      expect(useUIStore.getState().darkMode).toBe(true);
      
      // Toggle back to false
      toggleDarkMode();
      expect(useUIStore.getState().darkMode).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should handle state changes correctly', () => {
      // Test that the store can handle state changes
      const currentState = useUIStore.getState();
      
      // Verify initial state structure
      expect(currentState).toHaveProperty('view');
      expect(currentState).toHaveProperty('isSidebarOpen');
      expect(currentState).toHaveProperty('darkMode');
      
      // Test state changes
      const { setView } = currentState;
      setView('reports');
      
      const updatedState = useUIStore.getState();
      expect(updatedState.view).toBe('reports');
    });

    it('should maintain state consistency', () => {
      const { setView, toggleSidebar, toggleDarkMode } = useUIStore.getState();
      
      // Make multiple state changes
      setView('inspections');
      toggleSidebar();
      toggleDarkMode();
      
      // Verify all changes are reflected
      const finalState = useUIStore.getState();
      expect(finalState.view).toBe('inspections');
      expect(typeof finalState.isSidebarOpen).toBe('boolean');
      expect(typeof finalState.darkMode).toBe('boolean');
    });
  });
});