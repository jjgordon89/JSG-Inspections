import React from 'react';
import './EquipmentCard.css';
import DocumentList from './DocumentList';
import { generateEquipmentPdf } from '../utils/generatePdf';

function EquipmentCard({ equipment, onEdit, onDelete, onViewInspections, onInspect }) {
  return (
    <div className="card" data-testid="equipment-card">
      <div className="card-body">
        <h5 className="card-title">{equipment.equipment_id} - {equipment.type}</h5>
        <p className="card-text"><strong>Manufacturer:</strong> {equipment.manufacturer}</p>
        <p className="card-text"><strong>Model:</strong> {equipment.model}</p>
        <p className="card-text"><strong>Serial Number:</strong> {equipment.serial_number}</p>
        <p className="card-text"><strong>Status:</strong> <span className={`status status-${equipment.status.toLowerCase().replace(/ /g, '-')}`}>{equipment.status}</span></p>
        <DocumentList equipmentId={equipment.id} />
        <div className="card-buttons">
          <button onClick={() => onInspect(equipment)} className="btn-primary">Inspect</button>
          <button onClick={() => onViewInspections(equipment.id)} className="btn-outline">View History</button>
          <button onClick={() => onEdit(equipment)} className="btn-secondary">Edit</button>
          <button onClick={() => generateEquipmentPdf(equipment)} className="btn-secondary">PDF</button>
          <button onClick={() => {
            if (window.confirm(`Are you sure you want to delete ${equipment.manufacturer} ${equipment.model}?`)) {
              onDelete(equipment.id);
            }
          }} className="btn-danger">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default EquipmentCard;