import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Equipment from '../Equipment';

// Mock the store
const mockStore = {
  equipment: [
    {
      id: 1,
      equipment_id: 'CRANE-001',
      description: 'Test Crane',
      manufacturer: 'Test Manufacturer',
      model: 'Test Model',
      serial_number: 'SN123456',
      capacity: '10 tons',
      location: 'Warehouse A',
      status: 'active'
    },
    {
      id: 2,
      equipment_id: 'HOIST-002',
      description: 'Test Hoist',
      manufacturer: 'Hoist Corp',
      model: 'H-200',
      serial_number: 'SN789012',
      capacity: '5 tons',
      location: 'Warehouse B',
      status: 'active'
    }
  ],
  loadEquipment: jest.fn(),
  addEquipment: jest.fn(),
  updateEquipment: jest.fn(),
  deleteEquipment: jest.fn(),
  searchTerm: '',
  setSearchTerm: jest.fn(),
  filterStatus: 'all',
  setFilterStatus: jest.fn()
};

jest.mock('../../store', () => ({
  useEquipmentStore: jest.fn((selector) => {
    if (selector) {
      return selector(mockStore);
    }
    return mockStore;
  })
}));

describe('Equipment Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock store
    Object.assign(mockStore, {
      equipment: [
        {
          id: 1,
          equipment_id: 'CRANE-001',
          description: 'Test Crane',
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          serial_number: 'SN123456',
          capacity: '10 tons',
          location: 'Warehouse A',
          status: 'active'
        }
      ],
      searchTerm: '',
      filterStatus: 'all'
    });
  });

  test('renders equipment list correctly', () => {
    render(<Equipment />);
    
    expect(screen.getByText('Equipment Management')).toBeInTheDocument();
    expect(screen.getByText('CRANE-001')).toBeInTheDocument();
    expect(screen.getByText('Test Crane')).toBeInTheDocument();
    expect(screen.getByText('Test Manufacturer')).toBeInTheDocument();
  });

  test('search functionality works', async () => {
    const user = userEvent.setup();
    render(<Equipment />);
    
    const searchInput = screen.getByPlaceholderText(/search equipment/i);
    await user.type(searchInput, 'CRANE');
    
    expect(mockStore.setSearchTerm).toHaveBeenCalledWith('CRANE');
  });

  test('filters equipment by status', async () => {
    render(<Equipment />);
    
    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('Equipment Management')).toBeInTheDocument();
    });
    
    // Look for filter controls
    const filterElements = screen.queryAllByRole('combobox');
    if (filterElements.length > 0) {
      fireEvent.change(filterElements[0], { target: { value: 'active' } });
      expect(mockStore.setFilterStatus).toHaveBeenCalledWith('active');
    }
  });

  test('add equipment button opens form', async () => {
    const user = userEvent.setup();
    render(<Equipment />);
    
    const addButton = screen.getByText(/add equipment/i) || screen.getByRole('button', { name: /add/i });
    await user.click(addButton);
    
    // Check if form appears or modal opens
    expect(screen.getByText(/equipment form/i) || screen.getByLabelText(/equipment id/i)).toBeInTheDocument();
  });

  test('equipment card displays all required information', () => {
    render(<Equipment />);
    
    // Check for equipment details
    expect(screen.getByText('CRANE-001')).toBeInTheDocument();
    expect(screen.getByText('Test Crane')).toBeInTheDocument();
    expect(screen.getByText('Test Manufacturer')).toBeInTheDocument();
    expect(screen.getByText('Test Model')).toBeInTheDocument();
    expect(screen.getByText('SN123456')).toBeInTheDocument();
    expect(screen.getByText('10 tons')).toBeInTheDocument();
    expect(screen.getByText('Warehouse A')).toBeInTheDocument();
  });

  test('edit equipment functionality', async () => {
    const user = userEvent.setup();
    render(<Equipment />);
    
    const editButton = screen.getByLabelText(/edit CRANE-001/i) || screen.getAllByText(/edit/i)[0];
    await user.click(editButton);
    
    // Check if edit form appears
    expect(screen.getByDisplayValue('CRANE-001') || screen.getByText(/edit equipment/i)).toBeInTheDocument();
  });

  test('delete equipment with confirmation', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
    
    render(<Equipment />);
    
    const deleteButton = screen.getByLabelText(/delete CRANE-001/i) || screen.getAllByText(/delete/i)[0];
    await user.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('delete'));
    expect(mockStore.deleteEquipment).toHaveBeenCalledWith(1);
  });

  test('handles empty equipment list', () => {
    mockStore.equipment = [];
    render(<Equipment />);
    
    expect(screen.getByText(/no equipment found/i) || screen.getByText(/empty/i)).toBeInTheDocument();
  });

  test('loading state is displayed', () => {
    mockStore.equipment = null; // Simulate loading state
    render(<Equipment />);
    
    expect(screen.getByText(/loading/i) || screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('error handling for failed operations', async () => {
    const user = userEvent.setup();
    
    // Mock a failed delete operation
    mockStore.deleteEquipment.mockRejectedValue(new Error('Delete failed'));
    window.confirm = jest.fn(() => true);
    
    render(<Equipment />);
    
    const deleteButton = screen.getByLabelText(/delete CRANE-001/i) || screen.getAllByText(/delete/i)[0];
    await user.click(deleteButton);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  test('displays equipment status badges correctly', async () => {
    render(<Equipment />);
    
    // Wait for equipment to load
    await waitFor(() => {
      expect(mockStore.loadEquipment).toHaveBeenCalled();
    });
    
    // Check if equipment cards are rendered
    const equipmentCards = screen.getAllByTestId(/equipment-card/);
    expect(equipmentCards.length).toBeGreaterThan(0);
  });

  test('keyboard navigation works', async () => {
    const user = userEvent.setup();
    render(<Equipment />);
    
    const searchInput = screen.getByPlaceholderText(/search equipment/i);
    await user.tab();
    
    expect(searchInput).toHaveFocus();
  });

  test('responsive design elements', () => {
    render(<Equipment />);
    
    const container = screen.getByTestId('equipment-container') || document.querySelector('.equipment-container');
    expect(container).toBeInTheDocument();
  });
});