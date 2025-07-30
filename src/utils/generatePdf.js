import jsPDF from 'jspdf';

export const generateEquipmentPdf = (equipment) => {
  const doc = new jsPDF();

  doc.text('Equipment Report', 20, 10);
  doc.text(`Manufacturer: ${equipment.manufacturer}`, 20, 20);
  doc.text(`Model: ${equipment.model}`, 20, 30);
  doc.text(`Serial Number: ${equipment.serial_number}`, 20, 40);
  doc.text(`Capacity: ${equipment.capacity}`, 20, 50);
  doc.text(`Installation Date: ${equipment.installation_date}`, 20, 60);
  doc.text(`Location: ${equipment.location}`, 20, 70);
  doc.text(`Status: ${equipment.status}`, 20, 80);

  doc.save(`${equipment.manufacturer}_${equipment.model}_report.pdf`);
};

export const generateInspectionPdf = (inspection, options = {}) => {
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
  doc.text(`Inspector: ${inspection.inspector}`, 20, y);
  doc.text(`Inspection Date: ${inspection.inspection_date}`, 20, y + 7);
  doc.text(`Equipment: ${inspection.equipment_id || ''}`, 20, y + 14);
  y += 24;

  let findings = [];
  try {
    findings = JSON.parse(inspection.findings);
  } catch (e) {
    findings = [];
  }

  const allItems = findings.flatMap(section => section.items);
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
              doc.addImage(photo, 'JPEG', 30, y, 30, 20);
              y += 22;
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
