import React from 'react';
import './EquipmentCard.css';
import DocumentList from './DocumentList';
import { generateEquipmentPdf } from '../utils/generatePdf';

function EquipmentCard({ equipment, onEdit, onDelete, onViewInspections }) {
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">{equipment.manufacturer} {equipment.model}</h5>
        <p className="card-text">Serial Number: {equipment.serial_number}</p>
        <p className="card-text">Capacity: {equipment.capacity}</p>
        <p className="card-text">Installation Date: {equipment.installation_date}</p>
        <p className="card-text">Location: {equipment.location}</p>
        <p className="card-text">Status: {equipment.status}</p>
        <DocumentList equipmentId={equipment.id} />
        <div className="card-buttons">
          <button
            onClick={() => onEdit(equipment)}
            aria-label={`Edit equipment ${equipment.manufacturer} ${equipment.model}`}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(equipment.id)}
            aria-label={`Delete equipment ${equipment.manufacturer} ${equipment.model}`}
          >
            Delete
          </button>
          <button
            onClick={() => onViewInspections(equipment.id)}
            aria-label={`View inspections for ${equipment.manufacturer} ${equipment.model}`}
          >
            View Inspections
          </button>
          <button
            onClick={() => generateEquipmentPdf(equipment)}
            aria-label={`Download PDF for ${equipment.manufacturer} ${equipment.model}`}
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default EquipmentCard;