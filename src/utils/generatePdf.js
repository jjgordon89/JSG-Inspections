import jsPDF from 'jspdf';

/**
 * Enhanced PDF Generation System
 * 
 * This modernized system uses normalized database data instead of JSON strings
 * in the findings column. It queries inspection_items, deficiencies, and other
 * normalized tables for accurate, current data.
 */

export const generateEquipmentPdf = (equipment) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Equipment Report', 20, 20);
  
  // Equipment details
  doc.setFontSize(12);
  let y = 35;
  doc.text(`Equipment ID: ${equipment.equipment_id || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Type: ${equipment.type || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Manufacturer: ${equipment.manufacturer || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Model: ${equipment.model || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Serial Number: ${equipment.serial_number || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Capacity: ${equipment.capacity || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Installation Date: ${equipment.installation_date || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Location: ${equipment.location || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Status: ${equipment.status || 'N/A'}`, 20, y);

  doc.save(`${equipment.equipment_id || 'equipment'}_report.pdf`);
};

export const generateHistoryReport = async (equipment, inspections) => {
  const doc = new jsPDF();
  let y = 20;

  // Title page
  doc.setFontSize(18);
  doc.text(`Inspection History Report`, 20, y);
  y += 10;
  doc.setFontSize(14);
  doc.text(`Equipment: ${equipment.equipment_id || 'N/A'}`, 20, y);
  y += 15;
  
  doc.setFontSize(12);
  doc.text(`Manufacturer: ${equipment.manufacturer || 'N/A'}`, 20, y);
  doc.text(`Model: ${equipment.model || 'N/A'}`, 100, y);
  y += 7;
  doc.text(`Serial Number: ${equipment.serial_number || 'N/A'}`, 20, y);
  doc.text(`Capacity: ${equipment.capacity || 'N/A'} lbs`, 100, y);
  y += 7;
  doc.text(`Location: ${equipment.location || 'N/A'}`, 20, y);
  y += 14;

  doc.setFontSize(14);
  doc.text('Inspection Records', 20, y);
  y += 7;

  // Table Header
  doc.setFontSize(10);
  doc.text('Date', 20, y);
  doc.text('Inspector', 60, y);
  doc.text('Items', 100, y);
  doc.text('Failures', 130, y);
  doc.text('Result', 160, y);
  y += 7;
  doc.line(20, y-2, 190, y-2); // horizontal line

  // Process each inspection
  for (const inspection of inspections) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    try {
      // Get inspection items for this inspection using secure operations
      const inspectionItems = await window.api.secureOperation('inspectionItems.getByInspectionId', {
        inspectionId: inspection.id
      });

      const totalItems = inspectionItems.length;
      const failedItems = inspectionItems.filter(item => item.result === 'fail').length;
      const result = failedItems === 0 ? 'Pass' : 'Fail';

      doc.text(inspection.inspection_date || 'N/A', 20, y);
      doc.text(inspection.inspector || 'N/A', 60, y);
      doc.text(String(totalItems), 100, y);
      doc.text(String(failedItems), 130, y);
      doc.setTextColor(result === 'Pass' ? 'green' : 'red');
      doc.text(result, 160, y);
      doc.setTextColor('black');
      y += 7;
    } catch (error) {
      console.error('Error processing inspection items:', error);
      // Fallback to legacy JSON parsing if needed
      let findings = [];
      try {
        findings = JSON.parse(inspection.findings || '[]');
      } catch (e) {
        findings = [];
      }

      const allItems = findings.flatMap(section => section.items || []);
      const deficiencies = allItems.filter(item => item.result === 'fail');
      const result = deficiencies.length === 0 ? 'Pass' : 'Fail';

      doc.text(inspection.inspection_date || 'N/A', 20, y);
      doc.text(inspection.inspector || 'N/A', 60, y);
      doc.text(String(allItems.length), 100, y);
      doc.text(String(deficiencies.length), 130, y);
      doc.setTextColor(result === 'Pass' ? 'green' : 'red');
      doc.text(result, 160, y);
      doc.setTextColor('black');
      y += 7;
    }
  }

  doc.save(`history_report_${equipment.equipment_id || 'equipment'}.pdf`);
};

