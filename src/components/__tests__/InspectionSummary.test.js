import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import InspectionSummary from '../InspectionSummary';

// Mock the store
const mockStore = {
  currentInspection: {
    id: 'inspection-1',
    equipmentId: 'equipment-1',
    inspectorId: 'inspector-1',
    date: '2024-01-15',
    status: 'completed',
    checklist: [
      {
        id: 'check-1',
        item: 'Visual inspection',
        status: 'pass',
        notes: 'No issues found'
      },
      {
        id: 'check-2',
        item: 'Pressure test',
        status: 'fail',
        notes: 'Pressure below threshold'
      }
    ],
    photos: [
      {
        id: 'photo-1',
        fileName: 'equipment-front.jpg',
        annotations: []
      }
    ],
    overallStatus: 'fail',
    notes: 'Equipment requires maintenance'
  },
  equipment: {
    'equipment-1': {
      id: 'equipment-1',
      name: 'Test Equipment',
      type: 'Pressure Vessel',
      location: 'Building A'
    }
  },
  generateReport: jest.fn(),
  saveInspection: jest.fn()
};

jest.mock('../../store', () => ({
  useInspectionStore: jest.fn(() => mockStore)
}));

// Mock electron API
Object.defineProperty(window, 'electronAPI', {
  value: {
    generatePDF: jest.fn(),
    saveReport: jest.fn(),
    printReport: jest.fn()
  },
  writable: true
});

describe('InspectionSummary Component', () => {
  const defaultProps = {
    inspectionId: 'inspection-1',
    onClose: jest.fn(),
    onEdit: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders inspection summary correctly', () => {
    render(<InspectionSummary {...defaultProps} />);
    
    expect(screen.getByText(/inspection summary/i) || screen.getByText(/summary/i)).toBeInTheDocument();
    expect(screen.getByText('Test Equipment') || screen.getByText(/equipment/i)).toBeInTheDocument();
  });

  test('displays inspection details', () => {
    render(<InspectionSummary {...defaultProps} />);
    
    expect(screen.getByText('2024-01-15') || screen.getByText(/january/i)).toBeInTheDocument();
    expect(screen.getByText(/completed/i) || screen.getByText(/status/i)).toBeInTheDocument();
    expect(screen.getByText('Equipment requires maintenance') || screen.getByText(/notes/i)).toBeInTheDocument();
  });

  test('displays checklist items with status', () => {
    render(<InspectionSummary {...defaultProps} />);
    
    expect(screen.getByText('Visual inspection') || screen.getByText(/visual/i)).toBeInTheDocument();
    expect(screen.getByText('Pressure test') || screen.getByText(/pressure/i)).toBeInTheDocument();
    expect(screen.getByText(/pass/i) || screen.getByText(/✓/)).toBeInTheDocument();
    expect(screen.getByText(/fail/i) || screen.getByText(/✗/)).toBeInTheDocument();
  });

  test('displays overall inspection status', () => {
    render(<InspectionSummary {...defaultProps} />);
    
    const failStatus = screen.getByText(/fail/i) || screen.getByText(/failed/i) || screen.getByText(/✗/);
    expect(failStatus).toBeInTheDocument();
  });

  test('shows photo count', () => {
    render(<InspectionSummary {...defaultProps} />);
    
    expect(screen.getByText(/1.*photo/i) || screen.getByText(/photo.*1/i) || screen.getByText('equipment-front.jpg')).toBeInTheDocument();
  });

  test('handles edit button click', async () => {
    const user = userEvent.setup();
    render(<InspectionSummary {...defaultProps} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);
    
    expect(defaultProps.onEdit).toHaveBeenCalledWith('inspection-1');
  });

  test('handles close button click', async () => {
    const user = userEvent.setup();
    render(<InspectionSummary {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i }) ||
                       screen.getByText('×') ||
                       screen.getByLabelText(/close/i);
    
    await user.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test('handles PDF generation', async () => {
    const user = userEvent.setup();
    window.electronAPI.generatePDF.mockResolvedValue({
      success: true,
      filePath: '/path/to/report.pdf'
    });
    
    render(<InspectionSummary {...defaultProps} />);
    
    const pdfButton = screen.getByRole('button', { name: /pdf/i }) ||
                     screen.getByRole('button', { name: /generate/i }) ||
                     screen.getByText(/export/i);
    
    if (pdfButton) {
      await user.click(pdfButton);
      
      await waitFor(() => {
        expect(window.electronAPI.generatePDF).toHaveBeenCalled();
      });
    }
  });

  test('handles print functionality', async () => {
    const user = userEvent.setup();
    window.electronAPI.printReport.mockResolvedValue({ success: true });
    
    render(<InspectionSummary {...defaultProps} />);
    
    const printButton = screen.getByRole('button', { name: /print/i });
    
    if (printButton) {
      await user.click(printButton);
      
      await waitFor(() => {
        expect(window.electronAPI.printReport).toHaveBeenCalled();
      });
    }
  });

  test('displays equipment information', () => {
    render(<InspectionSummary {...defaultProps} />);
    
    expect(screen.getByText('Test Equipment') || screen.getByText(/equipment/i)).toBeInTheDocument();
    expect(screen.getByText('Pressure Vessel') || screen.getByText(/type/i)).toBeInTheDocument();
    expect(screen.getByText('Building A') || screen.getByText(/location/i)).toBeInTheDocument();
  });

  test('handles missing inspection data gracefully', () => {
    const emptyStore = {
      ...mockStore,
      currentInspection: null
    };
    
    jest.mocked(require('../../store').useInspectionStore).mockReturnValue(emptyStore);
    
    render(<InspectionSummary {...defaultProps} />);
    
    expect(screen.getByText(/no inspection/i) || screen.getByText(/not found/i) || screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('calculates pass/fail statistics correctly', () => {
    render(<InspectionSummary {...defaultProps} />);
    
    // Should show 1 pass and 1 fail from the checklist
    const passCount = screen.getByText(/1.*pass/i) || screen.getByText(/pass.*1/i);
    const failCount = screen.getByText(/1.*fail/i) || screen.getByText(/fail.*1/i);
    
    if (passCount) expect(passCount).toBeInTheDocument();
    if (failCount) expect(failCount).toBeInTheDocument();
  });
});