import React, { useEffect, useState } from 'react';
import EquipmentCard from './EquipmentCard';
import './EquipmentList.css';

function EquipmentList({ onEdit, onViewInspections }) {
  const [equipment, setEquipment] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const fetchEquipment = () => {
    window.api.all('SELECT * FROM equipment').then(setEquipment);
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const handleDelete = async (id) => {
    await window.api.run('DELETE FROM equipment WHERE id = ?', [id]);
    fetchEquipment();
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = equipment.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <section className="equipment-list-section">
      <h2 className="equipment-list-header">Equipment List</h2>
      <div className="equipment-card-grid">
        {currentItems.map((item) => (
          <EquipmentCard
            key={item.id}
            equipment={item}
            onEdit={onEdit}
            onDelete={handleDelete}
            onViewInspections={onViewInspections}
          />
        ))}
      </div>
      <div className="pagination">
        {Array.from({ length: Math.ceil(equipment.length / itemsPerPage) }, (_, i) => (
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
    </section>
  );
}

export default EquipmentList;