# Domain-Specific Store Implementation Summary

## Overview

This document summarizes the changes made to implement domain-specific Zustand stores in our Electron and React application for managing overhead lifting equipment. The application has been refactored from a monolithic store architecture to a domain-driven design with specialized stores for different concerns.

## Store Structure Changes

### Previous Architecture

Previously, the application used a single monolithic store (`store.js`) that contained all state and actions:

```javascript
const useStore = create((set) => ({
  // Combined state for UI, equipment, and inspections
  refresh: false,
  editingEquipment: null,
  viewingInspectionsFor: null,
  addingInspectionFor: null,
  view: 'equipment',
  isSidebarOpen: true,
  darkMode: false,
  inspectingEquipment: null,

  // Combined actions for all domains
  toggleRefresh: () => set((state) => ({ refresh: !state.refresh })),
  setEditingEquipment: (equipment) => set({ editingEquipment: equipment }),
  setViewingInspectionsFor: (equipmentId) => set({ viewingInspectionsFor: equipmentId }),
  setAddingInspectionFor: (equipmentId) => set({ addingInspectionFor: equipmentId }),
  setInspectingEquipment: (equipment) => set({ inspectingEquipment: equipment }),
  setView: (view) => set({ view }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
}));
```

### New Architecture

The application now uses three domain-specific stores:

1. **UI Store (`uiStore.js`)**: Manages UI-related state
   ```javascript
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
   ```

2. **Equipment Store (`equipmentStore.js`)**: Manages equipment-related state
   ```javascript
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
   ```

3. **Inspection Store (`inspectionStore.js`)**: Manages inspection-related state
   ```javascript
   const useInspectionStore = create((set) => ({
     // State
     viewingInspectionsFor: null,
     addingInspectionFor: null,

     // Actions
     setViewingInspectionsFor: (equipmentId) => set({ viewingInspectionsFor: equipmentId }),
     setAddingInspectionFor: (equipmentId) => set({ addingInspectionFor: equipmentId }),
   }));
   ```

## Cross-Store Communication

A middleware system (`middleware.js`) has been implemented to handle communication between stores:

```javascript
const initializeMiddleware = () => {
  // Keep track of previous states to detect changes
  let prevUIState = useUIStore.getState();
  let prevEquipmentState = useEquipmentStore.getState();
  let prevInspectionState = useInspectionStore.getState();

  // Subscribe to UI store changes
  useUIStore.subscribe((state) => {
    // When view changes, reset certain states in other stores
    if (state.view !== prevUIState.view) {
      // If view is not equipment-related, reset equipment editing state
      if (state.view !== 'equipment' && state.view !== 'inspection') {
        useEquipmentStore.getState().setEditingEquipment(null);
        useEquipmentStore.getState().setInspectingEquipment(null);
        useInspectionStore.getState().setViewingInspectionsFor(null);
        useInspectionStore.getState().setAddingInspectionFor(null);
      }
    }
    
    prevUIState = state;
  });

  // Similar subscriptions for Equipment and Inspection stores
  // ...
};
```

## Backward Compatibility

A legacy store (`index.js`) provides backward compatibility for components that haven't been updated yet:

```javascript
const useLegacyStore = create((set, get) => {
  // Subscribe to all stores to keep the legacy store in sync
  useUIStore.subscribe((uiState) => {
    // Update only UI-related state in the legacy store
    set({
      view: uiState.view,
      isSidebarOpen: uiState.isSidebarOpen,
      darkMode: uiState.darkMode,
    });
  });

  // Similar subscriptions for Equipment and Inspection stores
  // ...

  return {
    // Combined state from all stores
    ...useUIStore.getState(),
    ...useEquipmentStore.getState(),
    ...useInspectionStore.getState(),

    // Actions that delegate to the appropriate domain-specific store
    toggleRefresh: () => useEquipmentStore.getState().toggleRefresh(),
    setEditingEquipment: (equipment) => useEquipmentStore.getState().setEditingEquipment(equipment),
    // ...
  };
});
```

## Component Changes

### Updated Components

1. **Sidebar.js**
   - Now imports and uses `useUIStore` directly
   - Accesses UI-specific state (`view`) and actions (`setView`)

