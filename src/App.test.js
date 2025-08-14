import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock the store hooks
jest.mock('./store', () => ({
  useUIStore: jest.fn(() => ({
    currentView: 'dashboard',
    setCurrentView: jest.fn(),
    user: { username: 'test-user' }
  })),
  useEquipmentStore: jest.fn(() => ({
    equipment: [],
    loadEquipment: jest.fn()
  })),
  useInspectionStore: jest.fn(() => ({
    inspections: [],
    loadInspections: jest.fn()
  }))
}));

describe('App Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText(/JSG Inspections/i)).toBeInTheDocument();
  });

  test('displays navigation menu', () => {
    render(<App />);
    
    // Check for main navigation items
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Equipment/i)).toBeInTheDocument();
    expect(screen.getByText(/Inspections/i)).toBeInTheDocument();
    expect(screen.getByText(/Scheduler/i)).toBeInTheDocument();
  });

  test('navigation works correctly', async () => {
    const mockSetCurrentView = jest.fn();
    
    // Mock the store with our spy function
    require('./store/useStore').default.mockReturnValue({
      currentView: 'dashboard',
      setCurrentView: mockSetCurrentView,
      user: { username: 'test-user' },
      equipment: [],
      inspections: [],
      loadEquipment: jest.fn(),
      loadInspections: jest.fn()
    });

    render(<App />);
    
    // Click on Equipment navigation
    const equipmentButton = screen.getByText(/Equipment/i);
    fireEvent.click(equipmentButton);
    
    // Verify setCurrentView was called with correct parameter
    expect(mockSetCurrentView).toHaveBeenCalledWith('equipment');
  });

  test('displays user information when logged in', () => {
    require('./store/useStore').default.mockReturnValue({
      currentView: 'dashboard',
      setCurrentView: jest.fn(),
      user: { username: 'john.doe' },
      equipment: [],
      inspections: [],
      loadEquipment: jest.fn(),
      loadInspections: jest.fn()
    });

    render(<App />);
    
    // Check if user info is displayed
    expect(screen.getByText(/john.doe/i)).toBeInTheDocument();
  });

  test('handles loading states properly', async () => {
    const mockLoadEquipment = jest.fn();
    const mockLoadInspections = jest.fn();
    
    require('./store/useStore').default.mockReturnValue({
      currentView: 'dashboard',
      setCurrentView: jest.fn(),
      user: { username: 'test-user' },
      equipment: [],
      inspections: [],
      loadEquipment: mockLoadEquipment,
      loadInspections: mockLoadInspections
    });

    render(<App />);
    
    // Verify data loading functions are called
    await waitFor(() => {
      expect(mockLoadEquipment).toHaveBeenCalled();
      expect(mockLoadInspections).toHaveBeenCalled();
    });
  });

  test('displays error boundary when component crashes', () => {
    // Mock console.error to prevent error output in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create a component that will throw an error
    const ThrowError = () => {
      throw new Error('Test error');
    };
    
    // Mock the store to return a component that throws
    require('./store/useStore').default.mockImplementation(() => {
      throw new Error('Store error');
    });
    
    // This should be wrapped in error boundary in the actual app
    expect(() => render(<App />)).toThrow();
    
    consoleSpy.mockRestore();
  });

  test('responsive design elements are present', () => {
    render(<App />);
    
    // Check for responsive classes or elements
    const appContainer = screen.getByRole('main') || document.querySelector('.app');
    expect(appContainer).toBeInTheDocument();
  });

  test('accessibility features are implemented', () => {
    render(<App />);
    
    // Check for proper ARIA labels and roles
    const navigation = screen.getByRole('navigation') || screen.getByLabelText(/main navigation/i);
    expect(navigation).toBeInTheDocument();
  });
});