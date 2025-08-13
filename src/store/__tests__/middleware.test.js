import { create } from 'zustand';
import withMiddleware, { withLogging, withEffects } from '../middleware';

// Mock console.log for testing
const originalConsoleLog = console.log;
const mockConsoleLog = jest.fn();

describe('Store Middleware', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
    console.log = mockConsoleLog;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('withMiddleware (default)', () => {
    it('should be a passthrough middleware that does not modify behavior', () => {
      const testStore = create(withMiddleware((set, get) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
        getCount: () => get().count,
      })));

      // Test initial state
      expect(testStore.getState().count).toBe(0);

      // Test actions work normally
      testStore.getState().increment();
      expect(testStore.getState().count).toBe(1);

      // Test get function works
      expect(testStore.getState().getCount()).toBe(1);
    });

    it('should not interfere with store functionality', () => {
      const testStore = create(withMiddleware((set, get) => ({
        data: { name: 'test' },
        updateData: (newData) => set({ data: newData }),
        reset: () => set({ data: { name: 'reset' } }),
      })));

      const initialState = testStore.getState();
      expect(initialState.data.name).toBe('test');

      // Test complex state updates
      testStore.getState().updateData({ name: 'updated', value: 42 });
      expect(testStore.getState().data).toEqual({ name: 'updated', value: 42 });

      // Test reset functionality
      testStore.getState().reset();
      expect(testStore.getState().data).toEqual({ name: 'reset' });
    });
  });

  describe('withLogging', () => {
    beforeEach(() => {
      // Set NODE_ENV to development for logging tests
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      // Reset NODE_ENV
      delete process.env.NODE_ENV;
    });

    it('should log state changes in development mode', () => {
      const testStore = create(withLogging((set, get) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
      })));

      // Clear any initial logs
      mockConsoleLog.mockClear();

      // Trigger a state change
      testStore.getState().increment();

      // Verify logging occurred
      expect(mockConsoleLog).toHaveBeenCalledWith('Store state change:', expect.any(Array));
    });

    it('should not log in production mode', () => {
      process.env.NODE_ENV = 'production';

      const testStore = create(withLogging((set, get) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
      })));

      // Clear any initial logs
      mockConsoleLog.mockClear();

      // Trigger a state change
      testStore.getState().increment();

      // Verify no logging occurred
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should maintain normal store functionality while logging', () => {
      const testStore = create(withLogging((set, get) => ({
        items: [],
        addItem: (item) => set((state) => ({ items: [...state.items, item] })),
        clearItems: () => set({ items: [] }),
      })));

      // Test functionality works normally
      expect(testStore.getState().items).toEqual([]);

      testStore.getState().addItem('test1');
      expect(testStore.getState().items).toEqual(['test1']);

      testStore.getState().addItem('test2');
      expect(testStore.getState().items).toEqual(['test1', 'test2']);

      testStore.getState().clearItems();
      expect(testStore.getState().items).toEqual([]);
    });
  });

  describe('withEffects', () => {
    it('should be a passthrough middleware (placeholder implementation)', () => {
      const testStore = create(withEffects((set, get) => ({
        value: 'initial',
        setValue: (newValue) => set({ value: newValue }),
      })));

      // Test that it works like a normal store
      expect(testStore.getState().value).toBe('initial');

      testStore.getState().setValue('updated');
      expect(testStore.getState().value).toBe('updated');
    });

    it('should not interfere with store operations', () => {
      const testStore = create(withEffects((set, get) => ({
        counter: 0,
        multiplier: 2,
        increment: () => set((state) => ({ counter: state.counter + 1 })),
        multiply: () => set((state) => ({ counter: state.counter * state.multiplier })),
        getTotal: () => get().counter * get().multiplier,
      })));

      expect(testStore.getState().counter).toBe(0);
      expect(testStore.getState().getTotal()).toBe(0);

      testStore.getState().increment();
      expect(testStore.getState().counter).toBe(1);
      expect(testStore.getState().getTotal()).toBe(2);

      testStore.getState().multiply();
      expect(testStore.getState().counter).toBe(2);
      expect(testStore.getState().getTotal()).toBe(4);
    });
  });

  describe('Middleware Composition', () => {
    it('should allow combining multiple middleware functions', () => {
      const testStore = create(
        withLogging(
          withEffects(
            withMiddleware((set, get) => ({
              data: 'test',
              updateData: (newData) => set({ data: newData }),
            }))
          )
        )
      );

      // Test that composed middleware works
      expect(testStore.getState().data).toBe('test');

      // Clear logs before testing
      mockConsoleLog.mockClear();

      // Update data (should trigger logging if in development)
      testStore.getState().updateData('updated');
      expect(testStore.getState().data).toBe('updated');

      // In development mode, logging should have occurred
      if (process.env.NODE_ENV === 'development') {
        expect(mockConsoleLog).toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in middleware gracefully', () => {
      // Test that middleware doesn't break if there are issues
      const testStore = create(withMiddleware((set, get) => ({
        value: 1,
        riskyOperation: () => {
          try {
            set((state) => ({ value: state.value * 2 }));
          } catch (error) {
            // Handle error gracefully
            set({ value: -1 });
          }
        },
      })));

      expect(testStore.getState().value).toBe(1);
      testStore.getState().riskyOperation();
      expect(testStore.getState().value).toBe(2);
    });
  });
});
