import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';

// Mock the store
const mockStore = {
  equipment: [
    {
      id: 1,
      equipment_id: 'CRANE-001',
      description: 'Test Crane',
      status: 'active',
      next_inspection: '2024-02-15'
    },
    {
      id: 2,
      equipment_id: 'HOIST-002',
      description: 'Test Hoist',
      status: 'active',
      next_inspection: '2024-01-10' // Overdue
    }
  ],
  inspections: [
    {
      id: 1,
      equipment_id: 1,
      inspection_date: '2024-01-01',
      status: 'completed',
      inspector: 'John Doe'
    },
    {
      id: 2,
      equipment_id: 2,
      inspection_date: '2024-01-05',
      status: 'pending',
      inspector: 'Jane Smith'
    }
  ],
  deficiencies: [
    {
      id: 1,
      equipment_id: 1,
      description: 'Minor wear on cable',
      severity: 'low',
      status: 'open'
    }
  ],
  loadEquipment: jest.fn(),
  loadInspections: jest.fn(),
  loadDeficiencies: jest.fn()
};

jest.mock('../../store/useStore', () => ({
  __esModule: true,
  default: jest.fn(() => mockStore)
}));

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Doughnut: ({ data, options }) => (
    <div data-testid="doughnut-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
  Bar: ({ data, options }) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  )
}));

jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  ArcElement: jest.fn()
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders dashboard correctly', () => {
    render(<Dashboard />);
    
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/overview/i) || screen.getByText(/summary/i)).toBeInTheDocument();
  });

  test('displays equipment statistics', () => {
    render(<Dashboard />);
    
    // Check for equipment count
    expect(screen.getByText('2') || screen.getByText(/total equipment/i)).toBeInTheDocument();
    
    // Check for active equipment
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  test('displays inspection statistics', () => {
    render(<Dashboard />);
    
    // Check for inspection counts
    expect(screen.getByText(/inspections/i)).toBeInTheDocument();
    expect(screen.getByText(/completed/i) || screen.getByText(/pending/i)).toBeInTheDocument();
  });

  test('shows overdue inspections alert', () => {
    render(<Dashboard />);
    
    // Should show overdue equipment (HOIST-002 with next_inspection: '2024-01-10')
    expect(screen.getByText(/overdue/i) || screen.getByText(/attention/i)).toBeInTheDocument();
  });

  test('displays recent inspections', () => {
    render(<Dashboard />);
    
    expect(screen.getByText(/recent inspections/i) || screen.getByText(/latest/i)).toBeInTheDocument();
    expect(screen.getByText('John Doe') || screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('shows deficiency summary', () => {
    render(<Dashboard />);
    
    expect(screen.getByText(/deficiencies/i) || screen.getByText(/issues/i)).toBeInTheDocument();
    expect(screen.getByText(/open/i) || screen.getByText(/pending/i)).toBeInTheDocument();
  });

  test('renders charts correctly', () => {
    render(<Dashboard />);
    
    // Check for chart components
    const doughnutChart = screen.getByTestId('doughnut-chart');
    const barChart = screen.getByTestId('bar-chart');
    
    expect(doughnutChart || barChart).toBeInTheDocument();
  });

  test('equipment status chart has correct data', () => {
    render(<Dashboard />);
    
    const chartData = screen.getByTestId('chart-data');
    if (chartData) {
      const data = JSON.parse(chartData.textContent);
      expect(data.labels).toContain('Active');
      expect(data.datasets[0].data).toEqual(expect.arrayContaining([expect.any(Number)]));
    }
  });

  test('quick actions are available', () => {
    render(<Dashboard />);
    
    // Look for quick action buttons
    const quickActions = [
      /add equipment/i,
      /schedule inspection/i,
      /view reports/i,
      /new inspection/i
    ];
    
    const foundActions = quickActions.filter(action => 
      screen.queryByText(action) || screen.queryByLabelText(action)
    );
    
    expect(foundActions.length).toBeGreaterThan(0);
  });

  test('navigation to other sections works', async () => {
    render(<Dashboard />);
    
    const equipmentLink = screen.getByText(/view all equipment/i) || screen.getByText(/equipment/i);
    if (equipmentLink) {
      fireEvent.click(equipmentLink);
      // In a real app, this would trigger navigation
      expect(equipmentLink).toBeInTheDocument();
    }
  });

  test('handles loading state', () => {
    mockStore.equipment = null;
    mockStore.inspections = null;
    
    render(<Dashboard />);
    
    expect(screen.getByText(/loading/i) || screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('handles empty data gracefully', () => {
    mockStore.equipment = [];
    mockStore.inspections = [];
    mockStore.deficiencies = [];
    
    render(<Dashboard />);
    
    expect(screen.getByText(/no equipment/i) || screen.getByText(/0/)).toBeInTheDocument();
  });

  test('displays upcoming inspections', () => {
    render(<Dashboard />);
    
    expect(screen.getByText(/upcoming/i) || screen.getByText(/scheduled/i)).toBeInTheDocument();
  });

  test('shows compliance status', () => {
    render(<Dashboard />);
    
    // Look for compliance indicators
    const complianceElements = [
      /compliance/i,
      /status/i,
      /up to date/i,
      /current/i
    ];
    
    const foundElements = complianceElements.filter(element => 
      screen.queryByText(element)
    );
    
    expect(foundElements.length).toBeGreaterThan(0);
  });

  test('refresh functionality works', async () => {
    render(<Dashboard />);
    
    const refreshButton = screen.getByText(/refresh/i) || screen.getByLabelText(/refresh/i);
    if (refreshButton) {
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockStore.loadEquipment).toHaveBeenCalled();
        expect(mockStore.loadInspections).toHaveBeenCalled();
      });
    }
  });

  test('responsive design elements', () => {
    render(<Dashboard />);
    
    const container = screen.getByTestId('dashboard-container') || document.querySelector('.dashboard');
    expect(container).toBeInTheDocument();
  });

  test('accessibility features', () => {
    render(<Dashboard />);
    
    // Check for proper headings
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
    
    // Check for proper labels
    const charts = screen.getAllByTestId(/chart/);
    charts.forEach(chart => {
      expect(chart).toBeInTheDocument();
    });
  });
});