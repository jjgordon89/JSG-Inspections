// Store barrel export - provides centralized access to all Zustand stores
// This resolves import issues where components try to import from './store' or '../store'

export { default as useUIStore } from './uiStore';
export { default as useEquipmentStore } from './equipmentStore';
export { default as useInspectionStore } from './inspectionStore';
