import React, { useRef, useEffect, useState } from 'react';
import { MarkerArea, ArrowMarker, TextMarker, EllipseMarker } from 'markerjs2';

function PhotoAnnotation({ photo, onSave }) {
  const imgRef = useRef(null);
  const markerAreaRef = useRef(null);
  const [selectedColor, setSelectedColor] = useState('#FF0000');

  useEffect(() => {
    if (imgRef.current) {
      const markerArea = new MarkerArea(imgRef.current, {
        targetRoot: document.body,
        markerTypes: [ArrowMarker, TextMarker, EllipseMarker],
      });

      markerArea.addEventListener('render', (event) => {
        if (imgRef.current) {
          imgRef.current.src = event.dataUrl;
          onSave(event.dataUrl);
        }
      });

      markerArea.show();
      markerAreaRef.current = markerArea;
    }
  }, [photo, onSave]);

  const handleColorChange = (color) => {
    setSelectedColor(color);
    if (markerAreaRef.current) {
      markerAreaRef.current.setMarkerColor(color);
    }
  };

  return (
    <div>
      <div className="annotation-toolbar">
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => handleColorChange(e.target.value)}
        />
      </div>
      <img ref={imgRef} src={photo} alt="For annotation" style={{ maxWidth: '100%' }} />
    </div>
  );
}

export default PhotoAnnotation;