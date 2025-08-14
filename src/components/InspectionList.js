import React, { useEffect, useState } from 'react';
import { generateInspectionPdf } from '../utils/generatePdf';
import { useInspectionStore } from '../store';

function InspectionList() {
  const [inspections, setInspections] = useState([]);
  const viewingInspectionsFor = useInspectionStore((state) => state.viewingInspectionsFor);

  useEffect(() => {
    if (viewingInspectionsFor) {
      window.api.inspections.getByEquipmentId(viewingInspectionsFor).then(setInspections);
    }
  }, [viewingInspectionsFor]);

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
