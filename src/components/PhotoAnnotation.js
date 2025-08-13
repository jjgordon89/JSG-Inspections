import React, { useRef, useEffect, useState } from 'react';
import { MarkerArea, ArrowMarker, TextMarker, EllipseMarker } from 'markerjs2';
import './PhotoAnnotation.css';

function PhotoAnnotation({ photo, onSave, onCancel }) {
  const imgRef = useRef(null);
  const markerAreaRef = useRef(null);
  const [selectedColor, setSelectedColor] = useState('#FF0000');
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

  const handleSave = () => {
    if (markerAreaRef.current) {
      markerAreaRef.current.render();
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

  // Get the photo source - handle both string URLs and photo objects
  const photoSrc = typeof photo === 'string' ? photo : photo.dataUrl;

  return (
    <div className="photo-annotation-container">
      <div className="annotation-toolbar">
        <label>Annotation Color:</label>
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => handleColorChange(e.target.value)}
        />
        <div className="annotation-actions">
          <button onClick={handleSave} className="save-btn">Save Annotations</button>
          <button onClick={handleCancel} className="cancel-btn">Cancel</button>
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
