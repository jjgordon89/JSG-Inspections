import React, { useEffect, useState } from 'react';

function DocumentList({ equipmentId }) {
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (equipmentId) {
      window.api.all('SELECT * FROM documents WHERE equipment_id = ?', [equipmentId]).then(setDocuments);
    }
  }, [equipmentId]);

  return (
    <div>
      <h3>Documents</h3>
      <ul>
        {documents.map((doc) => (
          <li key={doc.id}>
            <a href={`file://${doc.file_path}`} target="_blank" rel="noopener noreferrer">
              {doc.file_name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DocumentList;