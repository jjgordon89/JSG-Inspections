import React, { useState } from 'react';
import './AddEquipmentForm.css';

function AddEquipmentForm({ onEquipmentAdded }) {
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('active');
  const [files, setFiles] = useState([]);

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const equipmentId = await window.api.run(
      'INSERT INTO equipment (manufacturer, model, serial_number, capacity, installation_date, location, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [manufacturer, model, serialNumber, capacity, installationDate, location, status]
    );

    for (const file of files) {
      await window.api.run(
        'INSERT INTO documents (equipment_id, file_name, file_path) VALUES (?, ?, ?)',
        [equipmentId.id, file.name, file.path]
      );
    }

    onEquipmentAdded();
    setManufacturer('');
    setModel('');
    setSerialNumber('');
    setCapacity('');
    setInstallationDate('');
    setLocation('');
    setStatus('active');
    setFiles([]);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add New Equipment</h3>
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
      <button type="submit">Add</button>
    </form>
  );
}

export default AddEquipmentForm;