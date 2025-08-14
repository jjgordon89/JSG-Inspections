import React, { useState, useEffect } from 'react';
import './AddEquipmentForm.css';

function EditEquipmentForm({ equipment, onEquipmentUpdated, onCancel }) {
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('active');
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (equipment) {
      setManufacturer(equipment.manufacturer);
      setModel(equipment.model);
      setSerialNumber(equipment.serial_number);
      setCapacity(equipment.capacity);
      setInstallationDate(equipment.installation_date);
      setLocation(equipment.location);
      setStatus(equipment.status);
    }
  }, [equipment]);

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    await window.api.equipment.update({
      manufacturer,
      model,
      serialNumber,
      capacity,
      installationDate,
      location,
      status,
      id: equipment.id
    });

    for (const file of files) {
      await window.api.documents.create({
        equipmentId: equipment.id,
        fileName: file.name,
        filePath: file.path || file.name,
        hash: 'placeholder', // TODO: Calculate actual hash when document import is implemented
        size: file.size || 0
      });
    }

    onEquipmentUpdated();
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Edit Equipment</h3>
      <input
        type="text"
        value={manufacturer}
        onChange={(e) => setManufacturer(e.target.value)}
        placeholder="Manufacturer"
      />
      <input
        type="text"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        placeholder="Model"
      />
      <input
        type="text"
        value={serialNumber}
        onChange={(e) => setSerialNumber(e.target.value)}
        placeholder="Serial Number"
      />
      <input
        type="number"
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        placeholder="Capacity"
      />
      <input
        type="date"
        value={installationDate}
        onChange={(e) => setInstallationDate(e.target.value)}
      />
      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location"
      />
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="active">Active</option>
        <option value="out of service">Out of Service</option>
        <option value="under maintenance">Under Maintenance</option>
      </select>
      <input type="file" multiple onChange={handleFileChange} />
      <button type="submit">Update</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}

export default EditEquipmentForm;
