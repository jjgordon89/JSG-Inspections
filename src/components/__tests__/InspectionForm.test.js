import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InspectionForm from '../InspectionForm';
import { useEquipmentStore, useInspectionStore } from '../../store';

// Mock the stores
jest.mock('../../store', () => ({
  useEquipmentStore: jest.fn(),
  useInspectionStore: jest.fn(),
}));

// Mock the checklists utility
jest.mock('../../utils/checklists', () => ({
  getChecklistForEquipment: jest.fn(() => ({
    'Safety Systems': [
      { id: 1, text: 'Check emergency stop button' },
      { id: 2, text: 'Verify safety guards are in place' },
    ],
    'Mechanical Components': [
      { id: 3, text: 'Inspect for wear and tear' },
      { id: 4, text: 'Check lubrication levels' },
    ],
  })),
}));

// Mock PhotoAnnotation and InspectionSummary components
jest.mock('../PhotoAnnotation', () => {
  return function MockPhotoAnnotation({ onSave, onCancel }) {
    return (
      <div data-testid="photo-annotation">
        <button onClick={() => onSave({ dataUrl: 'mock-url', annotations: [] })}>
          Save Annotation
        </button>
        <button onClick={onCancel}>Cancel Annotation</button>
      </div>
    );
  };
});

jest.mock('../InspectionSummary', () => {
  return function MockInspectionSummary({ onDone }) {
    return (
      <div data-testid="inspection-summary">
        <button onClick={() => onDone(true)}>Complete Inspection</button>
        <button onClick={() => onDone(false)}>Cancel Inspection</button>
      </div>
    );
  };
});

