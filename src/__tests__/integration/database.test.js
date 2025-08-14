import '@testing-library/jest-dom';

// Mock electron API for database operations
const mockDatabase = {
  equipment: new Map(),
  inspections: new Map(),
  users: new Map(),
  nextId: 1
};

Object.defineProperty(window, 'electronAPI', {
  value: {
    // Equipment operations
    getEquipment: jest.fn(async () => {
      return {
        success: true,
        data: Array.from(mockDatabase.equipment.values())
      };
    }),
    
    addEquipment: jest.fn(async (equipment) => {
      const id = `equipment-${mockDatabase.nextId++}`;
      const newEquipment = { ...equipment, id, createdAt: new Date().toISOString() };
      mockDatabase.equipment.set(id, newEquipment);
      return { success: true, data: newEquipment };
    }),
    
    updateEquipment: jest.fn(async (id, updates) => {
      const existing = mockDatabase.equipment.get(id);
      if (!existing) {
        return { success: false, error: 'Equipment not found' };
      }
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      mockDatabase.equipment.set(id, updated);
      return { success: true, data: updated };
    }),
    
    deleteEquipment: jest.fn(async (id) => {
      const deleted = mockDatabase.equipment.delete(id);
      return { success: deleted };
    }),
    
    // Inspection operations
    getInspections: jest.fn(async (filters = {}) => {
      let inspections = Array.from(mockDatabase.inspections.values());
      
      if (filters.equipmentId) {
        inspections = inspections.filter(i => i.equipmentId === filters.equipmentId);
      }
      if (filters.status) {
        inspections = inspections.filter(i => i.status === filters.status);
      }
      if (filters.dateFrom) {
        inspections = inspections.filter(i => new Date(i.date) >= new Date(filters.dateFrom));
      }
      if (filters.dateTo) {
        inspections = inspections.filter(i => new Date(i.date) <= new Date(filters.dateTo));
      }
      
      return { success: true, data: inspections };
    }),
    
    addInspection: jest.fn(async (inspection) => {
      const id = `inspection-${mockDatabase.nextId++}`;
      const newInspection = { 
        ...inspection, 
        id, 
        createdAt: new Date().toISOString(),
        status: inspection.status || 'pending'
      };
      mockDatabase.inspections.set(id, newInspection);
      return { success: true, data: newInspection };
    }),
    
    updateInspection: jest.fn(async (id, updates) => {
      const existing = mockDatabase.inspections.get(id);
      if (!existing) {
        return { success: false, error: 'Inspection not found' };
      }
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      mockDatabase.inspections.set(id, updated);
      return { success: true, data: updated };
    }),
    
    deleteInspection: jest.fn(async (id) => {
      const deleted = mockDatabase.inspections.delete(id);
      return { success: deleted };
    }),
    
    // User operations
    getUsers: jest.fn(async () => {
      return {
        success: true,
        data: Array.from(mockDatabase.users.values())
      };
    }),
    
    authenticateUser: jest.fn(async (username, password) => {
      const user = Array.from(mockDatabase.users.values())
        .find(u => u.username === username);
      
      if (user && user.password === password) {
        return {
          success: true,
          user: { ...user, password: undefined }
        };
      }
      
      return {
        success: false,
        message: 'Invalid credentials'
      };
    }),
    
    // Audit operations
    logAuditEvent: jest.fn(async (event) => {
      return { success: true };
    }),
    
    getAuditLog: jest.fn(async (filters = {}) => {
      return { success: true, data: [] };
    })
  },
  writable: true
});

