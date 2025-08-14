import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Scheduler from '../Scheduler';

// Mock the window.api that Electron's preload script would provide
const mockApi = {
  all: jest.fn(),
  run: jest.fn(),
};

// Ensure window.api is properly set up
Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true
});

const mockEquipment = [
  { id: 1, equipment_id: 'EQ-001', type: 'Crane' },
  { id: 2, equipment_id: 'EQ-002', type: 'Forklift' },
];

const mockScheduledInspections = [
  { id: 101, equipment_id: 1, equipmentIdentifier: 'EQ-001', scheduled_date: '2025-10-01', assigned_inspector: 'John Doe', status: 'scheduled' },
  { id: 102, equipment_id: 2, equipmentIdentifier: 'EQ-002', scheduled_date: '2025-10-05', assigned_inspector: 'Jane Smith', status: 'scheduled' },
];

describe('Scheduler Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockApi.all.mockClear();
    mockApi.run.mockClear();

    // Default mock implementations
    mockApi.all.mockImplementation(async (sql) => {
      if (sql.includes('FROM equipment')) {
        return Promise.resolve(mockEquipment);
      }
      if (sql.includes('FROM scheduled_inspections')) {
        return Promise.resolve(mockScheduledInspections);
      }
      return Promise.resolve([]);
    });
    mockApi.run.mockResolvedValue({ changes: 1 });
  });

  test('renders the scheduler and fetches initial data', async () => {
    render(<Scheduler />);

    expect(screen.getByText('Inspection Scheduler')).toBeInTheDocument();

    // Wait for the data to be fetched and displayed
    await waitFor(() => {
      expect(mockApi.all).toHaveBeenCalledWith(expect.stringContaining('FROM scheduled_inspections'));
      expect(mockApi.all).toHaveBeenCalledWith('SELECT * FROM equipment');
    });

    // Check if the fetched inspections are rendered
    await waitFor(() => {
      expect(screen.getByText('Equipment: EQ-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Equipment: EQ-002')).toBeInTheDocument();
  });

  test('allows a user to schedule a new inspection', async () => {
    render(<Scheduler />);
    await waitFor(() => expect(mockApi.all).toHaveBeenCalledTimes(2)); // wait for initial load

    // Fill out the form
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } }); // Select EQ-001
    const dateInput = document.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: '2025-12-25' } });
    fireEvent.change(screen.getByPlaceholderText('Assigned Inspector'), { target: { value: 'Test Inspector' } });

    // Submit the form
    const form = screen.getByRole('form') || document.querySelector('form');
    console.log('Form found:', form);
    fireEvent.submit(form);

    // Check if the API was called with the correct parameters
    await waitFor(() => {
      expect(mockApi.run).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    // Get the actual call arguments
    const lastCall = mockApi.run.mock.calls[mockApi.run.mock.calls.length - 1];
    expect(lastCall[0]).toBe('INSERT INTO scheduled_inspections (equipment_id, scheduled_date, assigned_inspector, status, equipmentIdentifier) VALUES (?, ?, ?, ?, ?)');
    expect(lastCall[1]).toEqual([1, '2025-12-25', 'Test Inspector', 'scheduled', 'EQ-001']);

    // Check if the list is refreshed
    expect(mockApi.all).toHaveBeenCalledWith(expect.stringContaining('FROM scheduled_inspections'));
  });

  test('allows a user to delete a scheduled inspection', async () => {
    // Mock window.confirm
    global.window.confirm = jest.fn(() => true);

    render(<Scheduler />);
    
    // Wait for both API calls to complete
    await waitFor(() => {
      expect(mockApi.all).toHaveBeenCalledWith('SELECT * FROM scheduled_inspections ORDER BY scheduled_date');
      expect(mockApi.all).toHaveBeenCalledWith('SELECT * FROM equipment');
    });
    
    // Wait for the content to be rendered
    await waitFor(() => expect(screen.getByText('Equipment: EQ-001')).toBeInTheDocument());

    // Find the delete button for the first inspection and click it
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(global.window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this scheduled inspection?');

    // Check if the API was called to delete the item
    await waitFor(() => {
      expect(mockApi.run).toHaveBeenCalledWith(
        'DELETE FROM scheduled_inspections WHERE id = ?',
        [101]
      );
    });
  });
});
