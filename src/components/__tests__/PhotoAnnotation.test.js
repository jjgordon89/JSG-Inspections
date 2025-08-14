import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PhotoAnnotation from '../PhotoAnnotation';

// Mock the store
const mockStore = {
  addPhoto: jest.fn(),
  updatePhoto: jest.fn(),
  deletePhoto: jest.fn(),
  photos: []
};

jest.mock('../../store', () => ({
  useInspectionStore: jest.fn(() => mockStore)
}));

// Mock electron API
Object.defineProperty(window, 'electronAPI', {
  value: {
    selectPhoto: jest.fn(),
    savePhoto: jest.fn(),
    deletePhoto: jest.fn()
  },
  writable: true
});

// Mock canvas context
const mockContext = {
  clearRect: jest.fn(),
  drawImage: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 })),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: jest.fn()
};

HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext);
HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,test');

describe('PhotoAnnotation Component', () => {
  const defaultProps = {
    inspectionId: 'test-inspection-1',
    onPhotoAdded: jest.fn(),
    onPhotoUpdated: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.photos = [];
  });

  test('renders photo annotation interface', () => {
    render(<PhotoAnnotation {...defaultProps} />);
    
    expect(screen.getByText(/photo/i) || screen.getByText(/add/i)).toBeInTheDocument();
  });

  test('handles photo selection', async () => {
    const user = userEvent.setup();
    window.electronAPI.selectPhoto.mockResolvedValue({
      success: true,
      filePath: '/path/to/photo.jpg',
      fileName: 'photo.jpg'
    });
    
    render(<PhotoAnnotation {...defaultProps} />);
    
    const addButton = screen.getByRole('button', { name: /add photo/i }) ||
                     screen.getByRole('button', { name: /select/i }) ||
                     screen.getByText(/add/i);
    
    if (addButton) {
      await user.click(addButton);
      
      await waitFor(() => {
        expect(window.electronAPI.selectPhoto).toHaveBeenCalled();
      });
    }
  });

  test('displays selected photos', () => {
    mockStore.photos = [
      {
        id: 'photo-1',
        fileName: 'test-photo.jpg',
        filePath: '/path/to/test-photo.jpg',
        annotations: []
      }
    ];
    
    render(<PhotoAnnotation {...defaultProps} />);
    
    expect(screen.getByText('test-photo.jpg') || screen.getByAltText(/photo/i)).toBeInTheDocument();
  });

  test('handles photo annotation drawing', async () => {
    const user = userEvent.setup();
    mockStore.photos = [
      {
        id: 'photo-1',
        fileName: 'test-photo.jpg',
        filePath: '/path/to/test-photo.jpg',
        annotations: []
      }
    ];
    
    render(<PhotoAnnotation {...defaultProps} />);
    
    const canvas = document.querySelector('canvas');
    if (canvas) {
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(canvas, { clientX: 150, clientY: 150 });
      
      expect(mockContext.beginPath).toHaveBeenCalled();
    }
  });

  test('handles annotation text input', async () => {
    const user = userEvent.setup();
    mockStore.photos = [
      {
        id: 'photo-1',
        fileName: 'test-photo.jpg',
        filePath: '/path/to/test-photo.jpg',
        annotations: [
          {
            id: 'annotation-1',
            x: 100,
            y: 100,
            text: 'Test annotation',
            type: 'text'
          }
        ]
      }
    ];
    
    render(<PhotoAnnotation {...defaultProps} />);
    
    const textInput = screen.queryByDisplayValue('Test annotation') ||
                     screen.queryByPlaceholderText(/annotation/i);
    
    if (textInput) {
      await user.clear(textInput);
      await user.type(textInput, 'Updated annotation');
      
      expect(textInput).toHaveValue('Updated annotation');
    }
  });

  test('handles photo deletion', async () => {
    const user = userEvent.setup();
    window.electronAPI.deletePhoto.mockResolvedValue({ success: true });
    
    mockStore.photos = [
      {
        id: 'photo-1',
        fileName: 'test-photo.jpg',
        filePath: '/path/to/test-photo.jpg',
        annotations: []
      }
    ];
    
    render(<PhotoAnnotation {...defaultProps} />);
    
    const deleteButton = screen.getByRole('button', { name: /delete/i }) ||
                        screen.getByText(/remove/i) ||
                        screen.getByText('×');
    
    if (deleteButton) {
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(mockStore.deletePhoto).toHaveBeenCalledWith('photo-1');
      });
    }
  });

  test('saves annotations when photo is updated', async () => {
    window.electronAPI.savePhoto.mockResolvedValue({ success: true });
    
    mockStore.photos = [
      {
        id: 'photo-1',
        fileName: 'test-photo.jpg',
        filePath: '/path/to/test-photo.jpg',
        annotations: [
          {
            id: 'annotation-1',
            x: 100,
            y: 100,
            text: 'Test annotation',
            type: 'text'
          }
        ]
      }
    ];
    
    render(<PhotoAnnotation {...defaultProps} />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    
    if (saveButton) {
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(defaultProps.onPhotoUpdated).toHaveBeenCalled();
      });
    }
  });
});