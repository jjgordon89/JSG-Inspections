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

  describe('Persist Middleware', () => {
    it('should save state to localStorage', () => {
      const { setView, toggleDarkMode } = useUIStore.getState();
      
      // Make changes to the state
      setView('inspections');
      toggleDarkMode();
      
      // Check if localStorage.setItem was called with the correct parameters
      expect(localStorage.setItem).toHaveBeenCalled();
      
      // The key should be 'ui-storage' as defined in the store
      const calls = localStorage.setItem.mock.calls;
      const hasUiStorageCall = calls.some(call => call[0] === 'ui-storage');
      expect(hasUiStorageCall).toBe(true);
      
      // Verify the stored data contains our updated state
      const storedData = JSON.parse(localStorage.setItem.mock.calls[0][1]);
      expect(storedData.state).toBeDefined();
      expect(storedData.state.view).toBe('inspections');
      expect(storedData.state.darkMode).toBe(true);
    });

    it('should load state from localStorage on initialization', () => {
      // Set up localStorage with some state
      const mockState = {
        state: {
          view: 'reports',
          isSidebarOpen: false,
          darkMode: true,
        },
        version: 0,
      };
      
      localStorage.getItem.mockReturnValue(JSON.stringify(mockState));
      
      // Re-initialize the store to trigger loading from localStorage
      const resetStore = jest.requireActual('../uiStore').default;
      
      // Check if the store loaded the state from localStorage
      const loadedState = resetStore.getState();
      expect(loadedState.view).toBe('reports');
      expect(loadedState.isSidebarOpen).toBe(false);
      expect(loadedState.darkMode).toBe(true);
    });
  });
});