export const generateInspectionPdf = async (inspection, options = {}) => {
  const {
    includeSummary = true,
    includeDeficiencies = true,
    includeComments = true,
    includeSignature = true,
    logo,
  } = options;

  const doc = new jsPDF();
  let y = 20;

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 150, 10, 40, 20);
    } catch (e) {
      console.error("Error adding logo:", e);
    }
  }

  doc.setFontSize(18);
  doc.text('Inspection Report', 20, y);
  y += 15;

  doc.setFontSize(12);
  doc.text(`Inspector: ${inspection.inspector || 'N/A'}`, 20, y);
  doc.text(`Inspection Date: ${inspection.inspection_date || 'N/A'}`, 20, y + 7);
  doc.text(`Equipment: ${inspection.equipment_id || 'N/A'}`, 20, y + 14);
  y += 24;

  try {
    // Get inspection items using normalized data
    const inspectionItems = await window.api.secureOperation('inspectionItems.getByInspectionId', {
      inspectionId: inspection.id
    });

    const failedItems = inspectionItems.filter(item => item.result === 'fail');

    if (includeSummary) {
      const deficienciesByPriority = failedItems.reduce((acc, item) => {
        const priority = item.priority || 'Minor';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {});

      doc.setFontSize(14);
      doc.text('Summary', 20, y);
      y += 7;
      doc.setFontSize(12);
      doc.text(`Total Items Inspected: ${inspectionItems.length}`, 20, y);
      y += 6;
      doc.text(`Total Deficiencies: ${failedItems.length}`, 20, y);
      y += 6;
      Object.entries(deficienciesByPriority).forEach(([priority, count]) => {
        doc.text(`${priority}: ${count}`, 25, y);
        y += 6;
      });
      y += 4;
    }

    if (includeDeficiencies) {
      doc.setFontSize(14);
      doc.text('Deficiency Details', 20, y);
      y += 7;
      doc.setFontSize(11);

      if (failedItems.length === 0) {
        doc.text('No deficiencies found.', 20, y);
        y += 7;
      } else {
        failedItems.forEach((item) => {
          if (y > 270) { 
            doc.addPage(); 
            y = 20; 
          }
          
          doc.text(`Item: ${item.item_text || 'N/A'}`, 20, y);
          y += 5;
          if (item.standard_ref) {
            doc.text(`Standard: ${item.standard_ref}`, 25, y);
            y += 5;
          }
          if (item.component) {
            doc.text(`Component: ${item.component}`, 25, y);
            y += 5;
          }
          if (item.priority) {
            doc.text(`Priority: ${item.priority}`, 25, y);
            y += 5;
          }
          if (item.notes) {
            doc.text(`Notes: ${item.notes}`, 25, y);
            y += 5;
          }
          
          // Handle photos
          if (item.photos) {
            let photos = [];
            try {
              photos = JSON.parse(item.photos);
            } catch (e) {
              // If not JSON, treat as single photo
              if (typeof item.photos === 'string' && item.photos.length > 0) {
                photos = [item.photos];
              }
            }
            
            if (photos.length > 0) {
              doc.text(`Photos:`, 25, y);
              y += 5;
              photos.forEach((photo) => {
                if (y > 250) { 
                  doc.addPage(); 
                  y = 20; 
                }
                try {
                  // Use dataUrl if available, otherwise use the photo directly
                  const imageData = photo.dataUrl || photo;
                  if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
                    // Detect image format from data URL
                    const format = imageData.includes('data:image/png') ? 'PNG' : 'JPEG';
                    doc.addImage(imageData, format, 30, y, 30, 20);
                    y += 22;
                  } else {
                    doc.text('[Photo format not supported]', 30, y);
                    y += 6;
                  }
                } catch (e) {
                  doc.text('[Photo could not be loaded]', 30, y);
                  y += 6;
                }
              });
            }
          }
          y += 4;
        });
      }
    }

  } catch (error) {
    console.error('Error getting inspection items, falling back to legacy data:', error);
    
    // Fallback to legacy JSON parsing
    let findings = [];
    try {
      findings = JSON.parse(inspection.findings || '[]');
    } catch (e) {
      findings = [];
    }

    const allItems = findings.flatMap(section => section.items || []);
    const deficiencies = allItems.filter(item => item.result === 'fail');

    if (includeSummary) {
      const deficienciesByPriority = deficiencies.reduce((acc, item) => {
        acc[item.priority] = (acc[item.priority] || 0) + 1;
        return acc;
      }, {});

      doc.setFontSize(14);
      doc.text('Summary', 20, y);
      y += 7;
      doc.setFontSize(12);
      doc.text(`Total Deficiencies: ${deficiencies.length}`, 20, y);
      y += 6;
      Object.entries(deficienciesByPriority).forEach(([priority, count]) => {
        doc.text(`${priority}: ${count}`, 25, y);
        y += 6;
      });
      y += 4;
    }

    if (includeDeficiencies) {
      doc.setFontSize(14);
      doc.text('Deficiency Details', 20, y);
      y += 7;
      doc.setFontSize(11);

      if (deficiencies.length === 0) {
        doc.text('No deficiencies found.', 20, y);
        y += 7;
      } else {
        deficiencies.forEach((item) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(`Item: ${item.text}`, 20, y);
          y += 5;
          doc.text(`Component: ${item.component}`, 25, y);
          y += 5;
          doc.text(`Priority: ${item.priority}`, 25, y);
          y += 5;
          doc.text(`Notes: ${item.notes}`, 25, y);
          y += 5;
          if (item.photos && item.photos.length > 0) {
            doc.text(`Photos:`, 25, y);
            y += 5;
            item.photos.forEach((photo) => {
              if (y > 250) { doc.addPage(); y = 20; }
              try {
                const imageData = photo.dataUrl || photo;
                if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
                  const format = imageData.includes('data:image/png') ? 'PNG' : 'JPEG';
                  doc.addImage(imageData, format, 30, y, 30, 20);
                  y += 22;
                } else {
                  doc.text('[Photo format not supported]', 30, y);
                  y += 6;
                }
              } catch (e) {
                doc.text('[Photo could not be loaded]', 30, y);
                y += 6;
              }
            });
          }
          y += 4;
        });
      }
    }
  }

  if (includeComments) {
    y += 4;
    doc.setFontSize(14);
    doc.text('Summary Comments', 20, y);
    y += 7;
    doc.setFontSize(11);
    doc.text(inspection.summary_comments || '', 20, y, { maxWidth: 170 });
    y += 14;
  }

  if (includeSignature) {
    doc.setFontSize(14);
    doc.text('Inspector Signature', 20, y);
    y += 7;
    if (inspection.signature) {
      try {
        doc.addImage(inspection.signature, 'PNG', 20, y, 60, 20);
      } catch (e) {
        doc.text('[Signature could not be loaded]', 20, y);
      }
    }
  }

  doc.save(`inspection_${inspection.id || 'report'}_report.pdf`);
};