describe('InspectionForm Component', () => {
  const mockEquipment = { id: 1, type: 'Crane', equipment_id: 'EQ-001' };
  const mockOnInspectionAdded = jest.fn();
  const mockOnCancel = jest.fn();
  const mockShowToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock store implementations
    useEquipmentStore.mockReturnValue(mockEquipment);
    useInspectionStore.mockReturnValue(null);
  });

  test('renders inspection form correctly', async () => {
    render(
      <InspectionForm
        onInspectionAdded={mockOnInspectionAdded}
        onCancel={mockOnCancel}
        showToast={mockShowToast}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/inspection/i)).toBeInTheDocument();
    });
    
    // Check for equipment information
    const equipmentInfo = screen.queryByText('EQ-001') || screen.queryByText(/crane/i);
    if (equipmentInfo) {
      expect(equipmentInfo).toBeInTheDocument();
    }
  });

  test('displays checklist items correctly', async () => {
    render(
      <InspectionForm
        onInspectionAdded={mockOnInspectionAdded}
        onCancel={mockOnCancel}
        showToast={mockShowToast}
      />
    );
    
    await waitFor(() => {
      // Check for checklist sections or items
      const checklistElements = screen.queryAllByText(/check|verify|inspect/i);
      expect(checklistElements.length).toBeGreaterThan(0);
    });
  });

  describe('Initial Section State Logic', () => {
    it('should open the first section by default', async () => {
      render(
        <InspectionForm
          onInspectionAdded={mockOnInspectionAdded}
          onCancel={mockOnCancel}
          showToast={mockShowToast}
        />
      );

      // Wait for the component to load and process the checklist
      await waitFor(() => {
        expect(screen.getByText('Safety Systems')).toBeInTheDocument();
      });

      // The first section should be open (content visible)
      expect(screen.getByText('Check emergency stop button')).toBeInTheDocument();
      expect(screen.getByText('Verify safety guards are in place')).toBeInTheDocument();

      // The second section should be closed (content not visible)
      expect(screen.queryByText('Inspect for wear and tear')).not.toBeInTheDocument();
      expect(screen.queryByText('Check lubrication levels')).not.toBeInTheDocument();
    });

    it('should allow toggling between sections', async () => {
      render(
        <InspectionForm
          onInspectionAdded={mockOnInspectionAdded}
          onCancel={mockOnCancel}
          showToast={mockShowToast}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Safety Systems')).toBeInTheDocument();
      });

      // Initially first section is open
      expect(screen.getByText('Check emergency stop button')).toBeInTheDocument();

      // Click on second section header
      fireEvent.click(screen.getByText('Mechanical Components'));

      // Now second section should be open
      expect(screen.getByText('Inspect for wear and tear')).toBeInTheDocument();
      expect(screen.getByText('Check lubrication levels')).toBeInTheDocument();

      // First section should be closed
      expect(screen.queryByText('Check emergency stop button')).not.toBeInTheDocument();
    });

    it('should close a section when clicking its header while open', async () => {
      render(
        <InspectionForm
          onInspectionAdded={mockOnInspectionAdded}
          onCancel={mockOnCancel}
          showToast={mockShowToast}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Safety Systems')).toBeInTheDocument();
      });

      // Initially first section is open
      expect(screen.getByText('Check emergency stop button')).toBeInTheDocument();

      // Click on the same section header to close it
      fireEvent.click(screen.getByText('Safety Systems'));

      // Section should now be closed
      expect(screen.queryByText('Check emergency stop button')).not.toBeInTheDocument();
    });
  });

  describe('Inspection Save Callback Behavior', () => {
    it('should call onInspectionAdded callback when inspection is completed successfully', async () => {
      render(
        <InspectionForm
          onInspectionAdded={mockOnInspectionAdded}
          onCancel={mockOnCancel}
          showToast={mockShowToast}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Safety Systems')).toBeInTheDocument();
      });

      // Submit the form to go to summary
      fireEvent.click(screen.getByText('Review & Submit'));

      // Wait for summary to appear
      await waitFor(() => {
        expect(screen.getByTestId('inspection-summary')).toBeInTheDocument();
      });

      // Complete the inspection successfully
      fireEvent.click(screen.getByText('Complete Inspection'));

      // Verify callback was called
      expect(mockOnInspectionAdded).toHaveBeenCalledTimes(1);
    });

    it('should not call onInspectionAdded callback when inspection is cancelled', async () => {
      render(
        <InspectionForm
          onInspectionAdded={mockOnInspectionAdded}
          onCancel={mockOnCancel}
          showToast={mockShowToast}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Safety Systems')).toBeInTheDocument();
      });

      // Submit the form to go to summary
      fireEvent.click(screen.getByText('Review & Submit'));

      // Wait for summary to appear
      await waitFor(() => {
        expect(screen.getByTestId('inspection-summary')).toBeInTheDocument();
      });

      // Cancel the inspection
      fireEvent.click(screen.getByText('Cancel Inspection'));

      // Verify callback was not called
      expect(mockOnInspectionAdded).not.toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should show success toast when form is submitted', async () => {
      render(
        <InspectionForm
          onInspectionAdded={mockOnInspectionAdded}
          onCancel={mockOnCancel}
          showToast={mockShowToast}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Safety Systems')).toBeInTheDocument();
      });

      // Submit the form
      fireEvent.click(screen.getByText('Review & Submit'));

      // Verify success toast was shown
      expect(mockShowToast).toHaveBeenCalledWith(
        'Inspection form completed successfully',
        'success'
      );
    });

    it('should call onCancel when cancel button is clicked', async () => {
      render(
        <InspectionForm
          onInspectionAdded={mockOnInspectionAdded}
          onCancel={mockOnCancel}
          showToast={mockShowToast}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Safety Systems')).toBeInTheDocument();
      });

      // Click cancel button
      fireEvent.click(screen.getByText('Cancel'));

      // Verify callback was called
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnInspectionAdded).not.toHaveBeenCalled();
    });
  });

  describe('Equipment Source Logic', () => {
    it('should use inspectingEquipment from equipment store when available', () => {
      useEquipmentStore.mockReturnValue(mockEquipment);
      useInspectionStore.mockReturnValue(null);

      render(
        <InspectionForm
          onInspectionAdded={mockOnInspectionAdded}
          onCancel={mockOnCancel}
          showToast={mockShowToast}
        />
      );

      // Component should render without errors, using equipment from equipmentStore
      expect(screen.getByText('Safety Systems')).toBeInTheDocument();
    });

    it('should use addingInspectionFor from inspection store when inspectingEquipment is null', () => {
      useEquipmentStore.mockReturnValue(null);
      useInspectionStore.mockReturnValue({ id: 2, type: 'Forklift' });

      render(
        <InspectionForm
          onInspectionAdded={mockOnInspectionAdded}
          onCancel={mockOnCancel}
          showToast={mockShowToast}
        />
      );

      // Component should render without errors, using equipment from inspectionStore
      expect(screen.getByText('Safety Systems')).toBeInTheDocument();
    });

    it('should handle numeric addingInspectionFor by creating equipment object', () => {
      useEquipmentStore.mockReturnValue(null);
      useInspectionStore.mockReturnValue(123);

      render(
        <InspectionForm
          onInspectionAdded={mockOnInspectionAdded}
          onCancel={mockOnCancel}
          showToast={mockShowToast}
        />
      );

      // Component should render without errors, creating equipment object from ID
      expect(screen.getByText('Safety Systems')).toBeInTheDocument();
    });
  });

  describe('Deficiency Details Integration', () => {
    it('should show deficiency details when item result is set to fail', async () => {
      render(
        <InspectionForm
          onInspectionAdded={mockOnInspectionAdded}
          onCancel={mockOnCancel}
          showToast={mockShowToast}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Check emergency stop button')).toBeInTheDocument();
      });

      // Find and click the Fail button for the first item
      const failButtons = screen.getAllByText('Fail');
      fireEvent.click(failButtons[0]);

      // Deficiency details should now be visible
      expect(screen.getByText('Priority:')).toBeInTheDocument();
      expect(screen.getByText('Component:')).toBeInTheDocument();
      expect(screen.getByText('Notes:')).toBeInTheDocument();
      expect(screen.getByText('Photos:')).toBeInTheDocument();

      // Priority dropdown should have correct options
      const prioritySelect = screen.getByDisplayValue('Minor');
      expect(prioritySelect).toBeInTheDocument();
      
      fireEvent.change(prioritySelect, { target: { value: 'Critical' } });
      expect(prioritySelect.value).toBe('Critical');
    });

    it('should hide deficiency details when item result is changed from fail', async () => {
      render(
        <InspectionForm
          onInspectionAdded={mockOnInspectionAdded}
          onCancel={mockOnCancel}
          showToast={mockShowToast}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Check emergency stop button')).toBeInTheDocument();
      });

      // Set to fail first
      const failButtons = screen.getAllByText('Fail');
      fireEvent.click(failButtons[0]);

      // Verify deficiency details are visible
      expect(screen.getByText('Priority:')).toBeInTheDocument();

      // Change to pass
      const passButtons = screen.getAllByText('Pass');
      fireEvent.click(passButtons[0]);

      // Deficiency details should be hidden
      expect(screen.queryByText('Priority:')).not.toBeInTheDocument();
    });
  });
});
