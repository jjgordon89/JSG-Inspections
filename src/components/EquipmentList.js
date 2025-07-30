import React, { useEffect, useState } from 'react';
import EquipmentCard from './EquipmentCard';
import QrScanner from './QrScanner';
import './EquipmentList.css';

function EquipmentList({ onEdit, onViewInspections, showToast, onInspect }) {
  const [equipment, setEquipment] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [search, setSearch] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const fetchEquipment = () => {
    window.api.all('SELECT * FROM equipment').then(setEquipment);
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const handleDelete = async (id) => {
    await window.api.run('DELETE FROM equipment WHERE id = ?', [id]);
    fetchEquipment();
    if (showToast) showToast('Equipment deleted');
  };

  const handleScan = async (scannedData) => {
    if (scannedData) {
      const equipment = await window.api.get('SELECT * FROM equipment WHERE equipment_id = ?', [scannedData]);
      if (equipment) {
        onInspect(equipment);
      } else {
        alert('Equipment not found');
      }
    }
    setIsScannerOpen(false);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  // Filter equipment by search term (manufacturer or model)
  const filteredEquipment = equipment.filter(
    (item) =>
      item.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      item.model.toLowerCase().includes(search.toLowerCase())
  );

  const currentItems = filteredEquipment.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <section className="equipment-list-section">
      <div className="toolbar">
        <input
          type="text"
          placeholder="Search by manufacturer or model..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="equipment-search-input"
          aria-label="Search equipment"
        />
        <button onClick={() => setIsScannerOpen(true)} className="scan-button">Scan Equipment QR</button>
      </div>
      <div className="equipment-card-grid">
        {currentItems.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888' }}>
            No equipment found.
          </div>
        ) : (
          currentItems.map((item) => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onEdit={onEdit}
              onDelete={handleDelete}
              onViewInspections={onViewInspections}
              onInspect={onInspect}
            />
          ))
        )}
      </div>
      <div className="pagination">
        {Array.from({ length: Math.ceil(filteredEquipment.length / itemsPerPage) }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => paginate(i + 1)}
            className={currentPage === i + 1 ? 'active' : ''}
            aria-current={currentPage === i + 1 ? 'page' : undefined}
          >
            {i + 1}
          </button>
        ))}
      </div>
      {isScannerOpen && <QrScanner onScan={handleScan} onClose={() => setIsScannerOpen(false)} />}
    </section>
  );
}

export default EquipmentList;