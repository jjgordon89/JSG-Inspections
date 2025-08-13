import React, { useState, useEffect } from 'react';
import './InspectionForm.css';
import Modal from './Modal';
import PhotoAnnotation from './PhotoAnnotation';
import InspectionSummary from './InspectionSummary';
import { getChecklistForEquipment } from '../utils/checklists';
import { useEquipmentStore, useInspectionStore } from '../store';

function InspectionForm({ onInspectionAdded, onCancel, showToast }) {
  // Get equipment from either equipmentStore or inspectionStore
  const inspectingEquipment = useEquipmentStore((state) => state.inspectingEquipment);
  const addingInspectionFor = useInspectionStore((state) => state.addingInspectionFor);
  
  // Determine which equipment to use
  const equipment = inspectingEquipment ||
    (typeof addingInspectionFor === 'object' ? addingInspectionFor : { id: addingInspectionFor, type: '' });
  const [sections, setSections] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [annotatingPhoto, setAnnotatingPhoto] = useState(null);
  const [selectedPhotoInfo, setSelectedPhotoInfo] = useState(null);
  const [openSection, setOpenSection] = useState(null);

  useEffect(() => {
    const checklistData = getChecklistForEquipment(equipment.type);
    const formattedSections = Object.keys(checklistData).map((title, index) => ({
      title,
      items: checklistData[title].map(item => ({ ...item, result: null, photos: [], notes: '', priority: 'Minor', component: '' })),
    }));
    setSections(formattedSections);
    if (formattedSections.length > 0) {
      setOpenSection(formattedSections[0].title);
    }
  }, [equipment.type]);

  const handleUpdateItem = (sectionTitle, itemIndex, newValues) => {
    const updatedSections = sections.map(section => {
      if (section.title === sectionTitle) {
        const updatedItems = [...section.items];
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...newValues };
        return { ...section, items: updatedItems };
      }
      return section;
    });
    setSections(updatedSections);
  };

  const handlePhotoAnnotationSave = (annotatedPhoto) => {
    if (selectedPhotoInfo) {
      const { sectionTitle, itemIndex, photoIndex } = selectedPhotoInfo;
      const updatedSections = sections.map(section => {
        if (section.title === sectionTitle) {
          const updatedItems = [...section.items];
          const updatedPhotos = [...updatedItems[itemIndex].photos];
          updatedPhotos[photoIndex] = annotatedPhoto;
          updatedItems[itemIndex] = { ...updatedItems[itemIndex], photos: updatedPhotos };
          return { ...section, items: updatedItems };
        }
        return section;
      });
      setSections(updatedSections);
    }
    setAnnotatingPhoto(null);
    setSelectedPhotoInfo(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      setShowSummary(true);
      if (showToast) {
        showToast('Inspection form completed successfully', 'success');
      }
    } catch (error) {
      console.error('Error submitting inspection:', error);
      if (showToast) {
        showToast('Failed to submit inspection. Please try again.', 'error');
      }
    }
  };

  if (showSummary) {
    return <InspectionSummary 
      checklist={sections} 
      onDone={(success) => {
        if (success && onInspectionAdded) {
          onInspectionAdded();
        }
        onCancel();
      }} 
      equipment={equipment} 
    />;
  }

  return (
    <form onSubmit={handleSubmit} className="inspection-form">
      {sections.map(({ title, items }) => (
        <div key={title} className="inspection-section">
          <h3 className="section-title" onClick={() => setOpenSection(openSection === title ? null : title)}>
            {title}
          </h3>
          {openSection === title && (
            <div className="section-content">
              {items.map((item, itemIndex) => (
                <div key={item.id} className="inspection-item">
                  <span className="item-text">{item.text}</span>
                  <div className="item-controls">
                    {['Pass', 'Fail', 'N/A'].map(result => (
                      <button
                        type="button"
                        key={result}
                        className={`result-btn ${result.toLowerCase()} ${item.result === result.toLowerCase() ? 'selected' : ''}`}
                        onClick={() => handleUpdateItem(title, itemIndex, { result: result.toLowerCase() })}
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
                          onChange={(e) => handleUpdateItem(title, itemIndex, { priority: e.target.value })}
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
                          onChange={(e) => handleUpdateItem(title, itemIndex, { component: e.target.value })}
                          placeholder="Affected component"
                        />
                      </div>
                      <div className="deficiency-field">
                        <label>Notes:</label>
                        <textarea 
                          value={item.notes} 
                          onChange={(e) => handleUpdateItem(title, itemIndex, { notes: e.target.value })}
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
                          onChange={(e) => {
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
                              handleUpdateItem(title, itemIndex, { photos: updatedPhotos });
                            });
                          }}
                        />
                        {item.photos && item.photos.length > 0 && (
                          <div className="photo-thumbnails">
                            {item.photos.map((photo, photoIndex) => (
                              <div key={photoIndex} className="photo-thumbnail">
                                <img 
                                  src={photo.dataUrl} 
                                  alt={`Deficiency ${photoIndex + 1}`}
                                  onClick={() => {
                                    setSelectedPhotoInfo({ sectionTitle: title, itemIndex, photoIndex });
                                    setAnnotatingPhoto(photo);
                                  }}
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const updatedPhotos = item.photos.filter((_, i) => i !== photoIndex);
                                    handleUpdateItem(title, itemIndex, { photos: updatedPhotos });
                                  }}
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
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="form-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit">Review & Submit</button>
      </div>
      
      {annotatingPhoto && (
        <Modal onClose={() => setAnnotatingPhoto(null)}>
          <PhotoAnnotation
            photo={annotatingPhoto}
            onSave={handlePhotoAnnotationSave}
            onCancel={() => setAnnotatingPhoto(null)}
          />
        </Modal>
      )}
    </form>
  );
}

export default InspectionForm;
