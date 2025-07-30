import React, { useRef, useEffect } from 'react';
import { MarkerArea } from 'markerjs2';

function PhotoAnnotation({ photo, onSave }) {
  const imgRef = useRef(null);
  const markerAreaRef = useRef(null);

  useEffect(() => {
    if (imgRef.current) {
      const markerArea = new MarkerArea(imgRef.current);
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

  return (
    <div>
      <img ref={imgRef} src={photo} alt="For annotation" style={{ maxWidth: '100%' }} />
    </div>
  );
}

export default PhotoAnnotation;