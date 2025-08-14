import React from 'react';
import './InspectionItem.css';

function InspectionItem({ item, itemIndex, sectionTitle, onUpdateItem, onPhotoClick }) {
  const handleResultChange = (result) => {
    onUpdateItem(sectionTitle, itemIndex, { result: result.toLowerCase() });
  };

  const handleFieldChange = (field, value) => {
    onUpdateItem(sectionTitle, itemIndex, { [field]: value });
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const photoPromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({
          file,
          dataUrl: e.target.result,
          annotations: []
        });
        reader.readAsDataURL(file);
      });
    });
    
    Promise.all(photoPromises).then(photos => {
      const updatedPhotos = [...item.photos, ...photos];
      onUpdateItem(sectionTitle, itemIndex, { photos: updatedPhotos });
    });
  };

  const handlePhotoRemove = (photoIndex) => {
    const updatedPhotos = item.photos.filter((_, i) => i !== photoIndex);
    onUpdateItem(sectionTitle, itemIndex, { photos: updatedPhotos });
  };

  return (
    <div className="inspection-item">
      <span className="item-text">{item.text}</span>
      <div className="item-controls">
        {['Pass', 'Fail', 'N/A'].map(result => (
          <button
            type="button"
            key={result}
            className={`result-btn ${result.toLowerCase()} ${item.result === result.toLowerCase() ? 'selected' : ''}`}
            onClick={() => handleResultChange(result)}
          >
            {result}
          </button>
        ))}
      </div>
      
      {item.result === 'fail' && (
        <div className="deficiency-details">
          <div className="deficiency-field">
            <label>Priority:</label>
            <select 
              value={item.priority} 
              onChange={(e) => handleFieldChange('priority', e.target.value)}
            >
              <option value="Critical">Critical</option>
              <option value="Major">Major</option>
              <option value="Minor">Minor</option>
            </select>
          </div>
          
          <div className="deficiency-field">
            <label>Component:</label>
            <input 
              type="text" 
              value={item.component} 
              onChange={(e) => handleFieldChange('component', e.target.value)}
              placeholder="Affected component"
            />
          </div>
          
          <div className="deficiency-field">
            <label>Notes:</label>
            <textarea 
              value={item.notes} 
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Detailed description of deficiency"
              rows="3"
            />
          </div>
          
          <div className="deficiency-field">
            <label>Photos:</label>
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handlePhotoUpload}
            />
            
            {item.photos && item.photos.length > 0 && (
              <div className="photo-thumbnails">
                {item.photos.map((photo, photoIndex) => (
                  <div key={photoIndex} className="photo-thumbnail">
                    <img 
                      src={photo.dataUrl} 
                      alt={`Deficiency ${photoIndex + 1}`}
                      onClick={() => onPhotoClick(sectionTitle, itemIndex, photoIndex, photo)}
                    />
                    <button 
                      type="button"
                      onClick={() => handlePhotoRemove(photoIndex)}
                      className="remove-photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default InspectionItem;