import React, { useState, useEffect } from 'react';
import { generateInspectionPdf } from '../utils/generatePdf';
import './ReportGenerator.css';

function ReportGenerator() {
  const [inspections, setInspections] = useState([]);
  const [selectedInspection, setSelectedInspection] = useState('');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeDeficiencies, setIncludeDeficiencies] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    const inspectionList = await window.api.all('SELECT * FROM inspections');
    setInspections(inspectionList);
  };

  const handleGenerateReport = async () => {
    if (!selectedInspection) {
      alert('Please select an inspection.');
      return;
    }
    const inspection = await window.api.get('SELECT * FROM inspections WHERE id = ?', [selectedInspection]);
    const options = {
      includeSummary,
      includeDeficiencies,
      includeComments,
      includeSignature,
      logo,
    };
    generateInspectionPdf(inspection, options);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="report-generator">
      <h2>Report Generator</h2>
      <div className="report-options">
        <select
          value={selectedInspection}
          onChange={(e) => setSelectedInspection(e.target.value)}
          required
        >
          <option value="">Select Inspection</option>
          {inspections.map((item) => (
            <option key={item.id} value={item.id}>
              Inspection #{item.id} - {item.inspection_date}
            </option>
          ))}
        </select>
        <label>
          <input
            type="checkbox"
            checked={includeSummary}
            onChange={(e) => setIncludeSummary(e.target.checked)}
          />
          Include Summary
        </label>
        <label>
          <input
            type="checkbox"
            checked={includeDeficiencies}
            onChange={(e) => setIncludeDeficiencies(e.target.checked)}
          />
          Include Deficiencies
        </label>
        <label>
          <input
            type="checkbox"
            checked={includeComments}
            onChange={(e) => setIncludeComments(e.target.checked)}
          />
          Include Comments
        </label>
        <label>
          <input
            type="checkbox"
            checked={includeSignature}
            onChange={(e) => setIncludeSignature(e.target.checked)}
          />
          Include Signature
        </label>
        <label>
          Company Logo:
          <input type="file" accept="image/png, image/jpeg" onChange={handleLogoChange} />
        </label>
        <button onClick={handleGenerateReport}>Generate Report</button>
      </div>
    </div>
  );
}

export default ReportGenerator;