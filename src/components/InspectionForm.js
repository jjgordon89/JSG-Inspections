import React, { useState, useEffect } from 'react';
import './InspectionForm.css';
import Modal from './Modal';
import PhotoAnnotation from './PhotoAnnotation';
import InspectionSummary from './InspectionSummary';
import { getChecklistForEquipment } from '../utils/checklists';

function InspectionForm({ equipment, onInspectionAdded, onCancel }) {
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [annotatingPhoto, setAnnotatingPhoto] = useState(null);
  const [selectedPhotoInfo, setSelectedPhotoInfo] = useState(null);

  useEffect(() => {
    const checklistData = getChecklistForEquipment(equipment.type);
    const formattedSections = Object.keys(checklistData).map(sectionTitle => ({
      title: sectionTitle,
      items: checklistData[sectionTitle].map(item => ({
        ...item,
        result: null,
        photos: [],
        notes: '',
        priority: 'Minor',
        component: ''
      }))
    }));
    setSections(formattedSections);
  }, [equipment.type]);

  const handleUpdateItem = (sectionIdx, itemIdx, newValues) => {
    const updatedSections = [...sections];
    updatedSections[sectionIdx].items[itemIdx] = {
      ...updatedSections[sectionIdx].items[itemIdx],
      ...newValues,
    };
    setSections(updatedSections);
  };

  const handleAddPhoto = async (sectionIdx, itemIdx) => {
    const { filePaths } = await window.api.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }],
    });

    if (filePaths) {
      const updatedPhotos = [...sections[sectionIdx].items[itemIdx].photos, ...filePaths];
      handleUpdateItem(sectionIdx, itemIdx, { photos: updatedPhotos });
    }
  };

  const handleAnnotatePhoto = (photo, sectionIdx, itemIdx, photoIdx) => {
    setAnnotatingPhoto(photo);
    setSelectedPhotoInfo({ sectionIdx, itemIdx, photoIdx });
  };

  const handleSaveAnnotation = (newPhotoDataUrl) => {
    const { sectionIdx, itemIdx, photoIdx } = selectedPhotoInfo;
    const updatedPhotos = [...sections[sectionIdx].items[itemIdx].photos];
    updatedPhotos[photoIdx] = newPhotoDataUrl;
    handleUpdateItem(sectionIdx, itemIdx, { photos: updatedPhotos });
    setAnnotatingPhoto(null);
    setSelectedPhotoInfo(null);
  };

  const nextStep = () => {
    if (currentItemIndex < sections[currentSectionIndex].items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentItemIndex(0);
    }
  };

  const prevStep = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    } else if (currentSectionIndex > 0) {
      const prevSection = sections[currentSectionIndex - 1];
      setCurrentSectionIndex(currentSectionIndex - 1);
      setCurrentItemIndex(prevSection.items.length - 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSummary(true);
  };

  if (sections.length === 0) {
    return <div>Loading checklist...</div>;
  }

  const currentSection = sections[currentSectionIndex];
  const currentItem = currentSection.items[currentItemIndex];
  const isLastItem = currentSectionIndex === sections.length - 1 && currentItemIndex === currentSection.items.length - 1;

  if (showSummary) {
    return <InspectionSummary checklist={sections} onDone={onCancel} equipment={equipment} />;
  }

  return (
    <div className="inspection-form-container">
      <form onSubmit={handleSubmit}>
        <div className="progress-indicator">
          Section: {currentSection.title} ({currentSectionIndex + 1}/{sections.length})
          <br />
          Item: {currentItemIndex + 1}/{currentSection.items.length}
        </div>
        <div className="checklist-item-text">{currentItem.text}</div>
        <div className="result-buttons">
          {['Pass', 'Fail', 'N/A'].map(result => (
            <button
              key={result}
              type="button"
              className={`result-btn ${result.toLowerCase()} ${currentItem.result === result.toLowerCase() ? 'selected' : ''}`}
              onClick={() => handleUpdateItem(currentSectionIndex, currentItemIndex, { result: result.toLowerCase() })}
            >
              {result}
            </button>
          ))}
        </div>

        {currentItem.result === 'fail' && (
          <div className="fail-sub-workflow">
            <h4>Deficiency Details</h4>
            <input
              type="text"
              placeholder="Component Name"
              value={currentItem.component}
              onChange={(e) => handleUpdateItem(currentSectionIndex, currentItemIndex, { component: e.target.value })}
            />
            <select
              value={currentItem.priority}
              onChange={(e) => handleUpdateItem(currentSectionIndex, currentItemIndex, { priority: e.target.value })}
            >
              <option value="Critical">Critical</option>
              <option value="Serious">Serious</option>
              <option value="Minor">Minor</option>
            </select>
            <textarea
              placeholder="Detailed notes about the deficiency"
              value={currentItem.notes}
              onChange={(e) => handleUpdateItem(currentSectionIndex, currentItemIndex, { notes: e.target.value })}
              required
            />
            <button type="button" className="photo-btn" onClick={() => handleAddPhoto(currentSectionIndex, currentItemIndex)}>
              Add Photo(s)
            </button>
            <div className="photo-gallery">
              {currentItem.photos.map((photo, i) => (
                <button key={i} type="button" onClick={() => handleAnnotatePhoto(photo, currentSectionIndex, currentItemIndex, i)} className="photo-thumbnail-btn">
                  <img src={photo} alt="deficiency" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="nav-buttons">
          <button type="button" className="nav-btn" onClick={prevStep} disabled={currentSectionIndex === 0 && currentItemIndex === 0}>
            Back
          </button>
          {isLastItem ? (
            <button type="submit" className="submit-btn">
              Review & Submit
            </button>
          ) : (
            <button type="button" className="nav-btn" onClick={nextStep}>
              Next
            </button>
          )}
        </div>
        <button type="button" className="cancel-btn" onClick={onCancel}>
          Cancel Inspection
        </button>
      </form>
      {annotatingPhoto && (
        <Modal onClose={() => setAnnotatingPhoto(null)}>
          <PhotoAnnotation
            photo={annotatingPhoto}
            onSave={handleSaveAnnotation}
          />
        </Modal>
      )}
    </div>
  );
}

export default InspectionForm;