2. **EquipmentList.js**
   - Now imports and uses `useEquipmentStore` directly
   - Accesses equipment-specific state (`refresh`) and actions (`setEditingEquipment`, `setInspectingEquipment`)

3. **InspectionList.js**
   - Now imports and uses `useInspectionStore` directly
   - Accesses inspection-specific state (`viewingInspectionsFor`)

4. **InspectionForm.js**
   - Now imports and uses both `useEquipmentStore` and `useInspectionStore` directly
   - Accesses equipment state (`inspectingEquipment`) and inspection state (`addingInspectionFor`)

5. **App.js**
   - Now imports and uses all three stores directly
   - Destructures state and actions from each store separately
   - Maintains the same functionality but with clearer separation of concerns

### Presentational Components

**EquipmentCard.js** remains a presentational component that:
- Receives all data and callbacks as props
- Does not directly interact with any store
- Maintains a clean separation between state and UI

## Benefits of the New Store Structure

1. **Separation of Concerns**
   - Each store is responsible for a specific domain
   - State and actions are grouped logically by their purpose
   - Easier to understand which parts of the state belong to which domain

2. **Improved Maintainability**
   - Changes to one domain don't affect others
   - Smaller, focused stores are easier to understand and modify
   - New developers can quickly grasp the purpose of each store

3. **Reduced Re-renders**
   - Components only subscribe to the specific state they need
   - Changes to unrelated state don't trigger unnecessary re-renders
   - Better performance, especially in larger applications

4. **Enhanced Testability**
   - Domain-specific stores can be tested in isolation
   - Easier to mock dependencies for unit tests
   - Clearer boundaries make integration tests more focused

5. **Persistence Control**
   - UI store uses the persist middleware to save settings to localStorage
   - Other stores don't persist, avoiding unnecessary storage usage
   - Fine-grained control over what gets persisted

6. **Gradual Migration Path**
   - Legacy store provides backward compatibility
   - Components can be migrated one at a time
   - Reduces risk when refactoring large applications

## Architecture Overview

The new store architecture follows these principles:

1. **Domain-Driven Design**
   - Stores are organized around business domains (UI, Equipment, Inspections)
   - Each domain has its own state and actions
   - Clear boundaries between different parts of the application

2. **Unidirectional Data Flow**
   - State changes flow from stores to components
   - Components dispatch actions to update state
   - Predictable state management pattern

3. **Cross-Store Communication**
   - Middleware handles interactions between stores
   - Stores subscribe to each other's changes when necessary
   - Maintains separation while allowing coordination

4. **Backward Compatibility**
   - Legacy store combines all domain stores
   - Provides the same API as the original store
   - Allows gradual migration of components

## Recommendations for Future Improvements

1. **Complete Migration**
   - Migrate any remaining components to use domain-specific stores directly
   - Remove the legacy store once all components have been updated
   - Simplify the codebase by eliminating backward compatibility code

2. **Enhanced Middleware**
   - Consider using a more formalized event system for cross-store communication
   - Implement logging middleware for debugging state changes
   - Add validation middleware to ensure state integrity

3. **TypeScript Integration**
   - Add TypeScript type definitions for each store
   - Improve type safety and developer experience
   - Enable better IDE autocompletion and error checking

4. **Selector Optimization**
   - Implement memoized selectors for derived state
   - Reduce unnecessary re-renders with more granular subscriptions
   - Consider using libraries like `reselect` for complex selectors

5. **Testing Infrastructure**
   - Create comprehensive unit tests for each store
   - Add integration tests for cross-store interactions
   - Implement snapshot testing for store state changes

6. **Documentation**
   - Add JSDoc comments to all store functions
   - Create a store usage guide for new developers
   - Document cross-store communication patterns

7. **State Persistence Strategy**
   - Review what state should be persisted and where
   - Consider more advanced persistence options (IndexedDB, etc.)
   - Implement migration strategies for persisted state

8. **Performance Monitoring**
   - Add performance tracking for store operations
   - Monitor re-render counts in components
   - Optimize state updates based on performance data

## Conclusion

The migration to domain-specific stores has significantly improved the architecture of the application. The separation of concerns, improved maintainability, and performance benefits provide a solid foundation for future development. By following the recommendations outlined above, the application can continue to evolve with a clean, maintainable state management system.