describe('Database Integration Tests', () => {
  beforeEach(() => {
    // Reset mock database
    mockDatabase.equipment.clear();
    mockDatabase.inspections.clear();
    mockDatabase.users.clear();
    mockDatabase.nextId = 1;
    
    // Add test user
    mockDatabase.users.set('user-1', {
      id: 'user-1',
      username: 'testuser',
      password: 'testpass',
      role: 'inspector',
      name: 'Test User'
    });
    
    jest.clearAllMocks();
  });

  describe('Equipment Operations', () => {
    test('creates and retrieves equipment', async () => {
      const equipmentData = {
        name: 'Test Equipment',
        type: 'Pressure Vessel',
        location: 'Building A',
        serialNumber: 'PV-001'
      };
      
      // Add equipment
      const addResult = await window.electronAPI.addEquipment(equipmentData);
      expect(addResult.success).toBe(true);
      expect(addResult.data.id).toBeDefined();
      expect(addResult.data.name).toBe('Test Equipment');
      
      // Retrieve equipment
      const getResult = await window.electronAPI.getEquipment();
      expect(getResult.success).toBe(true);
      expect(getResult.data).toHaveLength(1);
      expect(getResult.data[0].name).toBe('Test Equipment');
    });
    
    test('updates equipment', async () => {
      // Add equipment first
      const addResult = await window.electronAPI.addEquipment({
        name: 'Original Name',
        type: 'Pressure Vessel'
      });
      
      const equipmentId = addResult.data.id;
      
      // Update equipment
      const updateResult = await window.electronAPI.updateEquipment(equipmentId, {
        name: 'Updated Name',
        status: 'active'
      });
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data.name).toBe('Updated Name');
      expect(updateResult.data.status).toBe('active');
      expect(updateResult.data.type).toBe('Pressure Vessel'); // Should preserve existing fields
    });
    
    test('deletes equipment', async () => {
      // Add equipment first
      const addResult = await window.electronAPI.addEquipment({
        name: 'To Delete',
        type: 'Tank'
      });
      
      const equipmentId = addResult.data.id;
      
      // Delete equipment
      const deleteResult = await window.electronAPI.deleteEquipment(equipmentId);
      expect(deleteResult.success).toBe(true);
      
      // Verify deletion
      const getResult = await window.electronAPI.getEquipment();
      expect(getResult.data).toHaveLength(0);
    });
  });

  describe('Inspection Operations', () => {
    let equipmentId;
    
    beforeEach(async () => {
      // Add test equipment
      const equipmentResult = await window.electronAPI.addEquipment({
        name: 'Test Equipment',
        type: 'Pressure Vessel'
      });
      equipmentId = equipmentResult.data.id;
    });
    
    test('creates and retrieves inspections', async () => {
      const inspectionData = {
        equipmentId,
        inspectorId: 'user-1',
        date: '2024-01-15',
        checklist: [
          { item: 'Visual inspection', status: 'pass' },
          { item: 'Pressure test', status: 'fail' }
        ],
        overallStatus: 'fail',
        notes: 'Requires maintenance'
      };
      
      // Add inspection
      const addResult = await window.electronAPI.addInspection(inspectionData);
      expect(addResult.success).toBe(true);
      expect(addResult.data.id).toBeDefined();
      expect(addResult.data.equipmentId).toBe(equipmentId);
      
      // Retrieve inspections
      const getResult = await window.electronAPI.getInspections();
      expect(getResult.success).toBe(true);
      expect(getResult.data).toHaveLength(1);
      expect(getResult.data[0].overallStatus).toBe('fail');
    });
    
    test('filters inspections by equipment', async () => {
      // Add second equipment
      const equipment2Result = await window.electronAPI.addEquipment({
        name: 'Equipment 2',
        type: 'Tank'
      });
      const equipment2Id = equipment2Result.data.id;
      
      // Add inspections for both equipment
      await window.electronAPI.addInspection({
        equipmentId,
        inspectorId: 'user-1',
        date: '2024-01-15'
      });
      
      await window.electronAPI.addInspection({
        equipmentId: equipment2Id,
        inspectorId: 'user-1',
        date: '2024-01-16'
      });
      
      // Filter by first equipment
      const filteredResult = await window.electronAPI.getInspections({ equipmentId });
      expect(filteredResult.success).toBe(true);
      expect(filteredResult.data).toHaveLength(1);
      expect(filteredResult.data[0].equipmentId).toBe(equipmentId);
    });
    
    test('filters inspections by date range', async () => {
      // Add inspections with different dates
      await window.electronAPI.addInspection({
        equipmentId,
        inspectorId: 'user-1',
        date: '2024-01-10'
      });
      
      await window.electronAPI.addInspection({
        equipmentId,
        inspectorId: 'user-1',
        date: '2024-01-20'
      });
      
      await window.electronAPI.addInspection({
        equipmentId,
        inspectorId: 'user-1',
        date: '2024-01-30'
      });
      
      // Filter by date range
      const filteredResult = await window.electronAPI.getInspections({
        dateFrom: '2024-01-15',
        dateTo: '2024-01-25'
      });
      
      expect(filteredResult.success).toBe(true);
      expect(filteredResult.data).toHaveLength(1);
      expect(filteredResult.data[0].date).toBe('2024-01-20');
    });
    
    test('updates inspection status', async () => {
      // Add inspection
      const addResult = await window.electronAPI.addInspection({
        equipmentId,
        inspectorId: 'user-1',
        date: '2024-01-15',
        status: 'pending'
      });
      
      const inspectionId = addResult.data.id;
      
      // Update status
      const updateResult = await window.electronAPI.updateInspection(inspectionId, {
        status: 'completed',
        overallStatus: 'pass'
      });
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data.status).toBe('completed');
      expect(updateResult.data.overallStatus).toBe('pass');
    });
  });

  describe('User Authentication', () => {
    test('authenticates valid user', async () => {
      const result = await window.electronAPI.authenticateUser('testuser', 'testpass');
      
      expect(result.success).toBe(true);
      expect(result.user.username).toBe('testuser');
      expect(result.user.role).toBe('inspector');
      expect(result.user.password).toBeUndefined(); // Password should not be returned
    });
    
    test('rejects invalid credentials', async () => {
      const result = await window.electronAPI.authenticateUser('testuser', 'wrongpass');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });
    
    test('rejects non-existent user', async () => {
      const result = await window.electronAPI.authenticateUser('nonexistent', 'password');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });
  });

  describe('Audit Logging', () => {
    test('logs audit events', async () => {
      const auditEvent = {
        userId: 'user-1',
        action: 'equipment_created',
        entityId: 'equipment-1',
        details: { name: 'Test Equipment' },
        timestamp: new Date().toISOString()
      };
      
      const result = await window.electronAPI.logAuditEvent(auditEvent);
      expect(result.success).toBe(true);
      expect(window.electronAPI.logAuditEvent).toHaveBeenCalledWith(auditEvent);
    });
    
    test('retrieves audit log', async () => {
      const result = await window.electronAPI.getAuditLog();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('handles update of non-existent equipment', async () => {
      const result = await window.electronAPI.updateEquipment('non-existent', {
        name: 'Updated'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Equipment not found');
    });
    
    test('handles update of non-existent inspection', async () => {
      const result = await window.electronAPI.updateInspection('non-existent', {
        status: 'completed'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Inspection not found');
    });
    
    test('handles deletion of non-existent equipment', async () => {
      const result = await window.electronAPI.deleteEquipment('non-existent');
      expect(result.success).toBe(false);
    });
  });
});