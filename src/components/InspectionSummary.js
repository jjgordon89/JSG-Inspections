import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { generateInspectionPdf } from '../utils/generatePdf';
import './InspectionForm.css';

function InspectionSummary({ checklist, onDone, equipment, scheduledInspectionId = null }) {
  const [summaryComments, setSummaryComments] = useState('');
  const [inspector, setInspector] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const sigCanvas = useRef({});

  // Prefill inspector from scheduled inspection if available
  React.useEffect(() => {
    const prefillInspector = async () => {
      if (scheduledInspectionId) {
        try {
          // Get the scheduled inspection to prefill inspector
          const scheduledInspections = await window.api.secureOperation('scheduledInspections', 'getAll');
          const scheduledInspection = scheduledInspections.find(si => si.id === scheduledInspectionId);
          if (scheduledInspection && scheduledInspection.assigned_inspector) {
            setInspector(scheduledInspection.assigned_inspector);
          }
        } catch (error) {
          console.error('Error fetching scheduled inspection for prefill:', error);
        }
      }
      if (!inspector) {
        setInspector('Inspector Name'); // Default fallback
      }
      setIsLoading(false);
    };

    prefillInspector();
  }, [scheduledInspectionId]);

  const allItems = checklist.flatMap(section => section.items);
  const deficiencies = allItems.filter(item => item.result === 'fail');

  const deficienciesByPriority = deficiencies.reduce((acc, item) => {
    acc[item.priority] = (acc[item.priority] || 0) + 1;
    return acc;
  }, {});

  const handleFinalize = async () => {
    try {
      const signature = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      const inspectionDate = new Date().toISOString();
      
      // Create the main inspection record
      const inspectionData = {
        equipmentId: equipment.id,
        inspector: inspector,
        inspectionDate: inspectionDate,
        findings: JSON.stringify(checklist),
        correctiveActions: '', // Will be populated from deficiencies
        summaryComments: summaryComments,
        signature: signature,
        scheduledInspectionId: scheduledInspectionId
      };

      // Use the appropriate secure operation based on whether this is from a scheduled inspection
      const operation = scheduledInspectionId ? 'createFromScheduled' : 'create';
      const result = await window.api.secureOperation('inspections', operation, inspectionData);
      const inspectionId = result.lastID;

      // Create itemized inspection items
      for (const section of checklist) {
        for (const item of section.items) {
          const itemData = {
            inspectionId: inspectionId,
            standardRef: item.standardRef || null,
            itemText: item.text,
            critical: item.critical || false,
            result: item.result,
            notes: item.notes || '',
            photos: JSON.stringify(item.photos || []),
            component: item.component || '',
            priority: item.priority || 'Minor'
          };

          const itemResult = await window.api.secureOperation('inspectionItems', 'create', itemData);
          
          // Create deficiency record for failed items
          if (item.result === 'fail') {
            const deficiencyData = {
              equipmentId: equipment.id,
              inspectionItemId: itemResult.lastID,
              severity: item.priority.toLowerCase(),
              removeFromService: item.priority === 'Critical',
              description: item.notes || `Failed inspection item: ${item.text}`,
              component: item.component || '',
              correctiveAction: '',
              dueDate: null, // Will be set later
              status: 'open'
            };

            await window.api.secureOperation('deficiencies', 'create', deficiencyData);
          }
        }
      }

      // Update scheduled inspection status if applicable
      if (scheduledInspectionId) {
        await window.api.secureOperation('scheduledInspections', 'updateStatus', {
          id: scheduledInspectionId,
          status: 'completed'
        });
      }

      onDone(true); // Pass success = true
    } catch (error) {
      console.error('Error finalizing inspection:', error);
      onDone(false); // Pass success = false
    }
  };

  // Export PDF handler
  const handleExportPdf = () => {
    const signature = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
    const inspectionData = {
      equipment_id: equipment.id,
      inspector: 'Inspector Name', // Placeholder
      inspection_date: new Date().toISOString(),
      findings: JSON.stringify(checklist),
      summary_comments: summaryComments,
      signature: signature,
    };
    generateInspectionPdf(inspectionData);
  };

  if (isLoading) {
    return <div className="summary-container">Loading inspection details...</div>;
  }

  return (
    <div className="summary-container">
      <div className="report-header">
        <h2>Inspection Report</h2>
        <p><strong>Equipment:</strong> {equipment.equipment_id} - {equipment.type}</p>
        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
        <div className="inspector-field">
          <label><strong>Inspector:</strong></label>
          <input 
            type="text" 
            value={inspector} 
            onChange={(e) => setInspector(e.target.value)}
            placeholder="Enter inspector name"
            style={{ marginLeft: '8px', padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>
        {scheduledInspectionId && (
          <p><strong>Scheduled Inspection ID:</strong> {scheduledInspectionId}</p>
        )}
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
                  <img key={i} src={photo.dataUrl} alt={`Deficiency photo ${i + 1}`} />
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

      <div className="summary-actions">
        <button className="export-btn" onClick={handleExportPdf} type="button">
          Export PDF
        </button>
        <button className="done-btn" onClick={handleFinalize}>
          Finalize & Save Report
        </button>
      </div>
    </div>
  );
}

export default InspectionSummary;
