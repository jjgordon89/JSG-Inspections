import React, { useEffect, useState } from 'react';
import EquipmentCard from './EquipmentCard';
import QrScanner from './QrScanner';
import './EquipmentList.css';
import { useEquipmentStore } from '../store';

function EquipmentList({ onViewInspections, showToast }) {
  const [equipment, setEquipment] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

const fetchEquipment = async () => {
  try {
    setLoading(true);
    setError(null);
    const equipmentData = await window.api.secure.equipment.getAll();
    
    if (Array.isArray(equipmentData)) {
      setEquipment(equipmentData);
    } else {
      throw new Error('Invalid equipment data received');
    }
  } catch (error) {
    console.error('Failed to fetch equipment:', error);
    setError(error.message || 'Failed to load equipment');
    if (showToast) showToast('Failed to load equipment');
  } finally {
    setLoading(false);
  }
};

  // Get state and actions from equipmentStore
  const refresh = useEquipmentStore((state) => state.refresh);
  const searchTerm = useEquipmentStore((state) => state.searchTerm);
  const setSearchTerm = useEquipmentStore((state) => state.setSearchTerm);
  const setEditingEquipment = useEquipmentStore((state) => state.setEditingEquipment);
  const setInspectingEquipment = useEquipmentStore((state) => state.setInspectingEquipment);

  useEffect(() => {
    fetchEquipment();
  }, [refresh]); // Re-fetch when refresh state changes

  const handleDelete = async (id) => {
    try {
      await window.api.equipment.delete(id);
      fetchEquipment();
      if (showToast) showToast('Equipment deleted');
    } catch (error) {
      console.error('Failed to delete equipment:', error);
      if (showToast) showToast('Failed to delete equipment');
    }
  };

  const handleScan = async (scannedData) => {
    if (scannedData) {
      try {
        const equipment = await window.api.equipment.getByEquipmentId(scannedData);
        if (equipment) {
          setInspectingEquipment(equipment);
        } else {
          alert('Equipment not found');
        }
      } catch (error) {
        console.error('Failed to find equipment:', error);
        alert('Error searching for equipment');
      }
    }
    setIsScannerOpen(false);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  // Filter equipment by search term (manufacturer or model)
  const filteredEquipment = equipment.filter(
    (item) =>
      ((item.manufacturer || '') || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((item.model || '') || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentItems = filteredEquipment.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Loading state
  if (loading) {
    return (
      <section className="equipment-list-section">
        <div className="toolbar">
          <input
            type="text"
            placeholder="Search by manufacturer or model..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="equipment-search-input"
            aria-label="Search equipment"
            disabled
          />
          <button className="scan-button" disabled>Scan Equipment QR</button>
        </div>
        <div className="equipment-card-grid">
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
            <div className="loading-spinner">Loading equipment...</div>
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="equipment-list-section">
        <div className="toolbar">
          <input
            type="text"
            placeholder="Search by manufacturer or model..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="equipment-search-input"
            aria-label="Search equipment"
            disabled
          />
          <button className="scan-button" disabled>Scan Equipment QR</button>
        </div>
        <div className="equipment-card-grid">
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
            <div className="error-message">
              <p>Error loading equipment: {error}</p>
              <button onClick={fetchEquipment} className="retry-button">
                Retry
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="equipment-list-section">
      <div className="toolbar">
        <input
          type="text"
          placeholder="Search by manufacturer or model..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
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
            {filteredEquipment.length === 0 && equipment.length > 0 
              ? 'No equipment matches your search criteria.'
              : 'No equipment found.'
            }
          </div>
        ) : (
          currentItems.map((item) => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onEdit={setEditingEquipment}
              onDelete={handleDelete}
              onViewInspections={onViewInspections}
              onInspect={setInspectingEquipment}
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
