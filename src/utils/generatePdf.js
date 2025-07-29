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

export const generateInspectionPdf = (inspection) => {
  const doc = new jsPDF();

  doc.text('Inspection Report', 20, 10);
  doc.text(`Inspector: ${inspection.inspector}`, 20, 20);
  doc.text(`Inspection Date: ${inspection.inspection_date}`, 20, 30);
  doc.text(`Findings: ${inspection.findings}`, 20, 40);
  doc.text(`Corrective Actions: ${inspection.corrective_actions}`, 20, 50);

  doc.save(`inspection_${inspection.id}_report.pdf`);
};