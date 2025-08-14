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
 * @param {string} userDataPath - Optional user data path for managed documents validation
 * @returns {boolean} - True if path is valid and safe
 */
function validateFilePath(filePath, userDataPath = null) {
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
  
  // If userDataPath is provided, check if file is within managed documents directory
  if (userDataPath) {
    const documentsDir = path.join(userDataPath, 'documents');
    const normalizedDocumentsDir = path.normalize(documentsDir);
    
    // Check if the file path is within the managed documents directory
    const relativePath = path.relative(normalizedDocumentsDir, normalizedPath);
    if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
      return true; // File is within managed documents directory
    }
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
      returnType: 'many',
      validate: () => true
    },
    
    getById: {
      sql: 'SELECT * FROM equipment WHERE id = ?',
      params: ['id'],
      returnType: 'one',
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    },
    
    getByEquipmentId: {
      sql: 'SELECT * FROM equipment WHERE equipment_id = ?',
      params: ['equipmentId'],
      returnType: 'one',
      validate: (params) => validateEquipmentId(params.equipmentId)
    },
    
    create: {
      sql: `INSERT INTO equipment (equipment_id, type, manufacturer, model, serial_number, 
             capacity, installation_date, location, status, qr_code_data) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: ['equipmentId', 'type', 'manufacturer', 'model', 'serialNumber', 
               'capacity', 'installationDate', 'location', 'status', 'qrCodeData'],
      returnType: 'write',
      validate: (params) => validateEquipmentId(params.equipmentId) && 
                           params.type && params.manufacturer
    },
    
    update: {
      sql: `UPDATE equipment SET manufacturer = ?, model = ?, serial_number = ?, 
             capacity = ?, installation_date = ?, location = ?, status = ? WHERE id = ?`,
      params: ['manufacturer', 'model', 'serialNumber', 'capacity', 
               'installationDate', 'location', 'status', 'id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    },
    
    delete: {
      sql: 'DELETE FROM equipment WHERE id = ?',
      params: ['id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    },
    
    getDistinctTypes: {
      sql: 'SELECT DISTINCT type FROM equipment WHERE type IS NOT NULL ORDER BY type',
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getStatusCounts: {
      sql: 'SELECT status, COUNT(*) as count FROM equipment GROUP BY status',
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getCount: {
      sql: 'SELECT COUNT(*) as count FROM equipment',
      params: [],
      returnType: 'scalar',
      validate: () => true
    }
  },

  // Inspection operations
  inspections: {
    getAll: {
      sql: 'SELECT * FROM inspections ORDER BY inspection_date DESC',
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getByEquipmentId: {
      sql: 'SELECT * FROM inspections WHERE equipment_id = ? ORDER BY inspection_date DESC',
      params: ['equipmentId'],
      returnType: 'many',
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0
    },
    
    create: {
      sql: `INSERT INTO inspections (equipment_id, inspector, inspection_date, findings, 
             corrective_actions, summary_comments, signature, scheduled_inspection_id, inspection_date_date) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, date(?))`,
      params: ['equipmentId', 'inspector', 'inspectionDate', 'findings', 
               'correctiveActions', 'summaryComments', 'signature', 'scheduledInspectionId', 'inspectionDate'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.equipmentId) && 
                           params.equipmentId > 0 && 
                           validateInspector(params.inspector) &&
                           validateDate(params.inspectionDate)
    },
    
    createFromScheduled: {
      sql: `INSERT INTO inspections (equipment_id, inspector, inspection_date, findings, 
             corrective_actions, summary_comments, signature, scheduled_inspection_id, inspection_date_date) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, date(?))`,
      params: ['equipmentId', 'inspector', 'inspectionDate', 'findings', 
               'correctiveActions', 'summaryComments', 'signature', 'scheduledInspectionId', 'inspectionDate'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.equipmentId) && 
                           params.equipmentId > 0 && 
                           validateInspector(params.inspector) &&
                           validateDate(params.inspectionDate) &&
                           Number.isInteger(params.scheduledInspectionId) && params.scheduledInspectionId > 0
    },
    
    getByScheduledId: {
      sql: 'SELECT * FROM inspections WHERE scheduled_inspection_id = ?',
      params: ['scheduledInspectionId'],
      returnType: 'one',
      validate: (params) => Number.isInteger(params.scheduledInspectionId) && params.scheduledInspectionId > 0
    },
    
    getByDateRange: {
      sql: 'SELECT * FROM inspections WHERE inspection_date_date BETWEEN ? AND ? ORDER BY inspection_date_date DESC',
      params: ['startDate', 'endDate'],
      returnType: 'many',
      validate: (params) => validateDate(params.startDate) && validateDate(params.endDate)
    },
    
    getCount: {
      sql: 'SELECT COUNT(*) as count FROM inspections',
      params: [],
      returnType: 'scalar',
      validate: () => true
    },
    
    getPerMonth: {
      sql: `SELECT strftime('%Y-%m', inspection_date_date) as month, COUNT(*) as count 
            FROM inspections 
            WHERE inspection_date_date IS NOT NULL 
            GROUP BY strftime('%Y-%m', inspection_date_date) 
            ORDER BY month DESC`,
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getLastInspectionByEquipment: {
      sql: `SELECT equipment_id, MAX(inspection_date_date) as last_inspection_date 
            FROM inspections 
            WHERE inspection_date_date IS NOT NULL
            GROUP BY equipment_id`,
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getRecentFailures: {
      sql: `SELECT e.equipment_id, i.inspection_date_date 
            FROM inspections i 
            JOIN equipment e ON i.equipment_id = e.id 
            WHERE i.findings LIKE '%fail%' OR i.findings LIKE '%defect%' 
            ORDER BY i.inspection_date_date DESC 
            LIMIT 10`,
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getComplianceStatus: {
      sql: `SELECT 
              e.id as equipment_id,
              e.equipment_id as equipment_identifier,
              e.type,
              MAX(i.inspection_date_date) as last_inspection_date,
              COUNT(CASE WHEN ii.critical = 1 AND ii.result = 'fail' THEN 1 END) as critical_failures,
              COUNT(CASE WHEN d.severity = 'critical' AND d.status IN ('open', 'in_progress') THEN 1 END) as open_critical_deficiencies
            FROM equipment e
            LEFT JOIN inspections i ON e.id = i.equipment_id
            LEFT JOIN inspection_items ii ON i.id = ii.inspection_id
            LEFT JOIN deficiencies d ON e.id = d.equipment_id
            GROUP BY e.id, e.equipment_id, e.type
            ORDER BY e.equipment_id`,
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getOverdue: {
      sql: `SELECT i.*, e.equipment_id as equipment_identifier
            FROM inspections i
            JOIN equipment e ON i.equipment_id = e.id
            WHERE i.inspection_date_date < date('now', '-1 year')
            AND i.id IN (
              SELECT MAX(id) FROM inspections 
              GROUP BY equipment_id
            )
            ORDER BY i.inspection_date_date ASC`,
      params: [],
      returnType: 'many',
      validate: () => true
    }
  },

  // Document operations
  documents: {
    getByEquipmentId: {
      sql: 'SELECT * FROM documents WHERE equipment_id = ? ORDER BY file_name',
      params: ['equipmentId'],
      returnType: 'many',
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0
    },
    
    create: {
      sql: 'INSERT INTO documents (equipment_id, file_name, file_path, hash, size) VALUES (?, ?, ?, ?, ?)',
      params: ['equipmentId', 'fileName', 'filePath', 'hash', 'size'],
      returnType: 'write',
      validate: (params, userDataPath) => Number.isInteger(params.equipmentId) && 
                           params.equipmentId > 0 && 
                           params.fileName && 
                           validateFilePath(params.filePath, userDataPath) &&
                           params.hash && params.size
    },
    
    checkExisting: {
      sql: 'SELECT id FROM documents WHERE equipment_id = ? AND file_name = ?',
      params: ['equipmentId', 'fileName'],
      returnType: 'one',
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
      returnType: 'many',
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
      returnType: 'many',
      validate: (params) => validateDate(params.fromDate)
    },
    
    getTodayAndLater: {
      sql: 'SELECT * FROM scheduled_inspections WHERE scheduled_date >= ?',
      params: ['today'],
      returnType: 'many',
      validate: (params) => validateDate(params.today)
    },
    
    create: {
      sql: `INSERT INTO scheduled_inspections (equipment_id, scheduled_date, assigned_inspector, status) 
            VALUES (?, ?, ?, ?)`,
      params: ['equipmentId', 'scheduledDate', 'assignedInspector', 'status'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.equipmentId) && 
                           params.equipmentId > 0 && 
                           validateDate(params.scheduledDate) &&
                           validateInspector(params.assignedInspector)
    },
    
    update: {
      sql: `UPDATE scheduled_inspections SET equipment_id = ?, scheduled_date = ?, assigned_inspector = ? 
            WHERE id = ?`,
      params: ['equipmentId', 'scheduledDate', 'assignedInspector', 'id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.equipmentId) && 
                           params.equipmentId > 0 && 
                           validateDate(params.scheduledDate) &&
                           validateInspector(params.assignedInspector) &&
                           Number.isInteger(params.id) && params.id > 0
    },
    
    updateStatus: {
      sql: 'UPDATE scheduled_inspections SET status = ? WHERE id = ?',
      params: ['status', 'id'],
      returnType: 'write',
      validate: (params) => params.status && 
                           ['scheduled', 'in_progress', 'completed'].includes(params.status) &&
                           Number.isInteger(params.id) && params.id > 0
    },
    
    delete: {
      sql: 'DELETE FROM scheduled_inspections WHERE id = ?',
      params: ['id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    }
  },

  // Compliance operations
  compliance: {
    getAllStandards: {
      sql: 'SELECT * FROM compliance_standards ORDER BY name',
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    createStandard: {
      sql: 'INSERT INTO compliance_standards (name, description, authority) VALUES (?, ?, ?)',
      params: ['name', 'description', 'authority'],
      returnType: 'write',
      validate: (params) => params.name && params.description && params.authority
    },
    
    deleteStandard: {
      sql: 'DELETE FROM compliance_standards WHERE id = ?',
      params: ['id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    },
    
    getAssignedStandards: {
      sql: `SELECT cs.id, cs.name FROM compliance_standards cs
            JOIN equipment_type_compliance etc ON cs.id = etc.standard_id
            WHERE etc.equipment_type = ?`,
      params: ['equipmentType'],
      returnType: 'many',
      validate: (params) => params.equipmentType && typeof params.equipmentType === 'string'
    },
    
    assignStandard: {
      sql: 'INSERT OR IGNORE INTO equipment_type_compliance (equipment_type, standard_id) VALUES (?, ?)',
      params: ['equipmentType', 'standardId'],
      returnType: 'write',
      validate: (params) => params.equipmentType && 
                           Number.isInteger(params.standardId) && params.standardId > 0
    },
    
    unassignStandard: {
      sql: 'DELETE FROM equipment_type_compliance WHERE equipment_type = ? AND standard_id = ?',
      params: ['equipmentType', 'standardId'],
      returnType: 'write',
      validate: (params) => params.equipmentType && 
                           Number.isInteger(params.standardId) && params.standardId > 0
    },
    
    getComplianceReport: {
      sql: `SELECT etc.equipment_type, cs.name as standard_name, cs.id as standard_id
            FROM equipment_type_compliance etc
            JOIN compliance_standards cs ON etc.standard_id = cs.id
            ORDER BY etc.equipment_type, cs.name`,
      params: [],
      returnType: 'many',
      validate: () => true
    }
  },

  // Template operations
  templates: {
    getAll: {
      sql: 'SELECT id, name, fields FROM inspection_templates ORDER BY name',
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    save: {
      sql: `INSERT INTO inspection_templates (name, fields) VALUES (?, ?)
            ON CONFLICT(name) DO UPDATE SET fields=excluded.fields`,
      params: ['name', 'fields'],
      returnType: 'write',
      validate: (params) => params.name && params.fields
    },
    
    delete: {
      sql: 'DELETE FROM inspection_templates WHERE id = ?',
      params: ['id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    }
  },

  // Inspection items operations (Phase 2)
  inspectionItems: {
    getByInspectionId: {
      sql: 'SELECT * FROM inspection_items WHERE inspection_id = ? ORDER BY id',
      params: ['inspectionId'],
      returnType: 'many',
      validate: (params) => Number.isInteger(params.inspectionId) && params.inspectionId > 0
    },
    
    create: {
      sql: `INSERT INTO inspection_items (inspection_id, standard_ref, item_text, critical, 
             result, notes, photos, component, priority) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: ['inspectionId', 'standardRef', 'itemText', 'critical', 'result', 
               'notes', 'photos', 'component', 'priority'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.inspectionId) && 
                           params.inspectionId > 0 && 
                           params.itemText &&
                           ['pass', 'fail', 'na'].includes(params.result)
    },
    
    update: {
      sql: `UPDATE inspection_items SET standard_ref = ?, item_text = ?, critical = ?, 
             result = ?, notes = ?, photos = ?, component = ?, priority = ? WHERE id = ?`,
      params: ['standardRef', 'itemText', 'critical', 'result', 'notes', 
               'photos', 'component', 'priority', 'id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0 &&
                           params.itemText &&
                           ['pass', 'fail', 'na'].includes(params.result)
    },
    
    delete: {
      sql: 'DELETE FROM inspection_items WHERE id = ?',
      params: ['id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    },
    
    getCriticalFailures: {
      sql: `SELECT ii.*, i.equipment_id, e.equipment_id as equipment_identifier
            FROM inspection_items ii
            JOIN inspections i ON ii.inspection_id = i.id
            JOIN equipment e ON i.equipment_id = e.id
            WHERE ii.critical = 1 AND ii.result = 'fail'
            ORDER BY i.inspection_date DESC`,
      params: [],
      returnType: 'many',
      validate: () => true
    }
  },

  // Deficiencies operations (Phase 2)
  deficiencies: {
    getAll: {
      sql: `SELECT d.*, e.equipment_id as equipment_identifier
            FROM deficiencies d
            JOIN equipment e ON d.equipment_id = e.id
            ORDER BY d.created_at DESC`,
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getByEquipmentId: {
      sql: 'SELECT * FROM deficiencies WHERE equipment_id = ? ORDER BY created_at DESC',
      params: ['equipmentId'],
      returnType: 'many',
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0
    },
    
    getByStatus: {
      sql: `SELECT d.*, e.equipment_id as equipment_identifier
            FROM deficiencies d
            JOIN equipment e ON d.equipment_id = e.id
            WHERE d.status = ?
            ORDER BY d.created_at DESC`,
      params: ['status'],
      returnType: 'many',
      validate: (params) => ['open', 'in_progress', 'verified', 'closed'].includes(params.status)
    },
    
    create: {
      sql: `INSERT INTO deficiencies (equipment_id, inspection_item_id, severity, 
             remove_from_service, description, component, corrective_action, due_date, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: ['equipmentId', 'inspectionItemId', 'severity', 'removeFromService', 
               'description', 'component', 'correctiveAction', 'dueDate', 'status'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.equipmentId) && 
                           params.equipmentId > 0 && 
                           ['critical', 'major', 'minor'].includes(params.severity) &&
                           params.description &&
                           ['open', 'in_progress', 'verified', 'closed'].includes(params.status)
    },
    
    update: {
      sql: `UPDATE deficiencies SET severity = ?, remove_from_service = ?, description = ?, 
             component = ?, corrective_action = ?, due_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
      params: ['severity', 'removeFromService', 'description', 'component', 
               'correctiveAction', 'dueDate', 'status', 'id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0 &&
                           ['critical', 'major', 'minor'].includes(params.severity) &&
                           params.description &&
                           ['open', 'in_progress', 'verified', 'closed'].includes(params.status)
    },
    
    close: {
      sql: `UPDATE deficiencies SET status = 'closed', closed_at = CURRENT_TIMESTAMP, 
             verification_signature = ?, verification_timestamp = CURRENT_TIMESTAMP, 
             updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params: ['verificationSignature', 'id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    },
    
    getOpenCritical: {
      sql: `SELECT d.*, e.equipment_id as equipment_identifier
            FROM deficiencies d
            JOIN equipment e ON d.equipment_id = e.id
            WHERE d.severity = 'critical' AND d.status IN ('open', 'in_progress')
            ORDER BY d.created_at DESC`,
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getOverdue: {
      sql: `SELECT d.*, e.equipment_id as equipment_identifier
            FROM deficiencies d
            JOIN equipment e ON d.equipment_id = e.id
            WHERE d.due_date < date('now') AND d.status IN ('open', 'in_progress')
            ORDER BY d.due_date ASC`,
      params: [],
      returnType: 'many',
      validate: () => true
    },

    createFromInspectionItem: {
      sql: `INSERT INTO deficiencies (equipment_id, inspection_item_id, severity, 
             remove_from_service, description, component, corrective_action, due_date, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
      params: ['equipmentId', 'inspectionItemId', 'severity', 'removeFromService', 
               'description', 'component', 'correctiveAction', 'dueDate'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.equipmentId) && 
                           params.equipmentId > 0 && 
                           Number.isInteger(params.inspectionItemId) && 
                           params.inspectionItemId > 0 &&
                           ['critical', 'major', 'minor'].includes(params.severity) &&
                           params.description
    },

    linkToWorkOrder: {
      sql: `UPDATE deficiencies SET work_order_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params: ['workOrderId', 'id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0 &&
                           Number.isInteger(params.workOrderId) && params.workOrderId > 0
    }
  },

  // Signatures operations (Phase 2)
  signatures: {
    getByEntity: {
      sql: 'SELECT * FROM signatures WHERE entity_type = ? AND entity_id = ? ORDER BY timestamp DESC',
      params: ['entityType', 'entityId'],
      returnType: 'many',
      validate: (params) => params.entityType && 
                           ['inspection', 'deficiency', 'work_order'].includes(params.entityType) &&
                           Number.isInteger(params.entityId) && params.entityId > 0
    },
    
    create: {
      sql: `INSERT INTO signatures (entity_type, entity_id, signature_type, signatory_name, signature_data) 
             VALUES (?, ?, ?, ?, ?)`,
      params: ['entityType', 'entityId', 'signatureType', 'signatoryName', 'signatureData'],
      returnType: 'write',
      validate: (params) => params.entityType && 
                           ['inspection', 'deficiency', 'work_order'].includes(params.entityType) &&
                           Number.isInteger(params.entityId) && params.entityId > 0 &&
                           params.signatureType &&
                           ['inspector', 'supervisor', 'verification'].includes(params.signatureType) &&
                           params.signatoryName && params.signatureData
    },
    
    delete: {
      sql: 'DELETE FROM signatures WHERE id = ?',
      params: ['id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    }
  },

  // Work Orders operations (P2 - Migration v3)
  workOrders: {
    getAll: {
      sql: `SELECT wo.*, e.equipment_id as equipment_identifier
            FROM work_orders wo
            JOIN equipment e ON wo.equipment_id = e.id
            ORDER BY wo.created_at DESC`,
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getByStatus: {
      sql: `SELECT wo.*, e.equipment_id as equipment_identifier
            FROM work_orders wo
            JOIN equipment e ON wo.equipment_id = e.id
            WHERE wo.status = ?
            ORDER BY wo.created_at DESC`,
      params: ['status'],
      returnType: 'many',
      validate: (params) => ['draft', 'approved', 'assigned', 'in_progress', 'completed', 'closed', 'cancelled'].includes(params.status)
    },
    
    getByEquipmentId: {
      sql: 'SELECT * FROM work_orders WHERE equipment_id = ? ORDER BY created_at DESC',
      params: ['equipmentId'],
      returnType: 'many',
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0
    },
    
    create: {
      sql: `INSERT INTO work_orders (equipment_id, wo_number, title, description, work_type, 
             priority, assigned_to, estimated_hours, created_by, scheduled_date, deficiency_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: ['equipmentId', 'woNumber', 'title', 'description', 'workType', 
               'priority', 'assignedTo', 'estimatedHours', 'createdBy', 'scheduledDate', 'deficiencyId'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.equipmentId) && 
                           params.equipmentId > 0 && 
                           params.woNumber && params.title &&
                           ['preventive', 'corrective', 'emergency', 'project'].includes(params.workType) &&
                           ['low', 'medium', 'high', 'critical'].includes(params.priority) &&
                           params.createdBy
    },
    
    update: {
      sql: `UPDATE work_orders SET title = ?, description = ?, work_type = ?, priority = ?, 
             assigned_to = ?, estimated_hours = ?, scheduled_date = ? WHERE id = ?`,
      params: ['title', 'description', 'workType', 'priority', 'assignedTo', 'estimatedHours', 'scheduledDate', 'id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0 &&
                           params.title &&
                           ['preventive', 'corrective', 'emergency', 'project'].includes(params.workType) &&
                           ['low', 'medium', 'high', 'critical'].includes(params.priority)
    },
    
    updateStatus: {
      sql: 'UPDATE work_orders SET status = ?, started_at = ?, completed_at = ?, closed_at = ? WHERE id = ?',
      params: ['status', 'startedAt', 'completedAt', 'closedAt', 'id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0 &&
                           ['draft', 'approved', 'assigned', 'in_progress', 'completed', 'closed', 'cancelled'].includes(params.status)
    },
    
    complete: {
      sql: `UPDATE work_orders SET status = 'completed', completed_at = CURRENT_TIMESTAMP, 
             actual_hours = ?, parts_cost = ?, labor_cost = ?, completion_notes = ? WHERE id = ?`,
      params: ['actualHours', 'partsCost', 'laborCost', 'completionNotes', 'id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    },
    
    getDueToday: {
      sql: `SELECT wo.*, e.equipment_id as equipment_identifier
            FROM work_orders wo
            JOIN equipment e ON wo.equipment_id = e.id
            WHERE wo.scheduled_date = date('now') AND wo.status IN ('approved', 'assigned')
            ORDER BY wo.priority DESC`,
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getOverdue: {
      sql: `SELECT wo.*, e.equipment_id as equipment_identifier
            FROM work_orders wo
            JOIN equipment e ON wo.equipment_id = e.id
            WHERE wo.scheduled_date < date('now') AND wo.status IN ('approved', 'assigned', 'in_progress')
            ORDER BY wo.scheduled_date ASC`,
      params: [],
      returnType: 'many',
      validate: () => true
    }
  },

  // PM Templates operations (P2 - Migration v3)
  pmTemplates: {
    getAll: {
      sql: 'SELECT * FROM pm_templates WHERE active = 1 ORDER BY name',
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getByEquipmentType: {
      sql: 'SELECT * FROM pm_templates WHERE equipment_type = ? AND active = 1 ORDER BY name',
      params: ['equipmentType'],
      returnType: 'many',
      validate: (params) => params.equipmentType && typeof params.equipmentType === 'string'
    },
    
    create: {
      sql: `INSERT INTO pm_templates (name, equipment_type, description, frequency_type, 
             frequency_value, frequency_unit, estimated_duration, instructions, required_skills, 
             required_parts, safety_notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: ['name', 'equipmentType', 'description', 'frequencyType', 'frequencyValue', 
               'frequencyUnit', 'estimatedDuration', 'instructions', 'requiredSkills', 
               'requiredParts', 'safetyNotes'],
      returnType: 'write',
      validate: (params) => params.name && params.equipmentType &&
                           ['calendar', 'usage', 'condition'].includes(params.frequencyType) &&
                           Number.isInteger(params.frequencyValue) && params.frequencyValue > 0
    },
    
    update: {
      sql: `UPDATE pm_templates SET name = ?, equipment_type = ?, description = ?, 
             frequency_type = ?, frequency_value = ?, frequency_unit = ?, estimated_duration = ?, 
             instructions = ?, required_skills = ?, required_parts = ?, safety_notes = ?, 
             updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params: ['name', 'equipmentType', 'description', 'frequencyType', 'frequencyValue', 
               'frequencyUnit', 'estimatedDuration', 'instructions', 'requiredSkills', 
               'requiredParts', 'safetyNotes', 'id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0 &&
                           params.name && params.equipmentType &&
                           ['calendar', 'usage', 'condition'].includes(params.frequencyType) &&
                           Number.isInteger(params.frequencyValue) && params.frequencyValue > 0
    },
    
    deactivate: {
      sql: 'UPDATE pm_templates SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      params: ['id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    }
  },

  // PM Schedules operations (P2 - Migration v3)
  pmSchedules: {
    getByEquipmentId: {
      sql: `SELECT ps.*, pt.name as template_name, pt.frequency_type, pt.frequency_value, pt.frequency_unit
            FROM pm_schedules ps
            JOIN pm_templates pt ON ps.pm_template_id = pt.id
            WHERE ps.equipment_id = ? AND ps.active = 1
            ORDER BY ps.next_due_date`,
      params: ['equipmentId'],
      returnType: 'many',
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0
    },
    
    getDue: {
      sql: `SELECT ps.*, pt.name as template_name, e.equipment_id as equipment_identifier
            FROM pm_schedules ps
            JOIN pm_templates pt ON ps.pm_template_id = pt.id
            JOIN equipment e ON ps.equipment_id = e.id
            WHERE ps.next_due_date <= ? AND ps.active = 1
            ORDER BY ps.next_due_date`,
      params: ['dueDate'],
      returnType: 'many',
      validate: (params) => validateDate(params.dueDate)
    },
    
    create: {
      sql: `INSERT INTO pm_schedules (equipment_id, pm_template_id, next_due_date, next_due_usage) 
             VALUES (?, ?, ?, ?)`,
      params: ['equipmentId', 'pmTemplateId', 'nextDueDate', 'nextDueUsage'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0 &&
                           Number.isInteger(params.pmTemplateId) && params.pmTemplateId > 0
    },
    
    updateDue: {
      sql: `UPDATE pm_schedules SET next_due_date = ?, next_due_usage = ?, 
             last_completed_date = ?, last_completed_usage = ? WHERE id = ?`,
      params: ['nextDueDate', 'nextDueUsage', 'lastCompletedDate', 'lastCompletedUsage', 'id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    },
    
    getTotal: {
      sql: 'SELECT COUNT(*) as count FROM pm_schedules WHERE active = 1',
      params: [],
      returnType: 'scalar',
      validate: () => true
    },
    
    getOverdue: {
      sql: `SELECT ps.*, pt.name as template_name, e.equipment_id as equipment_identifier
            FROM pm_schedules ps
            JOIN pm_templates pt ON ps.pm_template_id = pt.id
            JOIN equipment e ON ps.equipment_id = e.id
            WHERE ps.next_due_date < date('now') AND ps.active = 1
            ORDER BY ps.next_due_date ASC`,
      params: [],
      returnType: 'many',
      validate: () => true
    }
  },

  // Load Tests operations (P2 - Migration v4)
  loadTests: {
    getByEquipmentId: {
      sql: 'SELECT * FROM load_tests WHERE equipment_id = ? ORDER BY test_date DESC',
      params: ['equipmentId'],
      returnType: 'many',
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0
    },
    
    getDue: {
      sql: `SELECT lt.*, e.equipment_id as equipment_identifier
            FROM load_tests lt
            JOIN equipment e ON lt.equipment_id = e.id
            WHERE lt.next_test_due <= ? AND lt.test_results = 'pass'
            ORDER BY lt.next_test_due`,
      params: ['dueDate'],
      returnType: 'many',
      validate: (params) => validateDate(params.dueDate)
    },
    
    create: {
      sql: `INSERT INTO load_tests (equipment_id, test_date, test_type, test_load_percentage, 
             rated_capacity, test_load, test_duration, inspector, test_results, 
             deficiencies_found, corrective_actions, next_test_due, certificate_number, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: ['equipmentId', 'testDate', 'testType', 'testLoadPercentage', 'ratedCapacity', 
               'testLoad', 'testDuration', 'inspector', 'testResults', 'deficienciesFound', 
               'correctiveActions', 'nextTestDue', 'certificateNumber', 'notes'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0 &&
                           validateDate(params.testDate) &&
                           ['annual', 'periodic', 'initial', 'after_repair'].includes(params.testType) &&
                           ['pass', 'fail'].includes(params.testResults) &&
                           validateInspector(params.inspector)
    },
    
    getLastByEquipment: {
      sql: `SELECT equipment_id, MAX(test_date) as last_test_date, test_results
            FROM load_tests 
            GROUP BY equipment_id`,
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getTotal: {
      sql: 'SELECT COUNT(*) as count FROM load_tests',
      params: [],
      returnType: 'scalar',
      validate: () => true
    },
    
    getOverdue: {
      sql: `SELECT lt.*, e.equipment_id as equipment_identifier
            FROM load_tests lt
            JOIN equipment e ON lt.equipment_id = e.id
            WHERE lt.next_test_due < date('now') AND lt.test_results = 'pass'
            ORDER BY lt.next_test_due ASC`,
      params: [],
      returnType: 'many',
      validate: () => true
    }
  },

  // Calibrations operations (P2 - Migration v4)
  calibrations: {
    getByEquipmentId: {
      sql: 'SELECT * FROM calibrations WHERE equipment_id = ? ORDER BY calibration_date DESC',
      params: ['equipmentId'],
      returnType: 'many',
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0
    },
    
    getDue: {
      sql: `SELECT c.*, e.equipment_id as equipment_identifier
            FROM calibrations c
            JOIN equipment e ON c.equipment_id = e.id
            WHERE c.calibration_due_date <= ?
            ORDER BY c.calibration_due_date`,
      params: ['dueDate'],
      returnType: 'many',
      validate: (params) => validateDate(params.dueDate)
    },
    
    create: {
      sql: `INSERT INTO calibrations (equipment_id, instrument_type, calibration_date, 
             calibration_due_date, calibrated_by, calibration_agency, certificate_number, 
             calibration_results, accuracy_tolerance, actual_accuracy, adjustments_made, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: ['equipmentId', 'instrumentType', 'calibrationDate', 'calibrationDueDate', 
               'calibratedBy', 'calibrationAgency', 'certificateNumber', 'calibrationResults', 
               'accuracyTolerance', 'actualAccuracy', 'adjustmentsMade', 'notes'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0 &&
                           params.instrumentType &&
                           validateDate(params.calibrationDate) &&
                           validateDate(params.calibrationDueDate) &&
                           params.calibratedBy &&
                           ['pass', 'fail', 'limited'].includes(params.calibrationResults)
    },
    
    getTotal: {
      sql: 'SELECT COUNT(*) as count FROM calibrations',
      params: [],
      returnType: 'scalar',
      validate: () => true
    },
    
    getOverdue: {
      sql: `SELECT c.*, e.equipment_id as equipment_identifier
            FROM calibrations c
            JOIN equipment e ON c.equipment_id = e.id
            WHERE c.calibration_due_date < date('now')
            ORDER BY c.calibration_due_date ASC`,
      params: [],
      returnType: 'many',
      validate: () => true
    }
  },

  // Credentials operations (P2 - Migration v4)
  credentials: {
    getAll: {
      sql: 'SELECT * FROM credentials ORDER BY person_name, credential_type',
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getByPerson: {
      sql: 'SELECT * FROM credentials WHERE person_name = ? ORDER BY credential_type',
      params: ['personName'],
      returnType: 'many',
      validate: (params) => params.personName && typeof params.personName === 'string'
    },
    
    getExpiring: {
      sql: `SELECT * FROM credentials 
            WHERE expiration_date <= ? AND status = 'active' 
            ORDER BY expiration_date`,
      params: ['expirationDate'],
      returnType: 'many',
      validate: (params) => validateDate(params.expirationDate)
    },
    
    create: {
      sql: `INSERT INTO credentials (person_name, credential_type, equipment_types, 
             certification_body, certificate_number, issue_date, expiration_date, 
             renewal_required, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: ['personName', 'credentialType', 'equipmentTypes', 'certificationBody', 
               'certificateNumber', 'issueDate', 'expirationDate', 'renewalRequired', 'notes'],
      returnType: 'write',
      validate: (params) => params.personName && params.credentialType &&
                           validateDate(params.issueDate) &&
                           validateDate(params.expirationDate)
    },
    
    updateStatus: {
      sql: 'UPDATE credentials SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      params: ['status', 'id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0 &&
                           ['active', 'expired', 'suspended', 'revoked'].includes(params.status)
    },
    
    getTotal: {
      sql: 'SELECT COUNT(*) as count FROM credentials',
      params: [],
      returnType: 'scalar',
      validate: () => true
    }
  },

  // Users operations (P2 - Migration v5)
  users: {
    getAll: {
      sql: 'SELECT * FROM users WHERE active = 1 ORDER BY full_name',
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    getByUsername: {
      sql: 'SELECT * FROM users WHERE username = ? AND active = 1',
      params: ['username'],
      returnType: 'one',
      validate: (params) => params.username && typeof params.username === 'string'
    },
    
    create: {
      sql: `INSERT INTO users (username, full_name, email, role) 
             VALUES (?, ?, ?, ?)`,
      params: ['username', 'fullName', 'email', 'role'],
      returnType: 'write',
      validate: (params) => params.username && params.fullName &&
                           ['admin', 'inspector', 'reviewer', 'viewer'].includes(params.role)
    },
    
    updateLastLogin: {
      sql: 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      params: ['id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0
    }
  },

  // Audit Log operations (P2 - Migration v5)
  auditLog: {
    create: {
      sql: `INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, 
             old_values, new_values, ip_address, user_agent) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: ['userId', 'username', 'action', 'entityType', 'entityId', 
               'oldValues', 'newValues', 'ipAddress', 'userAgent'],
      returnType: 'write',
      validate: (params) => params.username && params.action && params.entityType &&
                           Number.isInteger(params.entityId) && params.entityId > 0
    },
    
    getByEntity: {
      sql: `SELECT * FROM audit_log 
            WHERE entity_type = ? AND entity_id = ? 
            ORDER BY timestamp DESC`,
      params: ['entityType', 'entityId'],
      returnType: 'many',
      validate: (params) => params.entityType &&
                           Number.isInteger(params.entityId) && params.entityId > 0
    },
    
    getRecent: {
      sql: 'SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?',
      params: ['limit'],
      returnType: 'many',
      validate: (params) => Number.isInteger(params.limit) && params.limit > 0
    }
  },

  // Certificates operations (P2 - Migration v5)
  certificates: {
    getByEquipmentId: {
      sql: 'SELECT * FROM certificates WHERE equipment_id = ? ORDER BY issue_date DESC',
      params: ['equipmentId'],
      returnType: 'many',
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0
    },
    
    getByCertificateNumber: {
      sql: 'SELECT * FROM certificates WHERE certificate_number = ?',
      params: ['certificateNumber'],
      returnType: 'one',
      validate: (params) => params.certificateNumber && typeof params.certificateNumber === 'string'
    },
    
    getExpiring: {
      sql: `SELECT c.*, e.equipment_id as equipment_identifier
            FROM certificates c
            JOIN equipment e ON c.equipment_id = e.id
            WHERE c.expiration_date <= ? AND c.status = 'active'
            ORDER BY c.expiration_date`,
      params: ['expirationDate'],
      returnType: 'many',
      validate: (params) => validateDate(params.expirationDate)
    },
    
    create: {
      sql: `INSERT INTO certificates (certificate_number, certificate_type, equipment_id, 
             entity_id, issue_date, expiration_date, issued_by, qr_code_data, certificate_hash) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: ['certificateNumber', 'certificateType', 'equipmentId', 'entityId', 
               'issueDate', 'expirationDate', 'issuedBy', 'qrCodeData', 'certificateHash'],
      returnType: 'write',
      validate: (params) => params.certificateNumber &&
                           ['inspection', 'load_test', 'calibration'].includes(params.certificateType) &&
                           Number.isInteger(params.equipmentId) && params.equipmentId > 0 &&
                           Number.isInteger(params.entityId) && params.entityId > 0 &&
                           validateDate(params.issueDate) &&
                           params.issuedBy
    },
    
    updateStatus: {
      sql: 'UPDATE certificates SET status = ? WHERE id = ?',
      params: ['status', 'id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0 &&
                           ['active', 'expired', 'revoked'].includes(params.status)
    },
    
    getTotal: {
      sql: 'SELECT COUNT(*) as count FROM certificates',
      params: [],
      returnType: 'scalar',
      validate: () => true
    }
  },

  // Meter Readings operations (P2 - Migration v3)
  meterReadings: {
    getByEquipmentId: {
      sql: 'SELECT * FROM meter_readings WHERE equipment_id = ? ORDER BY reading_date DESC',
      params: ['equipmentId'],
      returnType: 'many',
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0
    },
    
    getLatestByEquipment: {
      sql: `SELECT equipment_id, meter_type, MAX(reading_value) as latest_reading, 
            MAX(reading_date) as latest_date
            FROM meter_readings 
            GROUP BY equipment_id, meter_type`,
      params: [],
      returnType: 'many',
      validate: () => true
    },
    
    create: {
      sql: `INSERT INTO meter_readings (equipment_id, meter_type, reading_value, 
             reading_date, recorded_by, notes) 
             VALUES (?, ?, ?, ?, ?, ?)`,
      params: ['equipmentId', 'meterType', 'readingValue', 'readingDate', 'recordedBy', 'notes'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.equipmentId) && params.equipmentId > 0 &&
                           params.meterType &&
                           typeof params.readingValue === 'number' &&
                           validateDate(params.readingDate) &&
                           params.recordedBy
    }
  },

  // Template Items operations (P2 - Migration v4)
  templateItems: {
    getByTemplateId: {
      sql: 'SELECT * FROM template_items WHERE template_id = ? ORDER BY item_order',
      params: ['templateId'],
      returnType: 'many',
      validate: (params) => Number.isInteger(params.templateId) && params.templateId > 0
    },
    
    create: {
      sql: `INSERT INTO template_items (template_id, standard_id, item_order, standard_ref, 
             item_text, critical, component, inspection_method, acceptance_criteria, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: ['templateId', 'standardId', 'itemOrder', 'standardRef', 'itemText', 
               'critical', 'component', 'inspectionMethod', 'acceptanceCriteria', 'notes'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.templateId) && params.templateId > 0 &&
                           Number.isInteger(params.itemOrder) && params.itemOrder > 0 &&
                           params.itemText
    },
    
    update: {
      sql: `UPDATE template_items SET standard_id = ?, item_order = ?, standard_ref = ?, 
             item_text = ?, critical = ?, component = ?, inspection_method = ?, 
             acceptance_criteria = ?, notes = ? WHERE id = ?`,
      params: ['standardId', 'itemOrder', 'standardRef', 'itemText', 'critical', 
               'component', 'inspectionMethod', 'acceptanceCriteria', 'notes', 'id'],
      returnType: 'write',
      validate: (params) => Number.isInteger(params.id) && params.id > 0 &&
                           Number.isInteger(params.itemOrder) && params.itemOrder > 0 &&
                           params.itemText
    },
    
    delete: {
      sql: 'DELETE FROM template_items WHERE id = ?',
      params: ['id'],
      returnType: 'write',
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
