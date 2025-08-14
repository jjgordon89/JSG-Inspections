import React from 'react';
import InspectionItem from './InspectionItem';
import './InspectionSection.css';

function InspectionSection({ 
  section, 
  isOpen, 
  onToggle, 
  onUpdateItem, 
  onPhotoClick 
}) {
  const { title, items } = section;

  return (
    <div className="inspection-section">
      <h3 
        className={`section-title ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
      >
        <span className="section-title-text">{title}</span>
        <span className="section-toggle-icon">
          {isOpen ? '▼' : '▶'}
        </span>
      </h3>
      
      {isOpen && (
        <div className="section-content">
          {items.map((item, itemIndex) => (
            <InspectionItem
              key={item.id}
              item={item}
              itemIndex={itemIndex}
              sectionTitle={title}
              onUpdateItem={onUpdateItem}
              onPhotoClick={onPhotoClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default InspectionSection;