import React, { useState, useEffect } from 'react';
import './InspectionForm.css';
import Modal from './Modal';
import PhotoAnnotation from './PhotoAnnotation';
import InspectionSummary from './InspectionSummary';
import { getChecklistForEquipment } from '../utils/checklists';

function InspectionForm({ equipment, onInspectionAdded, onCancel }) {
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
      setOpenSection(formattedSections.title);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSummary(true);
  };

  if (showSummary) {
    return <InspectionSummary checklist={sections} onDone={onCancel} equipment={equipment} />;
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
                      {/* Deficiency fields will be added here */}
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
    </form>
  );
}

export default InspectionForm;
