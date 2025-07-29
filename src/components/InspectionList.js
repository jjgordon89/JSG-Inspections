import React, { useEffect, useState } from 'react';
import { generateInspectionPdf } from '../utils/generatePdf';

function InspectionList({ equipmentId }) {
  const [inspections, setInspections] = useState([]);

  useEffect(() => {
    if (equipmentId) {
      window.api.all('SELECT * FROM inspections WHERE equipment_id = ?', [equipmentId]).then(setInspections);
    }
  }, [equipmentId]);

  return (
    <div className="mt-4">
      <h3 className="text-xl font-bold">Inspections</h3>
      <ul>
        {inspections.map((inspection) => (
          <li key={inspection.id} className="p-4 mt-2 border rounded">
            <p><strong>Inspector:</strong> {inspection.inspector}</p>
            <p><strong>Date:</strong> {inspection.inspection_date}</p>
            <p><strong>Findings:</strong> {inspection.findings}</p>
            <p><strong>Corrective Actions:</strong> {inspection.corrective_actions}</p>
            <button onClick={() => generateInspectionPdf(inspection)} className="px-4 py-2 mt-2 text-white bg-gray-500 rounded hover:bg-gray-600">Download PDF</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default InspectionList;