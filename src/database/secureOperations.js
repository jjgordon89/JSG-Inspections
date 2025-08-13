/**
 * Secure Database Operations
 * 
 * This module provides named, parameterized database operations to replace
 * generic SQL access. All operations are pre-defined with proper validation
 * and parameter binding to prevent SQL injection attacks.
 */

const path = require('path');
const fs = require('fs').promises;

/**
 * Validates file paths to ensure they are within allowed directories
 * @param {string} filePath - The file path to validate
 * @returns {boolean} - True if path is valid and safe
 */
function validateFilePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }
  
  // Check for directory traversal attempts before normalization
  if (filePath.includes('..') || filePath.includes('~')) {
    return false;
  }
  
  // Normalize the path to resolve any remaining path issues
  const normalizedPath = path.normalize(filePath);
  
  // Double-check after normalization for any remaining traversal attempts
  if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
    return false;
  }
  
  // Ensure path is absolute (for security)
  if (!path.isAbsolute(normalizedPath)) {
    return false;
  }
  
  // Additional security check: ensure the normalized path doesn't escape
  // Check if the path tries to access system directories
  const systemPaths = [
    '/etc/', '/bin/', '/sbin/', '/usr/bin/', '/usr/sbin/',
    'C:\\Windows\\', 'C:\\System32\\', 'C:\\Program Files\\'
  ];
  
  const lowerPath = normalizedPath.toLowerCase();
  for (const systemPath of systemPaths) {
    if (lowerPath.startsWith(systemPath.toLowerCase())) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validates equipment ID format
 * @param {string} equipmentId - Equipment ID to validate
 * @returns {boolean} - True if valid
 */
function validateEquipmentId(equipmentId) {
  return equipmentId && typeof equipmentId === 'string' && equipmentId.length > 0;
}

/**
 * Validates inspector name
 * @param {string} inspector - Inspector name to validate
 * @returns {boolean} - True if valid
 */
function validateInspector(inspector) {
  return inspector && typeof inspector === 'string' && inspector.length > 0;
}

/**
 * Validates date format (YYYY-MM-DD)
 * @param {string} date - Date to validate
 * @returns {boolean} - True if valid
 */
function validateDate(date) {
  if (!date || typeof date !== 'string') return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(date) && !isNaN(Date.parse(date));
}

/**
 * Secure database operations with named, parameterized queries
 */
const secureOperations = {
  // Equipment operations
  equipment: {
    getAll: {
      sql: 'SELECT * FROM equipment ORDER BY equipment_id',
      params: [],
      validate: () => true
    },
    
    getById: {
      sql: 'SELECT * FROM equipment WHERE id = ?',
      params: ['id'],
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    },
    
    getByEquipmentId: {
      sql: 'SELECT * FROM equipment WHERE equipment_id = ?',
      params: ['equipmentId'],
      validate: (params) => validateEquipmentId(params.equipmentId)
    },
    
    create: {
      sql: `INSERT INTO equipment (equipment_id, type, manufacturer, model, serial_number, 
             capacity, installation_date, location, status, qr_code_data) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: ['equipmentId', 'type', 'manufacturer', 'model', 'serialNumber', 
               'capacity', 'installationDate', 'location', 'status', 'qrCodeData'],
      validate: (params) => validateEquipmentId(params.equipmentId) && 
                           params.type && params.manufacturer
    },
    
    update: {
      sql: `UPDATE equipment SET manufacturer = ?, model = ?, serial_number = ?, 
             capacity = ?, installation_date = ?, location = ?, status = ? WHERE id = ?`,
      params: ['manufacturer', 'model', 'serialNumber', 'capacity', 
               'installationDate', 'location', 'status', 'id'],
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    },
    
    delete: {
      sql: 'DELETE FROM equipment WHERE id = ?',
      params: ['id'],
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    },
    
    getDistinctTypes: {
      sql: 'SELECT DISTINCT type FROM equipment WHERE type IS NOT NULL ORDER BY type',
      params: [],
      validate: () => true
    },
    
    getStatusCounts: {
      sql: 'SELECT status, COUNT(*) as count FROM equipment GROUP BY status',
      params: [],
      validate: () => true
    },
    
    getCount: {
      sql: 'SELECT COUNT(*) as count FROM equipment',
      params: [],
      validate: () => true
    }
  },

  // Inspection operations
  inspections: {
    getAll: {
      sql: 'SELECT * FROM inspections ORDER BY inspection_date DESC',
      params: [],
      validate: () => true
    },
    
    getByEquipmentId: {
      sql: 'SELECT * FROM inspections WHERE equipment_id = ? ORDER BY inspection_date DESC',
      params: ['equipmentId'],
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0
    },
    
    create: {
      sql: `INSERT INTO inspections (equipment_id, inspector, inspection_date, findings, 
             corrective_actions, summary_comments, signature) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: ['equipmentId', 'inspector', 'inspectionDate', 'findings', 
               'correctiveActions', 'summaryComments', 'signature'],
      validate: (params) => Number.isInteger(params.equipmentId) && 
                           params.equipmentId > 0 && 
                           validateInspector(params.inspector) &&
                           validateDate(params.inspectionDate)
    },
    
    getCount: {
      sql: 'SELECT COUNT(*) as count FROM inspections',
      params: [],
      validate: () => true
    },
    
    getPerMonth: {
      sql: `SELECT strftime('%Y-%m', inspection_date) as month, COUNT(*) as count 
            FROM inspections 
            WHERE inspection_date IS NOT NULL 
            GROUP BY strftime('%Y-%m', inspection_date) 
            ORDER BY month DESC`,
      params: [],
      validate: () => true
    },
    
    getLastInspectionByEquipment: {
      sql: `SELECT equipment_id, MAX(inspection_date) as last_inspection_date 
            FROM inspections 
            GROUP BY equipment_id`,
      params: [],
      validate: () => true
    },
    
    getRecentFailures: {
      sql: `SELECT e.equipment_id, i.inspection_date 
            FROM inspections i 
            JOIN equipment e ON i.equipment_id = e.id 
            WHERE i.findings LIKE '%fail%' OR i.findings LIKE '%defect%' 
            ORDER BY i.inspection_date DESC 
            LIMIT 10`,
      params: [],
      validate: () => true
    }
  },

  // Document operations
  documents: {
    getByEquipmentId: {
      sql: 'SELECT * FROM documents WHERE equipment_id = ? ORDER BY file_name',
      params: ['equipmentId'],
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0
    },
    
    create: {
      sql: 'INSERT INTO documents (equipment_id, file_name, file_path) VALUES (?, ?, ?)',
      params: ['equipmentId', 'fileName', 'filePath'],
      validate: (params) => Number.isInteger(params.equipmentId) && 
                           params.equipmentId > 0 && 
                           params.fileName && 
                           validateFilePath(params.filePath)
    },
    
    checkExisting: {
      sql: 'SELECT id FROM documents WHERE equipment_id = ? AND file_name = ?',
      params: ['equipmentId', 'fileName'],
      validate: (params) => Number.isInteger(params.equipmentId) && 
                           params.equipmentId > 0 && 
                           params.fileName
    }
  },

  // Scheduled inspection operations
  scheduledInspections: {
    getAll: {
      sql: `SELECT si.*, e.equipment_id as equipmentIdentifier 
            FROM scheduled_inspections si 
            JOIN equipment e ON si.equipment_id = e.id 
            ORDER BY si.scheduled_date`,
      params: [],
      validate: () => true
    },
    
    getUpcoming: {
      sql: `SELECT e.equipment_id, s.scheduled_date 
            FROM scheduled_inspections s 
            JOIN equipment e ON s.equipment_id = e.id 
            WHERE s.scheduled_date >= ? AND s.status != 'completed' 
            ORDER BY s.scheduled_date 
            LIMIT 10`,
      params: ['fromDate'],
      validate: (params) => validateDate(params.fromDate)
    },
    
    getTodayAndLater: {
      sql: 'SELECT * FROM scheduled_inspections WHERE scheduled_date >= ?',
      params: ['today'],
      validate: (params) => validateDate(params.today)
    },
    
    create: {
      sql: `INSERT INTO scheduled_inspections (equipment_id, scheduled_date, assigned_inspector, status) 
            VALUES (?, ?, ?, ?)`,
      params: ['equipmentId', 'scheduledDate', 'assignedInspector', 'status'],
      validate: (params) => Number.isInteger(params.equipmentId) && 
                           params.equipmentId > 0 && 
                           validateDate(params.scheduledDate) &&
                           validateInspector(params.assignedInspector)
    },
    
    update: {
      sql: `UPDATE scheduled_inspections SET equipment_id = ?, scheduled_date = ?, assigned_inspector = ? 
            WHERE id = ?`,
      params: ['equipmentId', 'scheduledDate', 'assignedInspector', 'id'],
      validate: (params) => Number.isInteger(params.equipmentId) && 
                           params.equipmentId > 0 && 
                           validateDate(params.scheduledDate) &&
                           validateInspector(params.assignedInspector) &&
                           Number.isInteger(params.id) && params.id > 0
    },
    
    delete: {
      sql: 'DELETE FROM scheduled_inspections WHERE id = ?',
      params: ['id'],
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    }
  },

  // Compliance operations
  compliance: {
    getAllStandards: {
      sql: 'SELECT * FROM compliance_standards ORDER BY name',
      params: [],
      validate: () => true
    },
    
    createStandard: {
      sql: 'INSERT INTO compliance_standards (name, description, authority) VALUES (?, ?, ?)',
      params: ['name', 'description', 'authority'],
      validate: (params) => params.name && params.description && params.authority
    },
    
    deleteStandard: {
      sql: 'DELETE FROM compliance_standards WHERE id = ?',
      params: ['id'],
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    },
    
    getAssignedStandards: {
      sql: `SELECT cs.id, cs.name FROM compliance_standards cs
            JOIN equipment_type_compliance etc ON cs.id = etc.standard_id
            WHERE etc.equipment_type = ?`,
      params: ['equipmentType'],
      validate: (params) => params.equipmentType && typeof params.equipmentType === 'string'
    },
    
    assignStandard: {
      sql: 'INSERT OR IGNORE INTO equipment_type_compliance (equipment_type, standard_id) VALUES (?, ?)',
      params: ['equipmentType', 'standardId'],
      validate: (params) => params.equipmentType && 
                           Number.isInteger(params.standardId) && params.standardId > 0
    },
    
    unassignStandard: {
      sql: 'DELETE FROM equipment_type_compliance WHERE equipment_type = ? AND standard_id = ?',
      params: ['equipmentType', 'standardId'],
      validate: (params) => params.equipmentType && 
                           Number.isInteger(params.standardId) && params.standardId > 0
    },
    
    getComplianceReport: {
      sql: `SELECT etc.equipment_type, cs.name as standard_name, cs.id as standard_id
            FROM equipment_type_compliance etc
            JOIN compliance_standards cs ON etc.standard_id = cs.id
            ORDER BY etc.equipment_type, cs.name`,
      params: [],
      validate: () => true
    }
  },

  // Template operations
  templates: {
    getAll: {
      sql: 'SELECT id, name, fields FROM inspection_templates ORDER BY name',
      params: [],
      validate: () => true
    },
    
    save: {
      sql: `INSERT INTO inspection_templates (name, fields) VALUES (?, ?)
            ON CONFLICT(name) DO UPDATE SET fields=excluded.fields`,
      params: ['name', 'fields'],
      validate: (params) => params.name && params.fields
    },
    
    delete: {
      sql: 'DELETE FROM inspection_templates WHERE id = ?',
      params: ['id'],
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    }
  }
};

module.exports = {
  secureOperations,
  validateFilePath,
  validateEquipmentId,
  validateInspector,
  validateDate
};
