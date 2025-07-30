import React from 'react';
import './EquipmentCard.css';
import DocumentList from './DocumentList';
import { generateEquipmentPdf } from '../utils/generatePdf';

function EquipmentCard({ equipment, onEdit, onDelete, onViewInspections, onInspect }) {
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">{equipment.equipment_id} - {equipment.type}</h5>
        <p className="card-text"><strong>Manufacturer:</strong> {equipment.manufacturer}</p>
        <p className="card-text"><strong>Model:</strong> {equipment.model}</p>
        <p className="card-text"><strong>Serial Number:</strong> {equipment.serial_number}</p>
        <p className="card-text"><strong>Capacity:</strong> {equipment.capacity}</p>
        <p className="card-text"><strong>Installation Date:</strong> {equipment.installation_date}</p>
        <p className="card-text"><strong>Location:</strong> {equipment.location}</p>
        <p className="card-text"><strong>Status:</strong> <span className={`status status-${equipment.status.toLowerCase().replace(/ /g, '-')}`}>{equipment.status}</span></p>
        <DocumentList equipmentId={equipment.id} />
        <div className="card-buttons">
          <button onClick={() => onEdit(equipment)}>Edit</button>
          <button onClick={() => {
            if (window.confirm(`Are you sure you want to delete ${equipment.manufacturer} ${equipment.model}?`)) {
              onDelete(equipment.id);
            }
          }}>Delete</button>
          <button onClick={() => onViewInspections(equipment.id)}>Inspections</button>
          <button onClick={() => generateEquipmentPdf(equipment)}>PDF</button>
          <button onClick={() => onInspect(equipment)} className="inspect-button">Inspect</button>
          <button className="scan-button">Scan</button>
        </div>
      </div>
    </div>
  );
}

export default EquipmentCard;