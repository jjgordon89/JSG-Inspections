import React, { useState } from 'react';
import './AddEquipmentForm.css';
import { generateQrCode } from '../utils/qr';

function AddEquipmentForm({ onEquipmentAdded }) {
  const [equipmentId, setEquipmentId] = useState('');
  const [type, setType] = useState('Overhead Crane');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('active');
  const [files, setFiles] = useState([]);
  const [qrCodeData, setQrCodeData] = useState('');

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const handleAssociateQrCode = async () => {
    if (!equipmentId) {
      alert('Please enter an Equipment ID first.');
      return;
    }
    const qrCode = await generateQrCode(equipmentId);
    setQrCodeData(qrCode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newEquipmentId = await window.api.run(
      'INSERT INTO equipment (equipment_id, type, manufacturer, model, serial_number, capacity, installation_date, location, status, qr_code_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [equipmentId, type, manufacturer, model, serialNumber, capacity, installationDate, location, status, qrCodeData]
    );

    for (const file of files) {
      await window.api.run(
        'INSERT INTO documents (equipment_id, file_name, file_path) VALUES (?, ?, ?)',
        [newEquipmentId.id, file.name, file.path]
      );
    }

    onEquipmentAdded();
    setEquipmentId('');
    setType('Overhead Crane');
    setManufacturer('');
    setModel('');
    setSerialNumber('');
    setCapacity('');
    setInstallationDate('');
    setLocation('');
    setStatus('active');
    setFiles([]);
    setQrCodeData('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add New Equipment</h3>
      <input
        type="text"
        value={equipmentId}
        onChange={(e) => setEquipmentId(e.target.value)}
        placeholder="Equipment ID"
        required
      />
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="Overhead Crane">Overhead Crane</option>
        <option value="Gantry Crane">Gantry Crane</option>
        <option value="Jib">Jib</option>
        <option value="Monorail">Monorail</option>
        <option value="Hoist">Hoist</option>
      </select>
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
      <button type="button" onClick={handleAssociateQrCode} className="qr-button">Associate QR/NFC Tag</button>
      {qrCodeData && (
        <div className="qr-code-container">
          <img src={qrCodeData} alt="QR Code" />
        </div>
      )}
      <button type="submit">Add</button>
    </form>
  );
}

export default AddEquipmentForm;