/**
 * Generate Work Order Report
 */
export const generateWorkOrderPdf = async (workOrder, options = {}) => {
  const {
    includeHistory = true,
    includeDeficiencies = true,
    logo
  } = options;

  const doc = new jsPDF();
  let y = 20;

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 150, 10, 40, 20);
    } catch (e) {
      console.error("Error adding logo:", e);
    }
  }

  // Header
  doc.setFontSize(18);
  doc.text('Work Order Report', 20, y);
  y += 15;

  // Work Order Details
  doc.setFontSize(12);
  doc.text(`WO Number: ${workOrder.wo_number || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Title: ${workOrder.title || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Equipment: ${workOrder.equipment_identifier || workOrder.equipment_id || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Work Type: ${workOrder.work_type || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Priority: ${workOrder.priority || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Status: ${workOrder.status || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Assigned To: ${workOrder.assigned_to || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Created By: ${workOrder.created_by || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Created Date: ${workOrder.created_at || 'N/A'}`, 20, y);
  y += 10;

  // Description
  if (workOrder.description) {
    doc.setFontSize(14);
    doc.text('Description', 20, y);
    y += 7;
    doc.setFontSize(11);
    doc.text(workOrder.description, 20, y, { maxWidth: 170 });
    y += 14;
  }

  // Time and Cost Information
  if (workOrder.estimated_hours || workOrder.actual_hours || workOrder.parts_cost || workOrder.labor_cost) {
    doc.setFontSize(14);
    doc.text('Time and Cost', 20, y);
    y += 7;
    doc.setFontSize(11);
    
    if (workOrder.estimated_hours) {
      doc.text(`Estimated Hours: ${workOrder.estimated_hours}`, 20, y);
      y += 6;
    }
    if (workOrder.actual_hours) {
      doc.text(`Actual Hours: ${workOrder.actual_hours}`, 20, y);
      y += 6;
    }
    if (workOrder.parts_cost) {
      doc.text(`Parts Cost: $${workOrder.parts_cost}`, 20, y);
      y += 6;
    }
    if (workOrder.labor_cost) {
      doc.text(`Labor Cost: $${workOrder.labor_cost}`, 20, y);
      y += 6;
    }
    y += 4;
  }

  // Completion Notes
  if (workOrder.completion_notes) {
    doc.setFontSize(14);
    doc.text('Completion Notes', 20, y);
    y += 7;
    doc.setFontSize(11);
    doc.text(workOrder.completion_notes, 20, y, { maxWidth: 170 });
    y += 14;
  }

  // Related Deficiency
  if (includeDeficiencies && workOrder.deficiency_id) {
    try {
      const deficiencies = await window.api.secureOperation('deficiencies.getByEquipmentId', {
        equipmentId: workOrder.equipment_id
      });
      
      const relatedDeficiency = deficiencies.find(d => d.id === workOrder.deficiency_id);
      if (relatedDeficiency) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Related Deficiency', 20, y);
        y += 7;
        doc.setFontSize(11);
        doc.text(`Severity: ${relatedDeficiency.severity}`, 20, y);
        y += 6;
        doc.text(`Description: ${relatedDeficiency.description}`, 20, y, { maxWidth: 170 });
        y += 10;
      }
    } catch (error) {
      console.error('Error loading related deficiency:', error);
    }
  }

  doc.save(`work_order_${workOrder.wo_number || workOrder.id}_report.pdf`);
};

