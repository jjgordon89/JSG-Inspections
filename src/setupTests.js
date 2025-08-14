// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock electron APIs for testing
Object.defineProperty(window, 'electronAPI', {
  value: {
    // Mock database operations
    runQuery: jest.fn(),
    getAllQuery: jest.fn(),
    getQuery: jest.fn(),
    
    // Mock file operations
    selectFile: jest.fn(),
    openFile: jest.fn(),
    saveFile: jest.fn(),
    
    // Mock system operations
    showMessageBox: jest.fn(),
    showErrorBox: jest.fn(),
    
    // Mock audit logging
    logAuditEvent: jest.fn(),
    
    // Mock user context
    getUserContext: jest.fn(() => Promise.resolve({
      username: 'test-user',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent'
    }))
  },
  writable: true
});

// Mock window.api for secure operations
Object.defineProperty(window, 'api', {
  value: {
    secure: {
      equipment: {
        getAll: jest.fn(() => Promise.resolve([
          {
            id: 1,
            equipment_id: 'CRANE-001',
            type: 'Overhead Crane',
            manufacturer: 'Test Manufacturer',
            model: 'Test Model',
            serial_number: 'SN123456',
            capacity: '5 tons',
            status: 'active',
            location: 'Warehouse A',
            installation_date: '2023-01-15'
          }
        ])),
        create: jest.fn(() => Promise.resolve({ success: true })),
        update: jest.fn(() => Promise.resolve({ success: true })),
        delete: jest.fn(() => Promise.resolve({ success: true }))
      }
    },
    equipment: {
      delete: jest.fn(() => Promise.resolve({ success: true })),
      getByEquipmentId: jest.fn(() => Promise.resolve({
        id: 1,
        equipmentId: 'CRANE-001',
        name: 'Test Crane',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        serialNumber: 'SN123456',
        capacity: '10 tons',
        location: 'Warehouse A',
        status: 'Active'
      }))
    }
  },
  writable: true
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Suppress console warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});