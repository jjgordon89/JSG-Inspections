import React, { useState } from 'react';
import './AddEquipmentForm.css';
import { generateQrCode } from '../utils/qr';
import { withErrorHandling, makeIdempotent } from '../utils/retry';
import useUIStore from '../store/uiStore';

const initialState = {
  equipmentId: '',
  type: 'Overhead Crane',
  manufacturer: '',
  model: '',
  serialNumber: '',
  capacity: '',
  installationDate: '',
  location: '',
  status: 'active',
  files: [],
  qrCodeData: '',
};

function AddEquipmentForm({ onEquipmentAdded }) {
  const [formData, setFormData] = useState(initialState);
  const showToast = useUIStore((state) => state.showToast);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, files: e.target.files }));
  };

  const handleAssociateQrCode = async () => {
    if (!formData.equipmentId) {
      alert('Please enter an Equipment ID first.');
      return;
    }
    const qrCode = await generateQrCode(formData.equipmentId);
    setFormData(prev => ({ ...prev, qrCodeData: qrCode }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const addEquipmentOperation = async () => {
      const { files, ...equipmentData } = formData;
      
      // First, add the equipment
      const equipmentResult = await window.api.equipment.create({
        equipmentId: equipmentData.equipmentId,
        type: equipmentData.type,
        manufacturer: equipmentData.manufacturer,
        model: equipmentData.model,
        serialNumber: equipmentData.serialNumber,
        capacity: equipmentData.capacity,
        installationDate: equipmentData.installationDate,
        location: equipmentData.location,
        status: equipmentData.status,
        qrCodeData: equipmentData.qrCodeData
      });

      // Then add documents with idempotent checks
      const equipmentId = equipmentResult.lastID;
      const documentResults = [];

      for (const file of files) {
        const checkExisting = async () => {
          return await window.api.documents.checkExisting(equipmentId, file.name);
        };

        const addDocument = async () => {
          // For now, we'll use the file path directly since we don't have document import yet
          return await window.api.documents.create({
            equipmentId: equipmentId,
            fileName: file.name,
            filePath: file.path || file.name,
            hash: 'placeholder', // TODO: Calculate actual hash when document import is implemented
            size: file.size || 0
          });
        };

        const documentResult = await makeIdempotent(checkExisting, addDocument);
        documentResults.push(documentResult);
      }

      // Check if any document operations failed - simplified since secure operations throw errors
      // instead of returning error objects

      return { success: true, data: { equipmentId, documentsAdded: documentResults.length } };
    };

    const result = await withErrorHandling(
      addEquipmentOperation,
      showToast,
      'Add Equipment',
      {
        successMessage: `Equipment "${formData.equipmentId}" added successfully`,
        onSuccess: () => {
          onEquipmentAdded();
          setFormData(initialState);
        },
        onError: (error) => {
          // If it was a partial success, still refresh the list
          if (error.error?.partialSuccess) {
            onEquipmentAdded();
            setFormData(initialState);
          }
        }
      }
    );

    return result;
  };

  return (
    <form onSubmit={handleSubmit} className="add-equipment-form">
      <h3>Add New Equipment</h3>
      <div className="form-grid">
        <input name="equipmentId" value={formData.equipmentId} onChange={handleChange} placeholder="Equipment ID" required />
        <select name="type" value={formData.type} onChange={handleChange}>
          <option>Overhead Crane</option>
          <option>Gantry Crane</option>
          <option>Jib</option>
          <option>Monorail</option>
          <option>Hoist</option>
        </select>
        <input name="manufacturer" value={formData.manufacturer} onChange={handleChange} placeholder="Manufacturer" />
        <input name="model" value={formData.model} onChange={handleChange} placeholder="Model" />
        <input name="serialNumber" value={formData.serialNumber} onChange={handleChange} placeholder="Serial Number" />
        <input name="capacity" type="number" value={formData.capacity} onChange={handleChange} placeholder="Capacity" />
        <input name="installationDate" type="date" value={formData.installationDate} onChange={handleChange} />
        <input name="location" value={formData.location} onChange={handleChange} placeholder="Location" />
        <select name="status" value={formData.status} onChange={handleChange}>
          <option value="active">Active</option>
          <option value="out of service">Out of Service</option>
          <option value="under maintenance">Under Maintenance</option>
        </select>
        <input type="file" multiple onChange={handleFileChange} className="form-full-width" />
        <div className="form-buttons">
          <button type="button" onClick={handleAssociateQrCode} className="btn-secondary">Associate QR/NFC Tag</button>
          <button type="submit" className="btn-submit">Add Equipment</button>
        </div>
        {formData.qrCodeData && (
          <div className="qr-code-container">
            <img src={formData.qrCodeData} alt="QR Code" />
          </div>
        )}
      </div>
    </form>
  );
}

export default AddEquipmentForm;