/**
 * Generate Deficiency Report
 */
export const generateDeficiencyPdf = async (deficiency, options = {}) => {
  const {
    includeWorkOrders = true,
    logo
  } = options;

  const doc = new jsPDF();
  let y = 20;

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 150, 10, 40, 20);
    } catch (e) {
      console.error("Error adding logo:", e);
    }
  }

  // Header
  doc.setFontSize(18);
  doc.text('Deficiency Report', 20, y);
  y += 15;

  // Deficiency Details
  doc.setFontSize(12);
  doc.text(`Equipment: ${deficiency.equipment_identifier || deficiency.equipment_id || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Severity: ${deficiency.severity || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Status: ${deficiency.status || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Component: ${deficiency.component || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Remove from Service: ${deficiency.remove_from_service ? 'Yes' : 'No'}`, 20, y);
  y += 7;
  doc.text(`Due Date: ${deficiency.due_date || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Created: ${deficiency.created_at || 'N/A'}`, 20, y);
  y += 10;

  // Description
  doc.setFontSize(14);
  doc.text('Description', 20, y);
  y += 7;
  doc.setFontSize(11);
  doc.text(deficiency.description || 'N/A', 20, y, { maxWidth: 170 });
  y += 14;

  // Corrective Action
  if (deficiency.corrective_action) {
    doc.setFontSize(14);
    doc.text('Corrective Action', 20, y);
    y += 7;
    doc.setFontSize(11);
    doc.text(deficiency.corrective_action, 20, y, { maxWidth: 170 });
    y += 14;
  }

  // Related Work Orders
  if (includeWorkOrders && deficiency.work_order_id) {
    try {
      const workOrders = await window.api.secureOperation('workOrders.getByEquipmentId', {
        equipmentId: deficiency.equipment_id
      });
      
      const relatedWorkOrder = workOrders.find(wo => wo.id === deficiency.work_order_id);
      if (relatedWorkOrder) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Related Work Order', 20, y);
        y += 7;
        doc.setFontSize(11);
        doc.text(`WO Number: ${relatedWorkOrder.wo_number}`, 20, y);
        y += 6;
        doc.text(`Status: ${relatedWorkOrder.status}`, 20, y);
        y += 6;
        doc.text(`Title: ${relatedWorkOrder.title}`, 20, y, { maxWidth: 170 });
        y += 10;
      }
    } catch (error) {
      console.error('Error loading related work order:', error);
    }
  }

  doc.save(`deficiency_${deficiency.id}_report.pdf`);
};

/**
 * Generate Compliance Summary Report
 */
