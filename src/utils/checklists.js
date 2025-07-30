export const checklists = {
  'Overhead Crane': {
    'Structure': [
      { id: 'oc-s-1', text: 'Inspect main girders for damage or corrosion' },
      { id: 'oc-s-2', text: 'Check end trucks for wear and tear' },
    ],
    'Hoisting System': [
      { id: 'oc-h-1', text: 'Inspect hoist brake for proper function' },
      { id: 'oc-h-2', text: 'Check wire rope for kinks or breaks' },
    ],
    'Trolley': [
      { id: 'oc-t-1', text: 'Inspect trolley wheels for wear' },
      { id: 'oc-t-2', text: 'Check trolley frame for cracks' },
    ],
    'Electrics': [
      { id: 'oc-e-1', text: 'Inspect pendant for proper operation' },
      { id: 'oc-e-2', text: 'Check wiring for frays or damage' },
    ],
    'Safety Features': [
      { id: 'oc-sf-1', text: 'Verify limit switches are functional' },
      { id: 'oc-sf-2', text: 'Check warning horn and lights' },
    ],
  },
  'Gantry Crane': {
    'Structure': [
      { id: 'gc-s-1', text: 'Inspect legs and end beams for damage' },
      { id: 'gc-s-2', text: 'Check runway for alignment and wear' },
    ],
    'Hoisting System': [
      { id: 'gc-h-1', text: 'Inspect hoist brake for proper function' },
      { id: 'gc-h-2', text: 'Check wire rope for kinks or breaks' },
    ],
  },
  'Jib': {
    'Structure': [
      { id: 'j-s-1', text: 'Inspect mast and boom for damage' },
      { id: 'j-s-2', text: 'Check foundation for cracks or movement' },
    ],
    'Rotation': [
      { id: 'j-r-1', text: 'Check rotation stops and bearings' },
    ],
  },
  'Monorail': {
    'Track': [
      { id: 'm-t-1', text: 'Inspect monorail track for wear and alignment' },
      { id: 'm-t-2', text: 'Check track splices and hangers' },
    ],
    'Trolley': [
      { id: 'm-tr-1', text: 'Inspect trolley wheels and frame' },
    ],
  },
  'Hoist': {
    'Hoisting System': [
      { id: 'h-h-1', text: 'Inspect hoist brake for proper function' },
      { id: 'h-h-2', text: 'Check chain or wire rope condition' },
      { id: 'h-h-3', text: 'Inspect hook and latch' },
    ],
  },
};

export const getChecklistForEquipment = (equipmentType) => {
  return checklists[equipmentType] || {};
};