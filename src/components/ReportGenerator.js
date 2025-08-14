import React, { useState, useEffect } from 'react';
import { 
  generateHistoryReport, 
  generateEquipmentPdf, 
  generateInspectionPdf,
  generateWorkOrderPdf,
  generateDeficiencyPdf,
  generateCompliancePdf,
  generateLoadTestCertificate,
  generateCalibrationCertificate
} from '../utils/generatePdf';
import './ReportGenerator.css';

function ReportGenerator() {
  const [equipment, setEquipment] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [deficiencies, setDeficiencies] = useState([]);
  const [loadTests, setLoadTests] = useState([]);
  const [calibrations, setCalibrations] = useState([]);
  
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedInspection, setSelectedInspection] = useState('');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState('');
  const [selectedDeficiency, setSelectedDeficiency] = useState('');
  const [selectedLoadTest, setSelectedLoadTest] = useState('');
  const [selectedCalibration, setSelectedCalibration] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('history');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data using secure operations
      const [
        equipmentList,
        inspectionsList,
        workOrdersList,
        deficienciesList,
        loadTestsList,
        calibrationsList
      ] = await Promise.all([
        window.api.secureOperation('equipment.getAll', {}),
        window.api.secureOperation('inspections.getAll', {}),
        window.api.secureOperation('workOrders.getAll', {}),
        window.api.secureOperation('deficiencies.getAll', {}),
        window.api.secureOperation('loadTests.getByEquipmentId', { equipmentId: selectedEquipment || 1 }).catch(() => []),
        window.api.secureOperation('calibrations.getByEquipmentId', { equipmentId: selectedEquipment || 1 }).catch(() => [])
      ]);

      setEquipment(equipmentList || []);
      setInspections(inspectionsList || []);
      setWorkOrders(workOrdersList || []);
      setDeficiencies(deficienciesList || []);
      setLoadTests(loadTestsList || []);
      setCalibrations(calibrationsList || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading data for reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEquipmentChange = async (equipmentId) => {
    setSelectedEquipment(equipmentId);
    
    if (equipmentId) {
      try {
        // Fetch equipment-specific data
        const [loadTestsList, calibrationsList] = await Promise.all([
          window.api.secureOperation('loadTests.getByEquipmentId', { equipmentId: parseInt(equipmentId) }).catch(() => []),
          window.api.secureOperation('calibrations.getByEquipmentId', { equipmentId: parseInt(equipmentId) }).catch(() => [])
        ]);
        
        setLoadTests(loadTestsList || []);
        setCalibrations(calibrationsList || []);
      } catch (error) {
        console.error('Error fetching equipment-specific data:', error);
      }
    }
  };

  const handleGenerateHistoryReport = async () => {
    if (!selectedEquipment) {
      alert('Please select a piece of equipment.');
      return;
    }

    try {
      setLoading(true);
      
      const equipmentDetails = await window.api.secureOperation('equipment.getById', { 
        id: parseInt(selectedEquipment) 
      });

      let inspectionHistory;
      if (startDate && endDate) {
        inspectionHistory = await window.api.secureOperation('inspections.getByDateRange', { 
          startDate, 
          endDate 
        });
        // Filter by equipment ID since getByDateRange returns all equipment
        inspectionHistory = inspectionHistory.filter(inspection => inspection.equipment_id === parseInt(selectedEquipment));
      } else {
        inspectionHistory = await window.api.secureOperation('inspections.getByEquipmentId', { 
          equipmentId: parseInt(selectedEquipment) 
        });
      }

      if (inspectionHistory.length === 0) {
        alert('No inspections found for the selected criteria.');
        return;
      }

      await generateHistoryReport(equipmentDetails, inspectionHistory);
    } catch (error) {
      console.error('Error generating history report:', error);
      alert('Error generating history report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEquipmentReport = async () => {
    if (!selectedEquipment) {
      alert('Please select a piece of equipment.');
      return;
    }

    try {
      setLoading(true);
      
      const equipmentDetails = await window.api.secureOperation('equipment.getById', { 
        id: parseInt(selectedEquipment) 
      });

      generateEquipmentPdf(equipmentDetails);
    } catch (error) {
      console.error('Error generating equipment report:', error);
      alert('Error generating equipment report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInspectionReport = async () => {
    if (!selectedInspection) {
      alert('Please select an inspection.');
      return;
    }

    try {
      setLoading(true);
      
      const inspection = inspections.find(i => i.id === parseInt(selectedInspection));
      if (!inspection) {
        alert('Selected inspection not found.');
        return;
      }

      await generateInspectionPdf(inspection);
    } catch (error) {
      console.error('Error generating inspection report:', error);
      alert('Error generating inspection report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWorkOrderReport = async () => {
    if (!selectedWorkOrder) {
      alert('Please select a work order.');
      return;
    }

    try {
      setLoading(true);
      
      const workOrder = workOrders.find(wo => wo.id === parseInt(selectedWorkOrder));
      if (!workOrder) {
        alert('Selected work order not found.');
        return;
      }

      await generateWorkOrderPdf(workOrder);
    } catch (error) {
      console.error('Error generating work order report:', error);
      alert('Error generating work order report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDeficiencyReport = async () => {
    if (!selectedDeficiency) {
      alert('Please select a deficiency.');
      return;
    }

    try {
      setLoading(true);
      
      const deficiency = deficiencies.find(d => d.id === parseInt(selectedDeficiency));
      if (!deficiency) {
        alert('Selected deficiency not found.');
        return;
      }

      await generateDeficiencyPdf(deficiency);
    } catch (error) {
      console.error('Error generating deficiency report:', error);
      alert('Error generating deficiency report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateComplianceReport = async () => {
    try {
      setLoading(true);
      
      await generateCompliancePdf(equipment);
    } catch (error) {
      console.error('Error generating compliance report:', error);
      alert('Error generating compliance report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLoadTestCertificate = async () => {
    if (!selectedLoadTest) {
      alert('Please select a load test.');
      return;
    }

    try {
      setLoading(true);
      
      const loadTest = loadTests.find(lt => lt.id === parseInt(selectedLoadTest));
      if (!loadTest) {
        alert('Selected load test not found.');
        return;
      }

      const equipmentDetails = await window.api.secureOperation('equipment.getById', { 
        id: loadTest.equipment_id 
      });

      generateLoadTestCertificate(loadTest, equipmentDetails);
    } catch (error) {
      console.error('Error generating load test certificate:', error);
      alert('Error generating load test certificate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCalibrationCertificate = async () => {
    if (!selectedCalibration) {
      alert('Please select a calibration.');
      return;
    }

    try {
      setLoading(true);
      
      const calibration = calibrations.find(c => c.id === parseInt(selectedCalibration));
      if (!calibration) {
        alert('Selected calibration not found.');
        return;
      }

      const equipmentDetails = await window.api.secureOperation('equipment.getById', { 
        id: calibration.equipment_id 
      });

      generateCalibrationCertificate(calibration, equipmentDetails);
    } catch (error) {
      console.error('Error generating calibration certificate:', error);
      alert('Error generating calibration certificate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderReportOptions = () => {
    switch (reportType) {
      case 'history':
        return (
          <div className="report-section">
            <h3>Inspection History Report</h3>
            <div className="form-group">
              <label>Equipment:</label>
              <select
                value={selectedEquipment}
                onChange={(e) => handleEquipmentChange(e.target.value)}
                required
              >
                <option value="">Select Equipment</option>
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.equipment_id} - {item.type}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Start Date (optional):</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>End Date (optional):</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
            <button 
              onClick={handleGenerateHistoryReport}
              disabled={loading || !selectedEquipment}
            >
              {loading ? 'Generating...' : 'Generate History Report'}
            </button>
          </div>
        );

      case 'equipment':
        return (
          <div className="report-section">
            <h3>Equipment Report</h3>
            <div className="form-group">
              <label>Equipment:</label>
              <select
                value={selectedEquipment}
                onChange={(e) => setSelectedEquipment(e.target.value)}
                required
              >
                <option value="">Select Equipment</option>
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.equipment_id} - {item.type}
                  </option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleGenerateEquipmentReport}
              disabled={loading || !selectedEquipment}
            >
              {loading ? 'Generating...' : 'Generate Equipment Report'}
            </button>
          </div>
        );

      case 'inspection':
        return (
          <div className="report-section">
            <h3>Inspection Report</h3>
            <div className="form-group">
              <label>Inspection:</label>
              <select
                value={selectedInspection}
                onChange={(e) => setSelectedInspection(e.target.value)}
                required
              >
                <option value="">Select Inspection</option>
                {inspections.map((inspection) => (
                  <option key={inspection.id} value={inspection.id}>
                    {inspection.inspection_date} - {inspection.inspector} - Equipment {inspection.equipment_id}
                  </option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleGenerateInspectionReport}
              disabled={loading || !selectedInspection}
            >
              {loading ? 'Generating...' : 'Generate Inspection Report'}
            </button>
          </div>
        );

      case 'workorder':
        return (
          <div className="report-section">
            <h3>Work Order Report</h3>
            <div className="form-group">
              <label>Work Order:</label>
              <select
                value={selectedWorkOrder}
                onChange={(e) => setSelectedWorkOrder(e.target.value)}
                required
              >
                <option value="">Select Work Order</option>
                {workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.wo_number} - {wo.title}
                  </option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleGenerateWorkOrderReport}
              disabled={loading || !selectedWorkOrder}
            >
              {loading ? 'Generating...' : 'Generate Work Order Report'}
            </button>
          </div>
        );

      case 'deficiency':
        return (
          <div className="report-section">
            <h3>Deficiency Report</h3>
            <div className="form-group">
              <label>Deficiency:</label>
              <select
                value={selectedDeficiency}
                onChange={(e) => setSelectedDeficiency(e.target.value)}
                required
              >
                <option value="">Select Deficiency</option>
                {deficiencies.map((deficiency) => (
                  <option key={deficiency.id} value={deficiency.id}>
                    {deficiency.equipment_identifier} - {deficiency.severity} - {deficiency.description.substring(0, 50)}...
                  </option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleGenerateDeficiencyReport}
              disabled={loading || !selectedDeficiency}
            >
              {loading ? 'Generating...' : 'Generate Deficiency Report'}
            </button>
          </div>
        );

      case 'compliance':
        return (
          <div className="report-section">
            <h3>Compliance Summary Report</h3>
            <p>This report provides a comprehensive overview of equipment compliance status across all equipment.</p>
            <button 
              onClick={handleGenerateComplianceReport}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Compliance Report'}
            </button>
          </div>
        );

      case 'loadtest':
        return (
          <div className="report-section">
            <h3>Load Test Certificate</h3>
            <div className="form-group">
              <label>Equipment:</label>
              <select
                value={selectedEquipment}
                onChange={(e) => handleEquipmentChange(e.target.value)}
                required
              >
                <option value="">Select Equipment</option>
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.equipment_id} - {item.type}
                  </option>
                ))}
              </select>
            </div>
            {selectedEquipment && (
              <div className="form-group">
                <label>Load Test:</label>
                <select
                  value={selectedLoadTest}
                  onChange={(e) => setSelectedLoadTest(e.target.value)}
                  required
                >
                  <option value="">Select Load Test</option>
                  {loadTests.map((test) => (
                    <option key={test.id} value={test.id}>
                      {test.test_date} - {test.test_type} - {test.test_results}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button 
              onClick={handleGenerateLoadTestCertificate}
              disabled={loading || !selectedLoadTest}
            >
              {loading ? 'Generating...' : 'Generate Load Test Certificate'}
            </button>
          </div>
        );

      case 'calibration':
        return (
          <div className="report-section">
            <h3>Calibration Certificate</h3>
            <div className="form-group">
              <label>Equipment:</label>
              <select
                value={selectedEquipment}
                onChange={(e) => handleEquipmentChange(e.target.value)}
                required
              >
                <option value="">Select Equipment</option>
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.equipment_id} - {item.type}
                  </option>
                ))}
              </select>
            </div>
            {selectedEquipment && (
              <div className="form-group">
                <label>Calibration:</label>
                <select
                  value={selectedCalibration}
                  onChange={(e) => setSelectedCalibration(e.target.value)}
                  required
                >
                  <option value="">Select Calibration</option>
                  {calibrations.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.calibration_date} - {cal.instrument_type} - {cal.calibration_results}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button 
              onClick={handleGenerateCalibrationCertificate}
              disabled={loading || !selectedCalibration}
            >
              {loading ? 'Generating...' : 'Generate Calibration Certificate'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading && !reportType) {
    return (
      <div className="report-generator">
        <div className="loading">Loading report data...</div>
      </div>
    );
  }

  return (
    <div className="report-generator">
      <h2>Report Generator</h2>
      
      <div className="report-type-selector">
        <label>Report Type:</label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
        >
          <option value="history">Inspection History</option>
          <option value="equipment">Equipment Details</option>
          <option value="inspection">Individual Inspection</option>
          <option value="workorder">Work Order</option>
          <option value="deficiency">Deficiency</option>
          <option value="compliance">Compliance Summary</option>
          <option value="loadtest">Load Test Certificate</option>
          <option value="calibration">Calibration Certificate</option>
        </select>
      </div>

      {renderReportOptions()}
    </div>
  );
}

export default ReportGenerator;
