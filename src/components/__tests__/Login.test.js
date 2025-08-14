import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Login from '../Login';

// Mock the store
const mockUIStore = {
  setCurrentView: jest.fn(),
  setUser: jest.fn(),
  showToast: jest.fn()
};

jest.mock('../../store', () => ({
  useUIStore: jest.fn(() => mockUIStore)
}));

// Mock electron API
Object.defineProperty(window, 'electronAPI', {
  value: {
    authenticateUser: jest.fn(),
    logAuditEvent: jest.fn()
  },
  writable: true
});

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form correctly', () => {
    render(<Login />);
    
    expect(screen.getByText(/login/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i) || screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i) || screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('handles user input correctly', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const usernameInput = screen.getByLabelText(/username/i) || screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i) || screen.getByPlaceholderText(/password/i);
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'testpass');
    
    expect(usernameInput).toHaveValue('testuser');
    expect(passwordInput).toHaveValue('testpass');
  });

  test('handles successful login', async () => {
    const user = userEvent.setup();
    window.electronAPI.authenticateUser.mockResolvedValue({
      success: true,
      user: { id: 1, username: 'testuser', role: 'inspector' }
    });
    
    render(<Login />);
    
    const usernameInput = screen.getByLabelText(/username/i) || screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i) || screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'testpass');
    await user.click(loginButton);
    
    await waitFor(() => {
      expect(window.electronAPI.authenticateUser).toHaveBeenCalledWith('testuser', 'testpass');
    });
  });

  test('handles login failure', async () => {
    const user = userEvent.setup();
    window.electronAPI.authenticateUser.mockResolvedValue({
      success: false,
      message: 'Invalid credentials'
    });
    
    render(<Login />);
    
    const usernameInput = screen.getByLabelText(/username/i) || screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i) || screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    await user.type(usernameInput, 'wronguser');
    await user.type(passwordInput, 'wrongpass');
    await user.click(loginButton);
    
    await waitFor(() => {
      expect(window.electronAPI.authenticateUser).toHaveBeenCalledWith('wronguser', 'wrongpass');
    });
  });

  test('prevents submission with empty fields', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const loginButton = screen.getByRole('button', { name: /login/i });
    await user.click(loginButton);
    
    // Should not call authenticate with empty fields
    expect(window.electronAPI.authenticateUser).not.toHaveBeenCalled();
  });
});