const { contextBridge, ipcRenderer } = require('electron');

/**
 * Normalizes error objects to a consistent shape for the renderer process
 * @param {Error|string|any} error - The error to normalize
 * @param {string} operation - The operation that failed
 * @returns {Object} Normalized error object
 */
function normalizeError(error, operation) {
  const timestamp = new Date().toISOString();
  
  if (error instanceof Error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        operation,
        timestamp,
        stack: error.stack
      }
    };
  }
  
  if (typeof error === 'string') {
    return {
      success: false,
      error: {
        message: error,
        code: 'STRING_ERROR',
        operation,
        timestamp
      }
    };
  }
  
  return {
    success: false,
    error: {
      message: 'An unknown error occurred',
      code: 'UNKNOWN_ERROR',
      operation,
      timestamp,
      originalError: error
    }
  };
}

/**
 * Logs errors to console with consistent formatting
 * @param {Object} errorObj - Normalized error object
 */
function logError(errorObj) {
  console.error(`[${errorObj.error.timestamp}] ${errorObj.error.operation} failed:`, {
    message: errorObj.error.message,
    code: errorObj.error.code,
    stack: errorObj.error.stack
  });
}

/**
 * Wraps IPC calls with error handling and logging
 * @param {string} channel - IPC channel name
 * @param {string} operation - Human-readable operation name
 * @param {boolean} isRetryable - Whether this operation can be retried
 */
function createIPCWrapper(channel, operation, isRetryable = false) {
  return async (...args) => {
    try {
      const result = await ipcRenderer.invoke(channel, ...args);
      
      // If the main process returned an error object, handle it
      if (result && result.success === false) {
        const errorObj = normalizeError(result.error || result, operation);
        logError(errorObj);
        return errorObj;
      }
      
      return { success: true, data: result };
    } catch (error) {
      const errorObj = normalizeError(error, operation);
      logError(errorObj);
      
      // For retryable operations, add retry metadata
      if (isRetryable) {
        errorObj.error.retryable = true;
        errorObj.error.retryAfter = 1000; // 1 second
      }
      
      return errorObj;
    }
  };
}

contextBridge.exposeInMainWorld('api', {
  // Secure database operations
  secureOperation: createIPCWrapper('secure-db-operation', 'Secure Database Operation', true),
  
  // File operations with path validation
  openFilePath: createIPCWrapper('open-file-path', 'Open File Path'),
  
  // Legacy database operations (deprecated)
  run: createIPCWrapper('db-run', 'Database Write Operation'),
  get: createIPCWrapper('db-get', 'Database Read Operation', true),
  all: createIPCWrapper('db-all', 'Database Query Operation', true),
  
  // Template operations with error handling
  getTemplates: createIPCWrapper('get-templates', 'Get Templates', true),
  saveTemplate: createIPCWrapper('save-template', 'Save Template'),
  deleteTemplate: createIPCWrapper('delete-template', 'Delete Template'),
  
  // Backup/restore operations with error handling
  backupDatabase: createIPCWrapper('backup-database', 'Database Backup'),
  restoreDatabase: createIPCWrapper('restore-database', 'Database Restore'),
  
  // Utility functions for error handling
  isError: (result) => result && result.success === false,
  getErrorMessage: (result) => result?.error?.message || 'Unknown error occurred',
  isRetryable: (result) => result?.error?.retryable === true,
  getRetryDelay: (result) => result?.error?.retryAfter || 1000,
  
  // Secure operation helpers
  equipment: {
    getAll: () => window.api.secureOperation('equipment', 'getAll', {}),
    getById: (id) => window.api.secureOperation('equipment', 'getById', { id }),
    getByEquipmentId: (equipmentId) => window.api.secureOperation('equipment', 'getByEquipmentId', { equipmentId }),
    create: (params) => window.api.secureOperation('equipment', 'create', params),
    update: (params) => window.api.secureOperation('equipment', 'update', params),
    delete: (id) => window.api.secureOperation('equipment', 'delete', { id }),
    getDistinctTypes: () => window.api.secureOperation('equipment', 'getDistinctTypes', {}),
    getStatusCounts: () => window.api.secureOperation('equipment', 'getStatusCounts', {}),
    getCount: () => window.api.secureOperation('equipment', 'getCount', {})
  },
  
  inspections: {
    getAll: () => window.api.secureOperation('inspections', 'getAll', {}),
    getByEquipmentId: (equipmentId) => window.api.secureOperation('inspections', 'getByEquipmentId', { equipmentId }),
    create: (params) => window.api.secureOperation('inspections', 'create', params),
    getCount: () => window.api.secureOperation('inspections', 'getCount', {}),
    getPerMonth: () => window.api.secureOperation('inspections', 'getPerMonth', {}),
    getLastInspectionByEquipment: () => window.api.secureOperation('inspections', 'getLastInspectionByEquipment', {}),
    getRecentFailures: () => window.api.secureOperation('inspections', 'getRecentFailures', {})
  },
  
  documents: {
    getByEquipmentId: (equipmentId) => window.api.secureOperation('documents', 'getByEquipmentId', { equipmentId }),
    create: (params) => window.api.secureOperation('documents', 'create', params),
    checkExisting: (equipmentId, fileName) => window.api.secureOperation('documents', 'checkExisting', { equipmentId, fileName })
  },
  
  scheduledInspections: {
    getAll: () => window.api.secureOperation('scheduledInspections', 'getAll', {}),
    getUpcoming: (fromDate) => window.api.secureOperation('scheduledInspections', 'getUpcoming', { fromDate }),
    getTodayAndLater: (today) => window.api.secureOperation('scheduledInspections', 'getTodayAndLater', { today }),
    create: (params) => window.api.secureOperation('scheduledInspections', 'create', params),
    update: (params) => window.api.secureOperation('scheduledInspections', 'update', params),
    delete: (id) => window.api.secureOperation('scheduledInspections', 'delete', { id })
  },
  
  compliance: {
    getAllStandards: () => window.api.secureOperation('compliance', 'getAllStandards', {}),
    createStandard: (params) => window.api.secureOperation('compliance', 'createStandard', params),
    deleteStandard: (id) => window.api.secureOperation('compliance', 'deleteStandard', { id }),
    getAssignedStandards: (equipmentType) => window.api.secureOperation('compliance', 'getAssignedStandards', { equipmentType }),
    assignStandard: (equipmentType, standardId) => window.api.secureOperation('compliance', 'assignStandard', { equipmentType, standardId }),
    unassignStandard: (equipmentType, standardId) => window.api.secureOperation('compliance', 'unassignStandard', { equipmentType, standardId }),
    getComplianceReport: () => window.api.secureOperation('compliance', 'getComplianceReport', {})
  },
  
  templates: {
    getAll: () => window.api.secureOperation('templates', 'getAll', {}),
    save: (name, fields) => window.api.secureOperation('templates', 'save', { name, fields }),
    delete: (id) => window.api.secureOperation('templates', 'delete', { id })
  }
});
