import React, { useRef, useEffect, useState } from 'react';
import { MarkerArea, ArrowMarker, TextMarker, EllipseMarker } from 'markerjs2';
import './PhotoAnnotation.css';

// Photo compression utility
const compressImage = (file, quality = 0.8, maxWidth = 1920, maxHeight = 1080) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

function PhotoAnnotation({ photo, onSave, onCancel, enableBatchMode = false, batchPhotos = [] }) {
  const imgRef = useRef(null);
  const markerAreaRef = useRef(null);
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [compressionQuality, setCompressionQuality] = useState(0.8);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [batchAnnotations, setBatchAnnotations] = useState({});
  const [isAnnotating, setIsAnnotating] = useState(false);

  useEffect(() => {
    if (imgRef.current && !isAnnotating) {
      const markerArea = new MarkerArea(imgRef.current, {
        targetRoot: document.body,
        markerTypes: [ArrowMarker, TextMarker, EllipseMarker],
      });

      // Load existing annotations if they exist
      if (photo.annotations && photo.annotations.length > 0) {
        markerArea.restoreState(photo.annotations);
      }

      markerArea.addEventListener('render', (event) => {
        const annotatedPhoto = {
          ...photo,
          dataUrl: event.dataUrl,
          annotations: event.state
        };
        onSave(annotatedPhoto);
      });

      markerArea.addEventListener('close', () => {
        if (onCancel) {
          onCancel();
        }
      });

      setIsAnnotating(true);
      markerArea.show();
      markerAreaRef.current = markerArea;
    }

    return () => {
      if (markerAreaRef.current) {
        markerAreaRef.current.close();
        markerAreaRef.current = null;
        setIsAnnotating(false);
      }
    };
  }, [photo, onSave, onCancel, isAnnotating]);

  const handleColorChange = (color) => {
    setSelectedColor(color);
    if (markerAreaRef.current) {
      markerAreaRef.current.setMarkerColor(color);
    }
  };

  const handleSave = async () => {
    if (markerAreaRef.current) {
      markerAreaRef.current.render();
    }
  };

  const handleBatchSave = async () => {
    if (enableBatchMode && batchPhotos.length > 0) {
      const currentPhoto = batchPhotos[currentBatchIndex];
      if (markerAreaRef.current && currentPhoto) {
        // Save current annotations
        const annotatedData = await new Promise((resolve) => {
          markerAreaRef.current.addEventListener('render', (event) => {
            resolve({
              dataUrl: event.dataUrl,
              annotations: markerAreaRef.current.getState()
            });
          }, { once: true });
          markerAreaRef.current.render();
        });
        
        setBatchAnnotations(prev => ({
          ...prev,
          [currentBatchIndex]: annotatedData
        }));
        
        // Move to next photo or finish
        if (currentBatchIndex < batchPhotos.length - 1) {
          setCurrentBatchIndex(prev => prev + 1);
        } else {
          // All photos processed, save batch
          if (onSave) {
            onSave(batchAnnotations);
          }
        }
      }
    }
  };

  const handleCompress = async () => {
    const photoSrc = typeof photo === 'string' ? photo : photo.dataUrl;
    if (photoSrc) {
      try {
        // Convert data URL to blob
        const response = await fetch(photoSrc);
        const blob = await response.blob();
        
        // Compress the image
        const compressedBlob = await compressImage(blob, compressionQuality);
        
        // Convert back to data URL
        const reader = new FileReader();
        reader.onload = () => {
          const compressedDataUrl = reader.result;
          if (onSave) {
            onSave({
              dataUrl: compressedDataUrl,
              compressed: true,
              originalSize: blob.size,
              compressedSize: compressedBlob.size,
              compressionRatio: (1 - compressedBlob.size / blob.size).toFixed(2)
            });
          }
        };
        reader.readAsDataURL(compressedBlob);
      } catch (error) {
        console.error('Compression failed:', error);
      }
    }
  };

  const handleCancel = () => {
    if (markerAreaRef.current) {
      markerAreaRef.current.close();
    }
    if (onCancel) {
      onCancel();
    }
  };

  const handlePreviousBatch = () => {
    if (currentBatchIndex > 0) {
      setCurrentBatchIndex(prev => prev - 1);
    }
  };

  const handleNextBatch = () => {
    if (currentBatchIndex < batchPhotos.length - 1) {
      setCurrentBatchIndex(prev => prev + 1);
    }
  };

  // Get the photo source - handle both string URLs and photo objects
  const currentPhoto = enableBatchMode && batchPhotos.length > 0 
    ? batchPhotos[currentBatchIndex] 
    : photo;
  const photoSrc = typeof currentPhoto === 'string' ? currentPhoto : currentPhoto?.dataUrl;

  return (
    <div className="photo-annotation-container">
      <div className="annotation-toolbar">
        <div className="toolbar-section">
          <label>Annotation Color:</label>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => handleColorChange(e.target.value)}
          />
        </div>
        
        <div className="toolbar-section">
          <label>Compression Quality:</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={compressionQuality}
            onChange={(e) => setCompressionQuality(parseFloat(e.target.value))}
          />
          <span>{Math.round(compressionQuality * 100)}%</span>
          <button onClick={handleCompress} className="compress-btn">Compress Photo</button>
        </div>
        
        {enableBatchMode && batchPhotos.length > 0 && (
          <div className="toolbar-section batch-controls">
            <span>Photo {currentBatchIndex + 1} of {batchPhotos.length}</span>
            <button 
              onClick={handlePreviousBatch} 
              disabled={currentBatchIndex === 0}
              className="nav-btn"
            >
              Previous
            </button>
            <button 
              onClick={handleNextBatch} 
              disabled={currentBatchIndex === batchPhotos.length - 1}
              className="nav-btn"
            >
              Next
            </button>
          </div>
        )}
        
        <div className="annotation-actions">
          {enableBatchMode ? (
            <>
              <button onClick={handleBatchSave} className="save-btn">
                {currentBatchIndex === batchPhotos.length - 1 ? 'Finish Batch' : 'Save & Next'}
              </button>
              <button onClick={handleCancel} className="cancel-btn">Cancel Batch</button>
            </>
          ) : (
            <>
              <button onClick={handleSave} className="save-btn">Save Annotations</button>
              <button onClick={handleCancel} className="cancel-btn">Cancel</button>
            </>
          )}
        </div>
      </div>
      <img 
        ref={imgRef} 
        src={photoSrc} 
        alt="For annotation" 
        style={{ maxWidth: '100%', maxHeight: '70vh' }} 
      />
    </div>
  );
}

export default PhotoAnnotation;
