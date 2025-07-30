import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './InspectionForm.css';

function InspectionSummary({ checklist, onDone, equipment }) {
  const [summaryComments, setSummaryComments] = useState('');
  const sigCanvas = useRef({});

  const allItems = checklist.flatMap(section => section.items);
  const deficiencies = allItems.filter(item => item.result === 'fail');

  const deficienciesByPriority = deficiencies.reduce((acc, item) => {
    acc[item.priority] = (acc[item.priority] || 0) + 1;
    return acc;
  }, {});

  const handleFinalize = async () => {
    const signature = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
    
    const inspectionData = {
      equipment_id: equipment.id,
      inspector: 'Inspector Name', // Placeholder
      inspection_date: new Date().toISOString(),
      findings: JSON.stringify(checklist),
      summary_comments: summaryComments,
      signature: signature,
    };

    await window.api.run(
      'INSERT INTO inspections (equipment_id, inspector, inspection_date, findings, corrective_actions) VALUES (?, ?, ?, ?, ?)',
      [inspectionData.equipment_id, inspectionData.inspector, inspectionData.inspection_date, inspectionData.findings, '']
    );

    onDone();
  };

  return (
    <div className="summary-container">
      <div className="report-header">
        <h2>Inspection Report</h2>
        <p><strong>Equipment:</strong> {equipment.equipment_id} - {equipment.type}</p>
        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
        <p><strong>Inspector:</strong> Inspector Name</p>
      </div>

      <div className="at-a-glance">
        <h3>At a Glance</h3>
        <p>Total Deficiencies: {deficiencies.length}</p>
        <ul>
          {Object.entries(deficienciesByPriority).map(([priority, count]) => (
            <li key={priority}><strong>{priority}:</strong> {count}</li>
          ))}
        </ul>
      </div>

      <div className="deficiencies-list">
        <h3>Deficiency Details</h3>
        {deficiencies.length > 0 ? (
          deficiencies.map((item, index) => (
            <div key={index} className="deficiency-item">
              <p><strong>Item:</strong> {item.text}</p>
              <p><strong>Component:</strong> {item.component}</p>
              <p><strong>Priority:</strong> {item.priority}</p>
              <p><strong>Notes:</strong> {item.notes}</p>
              <div className="photo-gallery">
                {item.photos.map((photo, i) => (
                  <img key={i} src={photo} alt="deficiency" />
                ))}
              </div>
            </div>
          ))
        ) : (
          <p>No deficiencies found.</p>
        )}
      </div>

      <div className="summary-comments">
        <h3>Summary Comments</h3>
        <textarea
          value={summaryComments}
          onChange={(e) => setSummaryComments(e.target.value)}
          placeholder="Add overall summary comments here..."
        />
      </div>

      <div className="signature-section">
        <h3>Inspector Signature</h3>
        <SignatureCanvas
          ref={sigCanvas}
          penColor='black'
          canvasProps={{className: 'sig-canvas'}}
        />
        <button onClick={() => sigCanvas.current.clear()}>Clear</button>
      </div>

      <button className="done-btn" onClick={handleFinalize}>
        Finalize & Save Report
      </button>
    </div>
  );
}

export default InspectionSummary;