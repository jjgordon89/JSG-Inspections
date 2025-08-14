const { contextBridge, ipcRenderer } = require('electron');
const isDev = require('electron-is-dev');

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
        
        // For retryable operations, add retry metadata
        if (isRetryable) {
          errorObj.error.retryable = true;
          errorObj.error.retryAfter = 1000; // 1 second
        }
        
        // Throw the error instead of returning it
        const error = new Error(errorObj.error.message);
        error.code = errorObj.error.code;
        error.operation = errorObj.error.operation;
        error.timestamp = errorObj.error.timestamp;
        if (isRetryable) {
          error.retryable = true;
          error.retryAfter = 1000;
        }
        throw error;
      }
      
      // Return data directly (not wrapped in success object)
      return result;
    } catch (error) {
      const errorObj = normalizeError(error, operation);
      logError(errorObj);
      
      // For retryable operations, add retry metadata
      if (isRetryable) {
        errorObj.error.retryable = true;
        errorObj.error.retryAfter = 1000; // 1 second
      }
      
      // Throw the error instead of returning it
      const newError = new Error(errorObj.error.message);
      newError.code = errorObj.error.code;
      newError.operation = errorObj.error.operation;
      newError.timestamp = errorObj.error.timestamp;
      if (isRetryable) {
        newError.retryable = true;
        newError.retryAfter = 1000;
      }
      throw newError;
    }
  };
}