export const generateCompliancePdf = async (equipmentList, options = {}) => {
  const {
    includeOverdue = true,
    includeCritical = true,
    logo
  } = options;

  const doc = new jsPDF();
  let y = 20;

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 150, 10, 40, 20);
    } catch (e) {
      console.error("Error adding logo:", e);
    }
  }

  // Header
  doc.setFontSize(18);
  doc.text('Compliance Summary Report', 20, y);
  y += 10;
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
  y += 20;

  // Equipment Compliance Status
  doc.setFontSize(14);
  doc.text('Equipment Compliance Status', 20, y);
  y += 10;

  // Table Header
  doc.setFontSize(10);
  doc.text('Equipment', 20, y);
  doc.text('Type', 70, y);
  doc.text('Last Inspection', 110, y);
  doc.text('Status', 160, y);
  y += 7;
  doc.line(20, y-2, 190, y-2);

  try {
    const complianceData = await window.api.secureOperation('inspections.getComplianceStatus', {});
    
    complianceData.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const lastInspection = item.last_inspection_date || 'Never';
      const isOverdue = item.last_inspection_date && 
        new Date(item.last_inspection_date) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const hasCriticalIssues = item.critical_failures > 0 || item.open_critical_deficiencies > 0;
      
      let status = 'OK';
      let color = 'green';
      
      if (hasCriticalIssues) {
        status = 'Critical';
        color = 'red';
      } else if (isOverdue) {
        status = 'Overdue';
        color = 'orange';
      }

      doc.text(item.equipment_identifier || 'N/A', 20, y);
      doc.text(item.type || 'N/A', 70, y);
      doc.text(lastInspection, 110, y);
      doc.setTextColor(color);
      doc.text(status, 160, y);
      doc.setTextColor('black');
      y += 7;
    });

  } catch (error) {
    console.error('Error loading compliance data:', error);
    doc.text('Error loading compliance data', 20, y);
  }

  doc.save(`compliance_summary_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Generate Load Test Certificate
 */
export const generateLoadTestCertificate = (loadTest, equipment, options = {}) => {
  const { logo } = options;
  
  const doc = new jsPDF();
  let y = 30;

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 150, 10, 40, 20);
    } catch (e) {
      console.error("Error adding logo:", e);
    }
  }

  // Certificate Header
  doc.setFontSize(20);
  doc.text('LOAD TEST CERTIFICATE', 105, y, { align: 'center' });
  y += 20;

  // Certificate Number
  doc.setFontSize(12);
  doc.text(`Certificate No: ${loadTest.certificate_number || 'N/A'}`, 105, y, { align: 'center' });
  y += 20;

  // Equipment Information
  doc.setFontSize(14);
  doc.text('EQUIPMENT INFORMATION', 20, y);
  y += 10;
  doc.setFontSize(11);
  doc.text(`Equipment ID: ${equipment.equipment_id || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Type: ${equipment.type || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Manufacturer: ${equipment.manufacturer || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Model: ${equipment.model || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Serial Number: ${equipment.serial_number || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Location: ${equipment.location || 'N/A'}`, 20, y);
  y += 15;

  // Test Information
  doc.setFontSize(14);
  doc.text('TEST INFORMATION', 20, y);
  y += 10;
  doc.setFontSize(11);
  doc.text(`Test Date: ${loadTest.test_date || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Test Type: ${loadTest.test_type || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Rated Capacity: ${loadTest.rated_capacity || 'N/A'} lbs`, 20, y);
  y += 7;
  doc.text(`Test Load: ${loadTest.test_load || 'N/A'} lbs (${loadTest.test_load_percentage || 'N/A'}%)`, 20, y);
  y += 7;
  doc.text(`Test Duration: ${loadTest.test_duration || 'N/A'} minutes`, 20, y);
  y += 7;
  doc.text(`Inspector: ${loadTest.inspector || 'N/A'}`, 20, y);
  y += 15;

  // Test Results
  doc.setFontSize(14);
  doc.text('TEST RESULTS', 20, y);
  y += 10;
  doc.setFontSize(11);
  const result = loadTest.test_results || 'N/A';
  doc.setTextColor(result === 'pass' ? 'green' : 'red');
  doc.text(`Result: ${result.toUpperCase()}`, 20, y);
  doc.setTextColor('black');
  y += 10;

  if (loadTest.deficiencies_found) {
    doc.text('Deficiencies Found:', 20, y);
    y += 7;
    doc.text(loadTest.deficiencies_found, 25, y, { maxWidth: 160 });
    y += 14;
  }

  if (loadTest.corrective_actions) {
    doc.text('Corrective Actions:', 20, y);
    y += 7;
    doc.text(loadTest.corrective_actions, 25, y, { maxWidth: 160 });
    y += 14;
  }

  // Next Test Due
  if (loadTest.next_test_due) {
    doc.text(`Next Test Due: ${loadTest.next_test_due}`, 20, y);
    y += 15;
  }

  // Certification Statement
  y += 10;
  doc.setFontSize(12);
  doc.text('CERTIFICATION', 105, y, { align: 'center' });
  y += 10;
  doc.setFontSize(10);
  const certText = `This certifies that the above equipment has been load tested in accordance with applicable standards and regulations. The test was conducted by a qualified inspector and the equipment ${result === 'pass' ? 'PASSED' : 'FAILED'} the required test.`;
  doc.text(certText, 20, y, { maxWidth: 170, align: 'justify' });
  y += 25;

  // Signature line
  doc.line(20, y, 100, y);
  y += 7;
  doc.text('Inspector Signature', 20, y);
  doc.text(`Date: ${loadTest.test_date || ''}`, 120, y);

  doc.save(`load_test_certificate_${loadTest.certificate_number || loadTest.id}.pdf`);
};

/**
 * Generate Calibration Certificate
 */
export const generateCalibrationCertificate = (calibration, equipment, options = {}) => {
  const { logo } = options;
  
  const doc = new jsPDF();
  let y = 30;

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 150, 10, 40, 20);
    } catch (e) {
      console.error("Error adding logo:", e);
    }
  }

  // Certificate Header
  doc.setFontSize(20);
  doc.text('CALIBRATION CERTIFICATE', 105, y, { align: 'center' });
  y += 20;

  // Certificate Number
  doc.setFontSize(12);
  doc.text(`Certificate No: ${calibration.certificate_number || 'N/A'}`, 105, y, { align: 'center' });
  y += 20;

  // Equipment Information
  doc.setFontSize(14);
  doc.text('INSTRUMENT INFORMATION', 20, y);
  y += 10;
  doc.setFontSize(11);
  doc.text(`Equipment ID: ${equipment.equipment_id || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Instrument Type: ${calibration.instrument_type || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Manufacturer: ${equipment.manufacturer || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Model: ${equipment.model || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Serial Number: ${equipment.serial_number || 'N/A'}`, 20, y);
  y += 15;

  // Calibration Information
  doc.setFontSize(14);
  doc.text('CALIBRATION INFORMATION', 20, y);
  y += 10;
  doc.setFontSize(11);
  doc.text(`Calibration Date: ${calibration.calibration_date || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Due Date: ${calibration.calibration_due_date || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Calibrated By: ${calibration.calibrated_by || 'N/A'}`, 20, y);
  y += 7;
  doc.text(`Calibration Agency: ${calibration.calibration_agency || 'N/A'}`, 20, y);
  y += 15;

  // Calibration Results
  doc.setFontSize(14);
  doc.text('CALIBRATION RESULTS', 20, y);
  y += 10;
  doc.setFontSize(11);
  const result = calibration.calibration_results || 'N/A';
  doc.setTextColor(result === 'pass' ? 'green' : result === 'fail' ? 'red' : 'orange');
  doc.text(`Result: ${result.toUpperCase()}`, 20, y);
  doc.setTextColor('black');
  y += 10;

  if (calibration.accuracy_tolerance) {
    doc.text(`Required Tolerance: ${calibration.accuracy_tolerance}`, 20, y);
    y += 7;
  }
  if (calibration.actual_accuracy) {
    doc.text(`Actual Accuracy: ${calibration.actual_accuracy}`, 20, y);
    y += 7;
  }
  if (calibration.adjustments_made) {
    doc.text('Adjustments Made:', 20, y);
    y += 7;
    doc.text(calibration.adjustments_made, 25, y, { maxWidth: 160 });
    y += 14;
  }

  // Notes
  if (calibration.notes) {
    doc.text('Notes:', 20, y);
    y += 7;
    doc.text(calibration.notes, 25, y, { maxWidth: 160 });
    y += 15;
  }

  // Certification Statement
  y += 10;
  doc.setFontSize(12);
  doc.text('CERTIFICATION', 105, y, { align: 'center' });
  y += 10;
  doc.setFontSize(10);
  const certText = `This certifies that the above instrument has been calibrated using traceable standards and procedures. The calibration was performed by qualified personnel and the instrument ${result === 'pass' ? 'MEETS' : result === 'fail' ? 'DOES NOT MEET' : 'MEETS WITH LIMITATIONS'} the required accuracy specifications.`;
  doc.text(certText, 20, y, { maxWidth: 170, align: 'justify' });
  y += 25;

  // Signature line
  doc.line(20, y, 100, y);
  y += 7;
  doc.text('Calibration Technician', 20, y);
  doc.text(`Date: ${calibration.calibration_date || ''}`, 120, y);

  doc.save(`calibration_certificate_${calibration.certificate_number || calibration.id}.pdf`);
};
