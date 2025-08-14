import React, { useState, useEffect } from 'react';
import './InspectionForm.css';
import Modal from './Modal';
import PhotoAnnotation from './PhotoAnnotation';
import InspectionSummary from './InspectionSummary';
import InspectionSection from './InspectionSection';
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

  const handlePhotoClick = (sectionTitle, itemIndex, photoIndex, photo) => {
    setSelectedPhotoInfo({ sectionTitle, itemIndex, photoIndex });
    setAnnotatingPhoto(photo);
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
      {sections.map((section) => (
        <InspectionSection
          key={section.title}
          section={section}
          isOpen={openSection === section.title}
          onToggle={() => setOpenSection(openSection === section.title ? null : section.title)}
          onUpdateItem={handleUpdateItem}
          onPhotoClick={handlePhotoClick}
        />
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
