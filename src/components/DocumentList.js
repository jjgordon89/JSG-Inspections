import React, { useEffect, useState } from 'react';

function DocumentList({ equipmentId }) {
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (equipmentId) {
      // Use secure operation instead of generic SQL
      window.api.documents.getByEquipmentId(equipmentId).then(result => {
        if (window.api.isError(result)) {
          console.error('Failed to load documents:', window.api.getErrorMessage(result));
          setDocuments([]);
        } else {
          setDocuments(result.data || []);
        }
      });
    }
  }, [equipmentId]);

  const handleOpenDocument = async (filePath) => {
    try {
      const result = await window.api.openFilePath(filePath);
      if (window.api.isError(result)) {
        console.error('Failed to open document:', window.api.getErrorMessage(result));
        alert(`Failed to open document: ${window.api.getErrorMessage(result)}`);
      }
    } catch (error) {
      console.error('Error opening document:', error);
      alert('Failed to open document. Please check if the file exists.');
    }
  };

  return (
    <div>
      <h3>Documents</h3>
      <ul>
        {documents.map((doc) => (
          <li key={doc.id}>
            <button 
              onClick={() => handleOpenDocument(doc.file_path)}
              className="text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer"
            >
              {doc.file_name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DocumentList;