// Build the API object conditionally
const apiObject = {
  // Secure database operations
  secureOperation: createIPCWrapper('secure-db-operation', 'Secure Database Operation', true),
  
  // File operations with path validation
  openFilePath: createIPCWrapper('open-file-path', 'Open File Path'),
  importDocument: createIPCWrapper('import-document', 'Import Document'),
  
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
    getRecentFailures: () => window.api.secureOperation('inspections', 'getRecentFailures', {}),
    getOverdue: () => window.api.secureOperation('inspections', 'getOverdue', {})
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
    updateStatus: (id, status) => window.api.secureOperation('scheduledInspections', 'updateStatus', { id, status }),
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
  },
  
  // Phase 2 - Inspection Items operations
  inspectionItems: {
    getByInspectionId: (inspectionId) => window.api.secureOperation('inspectionItems', 'getByInspectionId', { inspectionId }),
    create: (params) => window.api.secureOperation('inspectionItems', 'create', params),
    update: (params) => window.api.secureOperation('inspectionItems', 'update', params),
    delete: (id) => window.api.secureOperation('inspectionItems', 'delete', { id }),
    getCriticalFailures: () => window.api.secureOperation('inspectionItems', 'getCriticalFailures', {})
  },
  
  // Phase 2 - Deficiencies operations
  deficiencies: {
    getAll: () => window.api.secureOperation('deficiencies', 'getAll', {}),
    getByEquipmentId: (equipmentId) => window.api.secureOperation('deficiencies', 'getByEquipmentId', { equipmentId }),
    getByStatus: (status) => window.api.secureOperation('deficiencies', 'getByStatus', { status }),
    create: (params) => window.api.secureOperation('deficiencies', 'create', params),
    update: (params) => window.api.secureOperation('deficiencies', 'update', params),
    close: (id, verificationSignature) => window.api.secureOperation('deficiencies', 'close', { id, verificationSignature }),
    getOpenCritical: () => window.api.secureOperation('deficiencies', 'getOpenCritical', {}),
    getOverdue: () => window.api.secureOperation('deficiencies', 'getOverdue', {}),
    createFromInspectionItem: (params) => window.api.secureOperation('deficiencies', 'createFromInspectionItem', params),
    linkToWorkOrder: (id, workOrderId) => window.api.secureOperation('deficiencies', 'linkToWorkOrder', { id, workOrderId })
  },
  
  // Phase 2 - Signatures operations
  signatures: {
    getByEntity: (entityType, entityId) => window.api.secureOperation('signatures', 'getByEntity', { entityType, entityId }),
    create: (params) => window.api.secureOperation('signatures', 'create', params),
    delete: (id) => window.api.secureOperation('signatures', 'delete', { id })
  },

  // P2 - Work Orders operations
  workOrders: {
    getAll: () => window.api.secureOperation('workOrders', 'getAll', {}),
    getByStatus: (status) => window.api.secureOperation('workOrders', 'getByStatus', { status }),
    getByEquipmentId: (equipmentId) => window.api.secureOperation('workOrders', 'getByEquipmentId', { equipmentId }),
    create: (params) => window.api.secureOperation('workOrders', 'create', params),
    update: (params) => window.api.secureOperation('workOrders', 'update', params),
    updateStatus: (params) => window.api.secureOperation('workOrders', 'updateStatus', params),
    complete: (params) => window.api.secureOperation('workOrders', 'complete', params),
    getDueToday: () => window.api.secureOperation('workOrders', 'getDueToday', {}),
    getOverdue: () => window.api.secureOperation('workOrders', 'getOverdue', {})
  },

  // P2 - PM Templates operations
  pmTemplates: {
    getAll: () => window.api.secureOperation('pmTemplates', 'getAll', {}),
    getByEquipmentType: (equipmentType) => window.api.secureOperation('pmTemplates', 'getByEquipmentType', { equipmentType }),
    create: (params) => window.api.secureOperation('pmTemplates', 'create', params),
    update: (params) => window.api.secureOperation('pmTemplates', 'update', params),
    deactivate: (id) => window.api.secureOperation('pmTemplates', 'deactivate', { id })
  },

  // P2 - PM Schedules operations
  pmSchedules: {
    getByEquipmentId: (equipmentId) => window.api.secureOperation('pmSchedules', 'getByEquipmentId', { equipmentId }),
    getDue: (dueDate) => window.api.secureOperation('pmSchedules', 'getDue', { dueDate }),
    create: (params) => window.api.secureOperation('pmSchedules', 'create', params),
    updateDue: (params) => window.api.secureOperation('pmSchedules', 'updateDue', params),
    getTotal: () => window.api.secureOperation('pmSchedules', 'getTotal', {}),
    getOverdue: () => window.api.secureOperation('pmSchedules', 'getOverdue', {})
  },

  // P2 - Load Tests operations
  loadTests: {
    getByEquipmentId: (equipmentId) => window.api.secureOperation('loadTests', 'getByEquipmentId', { equipmentId }),
    getDue: (dueDate) => window.api.secureOperation('loadTests', 'getDue', { dueDate }),
    create: (params) => window.api.secureOperation('loadTests', 'create', params),
    getLastByEquipment: () => window.api.secureOperation('loadTests', 'getLastByEquipment', {}),
    getTotal: () => window.api.secureOperation('loadTests', 'getTotal', {}),
    getOverdue: () => window.api.secureOperation('loadTests', 'getOverdue', {})
  },

  // P2 - Calibrations operations
  calibrations: {
    getByEquipmentId: (equipmentId) => window.api.secureOperation('calibrations', 'getByEquipmentId', { equipmentId }),
    getDue: (dueDate) => window.api.secureOperation('calibrations', 'getDue', { dueDate }),
    create: (params) => window.api.secureOperation('calibrations', 'create', params),
    getTotal: () => window.api.secureOperation('calibrations', 'getTotal', {}),
    getOverdue: () => window.api.secureOperation('calibrations', 'getOverdue', {})
  },

  // P2 - Credentials operations
  credentials: {
    getAll: () => window.api.secureOperation('credentials', 'getAll', {}),
    getByPerson: (personName) => window.api.secureOperation('credentials', 'getByPerson', { personName }),
    getExpiring: (expirationDate) => window.api.secureOperation('credentials', 'getExpiring', { expirationDate }),
    create: (params) => window.api.secureOperation('credentials', 'create', params),
    updateStatus: (id, status) => window.api.secureOperation('credentials', 'updateStatus', { id, status }),
    getTotal: () => window.api.secureOperation('credentials', 'getTotal', {})
  },

  // P2 - Users operations
  users: {
    getAll: () => window.api.secureOperation('users', 'getAll', {}),
    getByUsername: (username) => window.api.secureOperation('users', 'getByUsername', { username }),
    create: (params) => window.api.secureOperation('users', 'create', params),
    updateLastLogin: (id) => window.api.secureOperation('users', 'updateLastLogin', { id })
  },

  // P2 - Audit Log operations
  auditLog: {
    create: (params) => window.api.secureOperation('auditLog', 'create', params),
    getByEntity: (entityType, entityId) => window.api.secureOperation('auditLog', 'getByEntity', { entityType, entityId }),
    getRecent: (limit) => window.api.secureOperation('auditLog', 'getRecent', { limit })
  },

  // P2 - Certificates operations
  certificates: {
    getByEquipmentId: (equipmentId) => window.api.secureOperation('certificates', 'getByEquipmentId', { equipmentId }),
    getByCertificateNumber: (certificateNumber) => window.api.secureOperation('certificates', 'getByCertificateNumber', { certificateNumber }),
    getExpiring: (expirationDate) => window.api.secureOperation('certificates', 'getExpiring', { expirationDate }),
    create: (params) => window.api.secureOperation('certificates', 'create', params),
    updateStatus: (id, status) => window.api.secureOperation('certificates', 'updateStatus', { id, status }),
    getTotal: () => window.api.secureOperation('certificates', 'getTotal', {})
  },

  // P2 - Meter Readings operations
  meterReadings: {
    getByEquipmentId: (equipmentId) => window.api.secureOperation('meterReadings', 'getByEquipmentId', { equipmentId }),
    getLatestByEquipment: () => window.api.secureOperation('meterReadings', 'getLatestByEquipment', {}),
    create: (params) => window.api.secureOperation('meterReadings', 'create', params)
  },

  // P2 - Template Items operations
  templateItems: {
    getByTemplateId: (templateId) => window.api.secureOperation('templateItems', 'getByTemplateId', { templateId }),
    create: (params) => window.api.secureOperation('templateItems', 'create', params),
    update: (params) => window.api.secureOperation('templateItems', 'update', params),
    delete: (id) => window.api.secureOperation('templateItems', 'delete', { id })
  }
};

// Legacy operations have been removed for security
// All database operations now use secure operations through window.api.secureOperation

contextBridge.exposeInMainWorld('api', apiObject);
