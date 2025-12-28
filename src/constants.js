export const GRID_SIZE_MM = 5;
export const PX_PER_MM = 3.78;
export const CELL_SIZE = Math.round(GRID_SIZE_MM * PX_PER_MM);

export const ZOOM_CONFIG = {
  MIN: 1.5,
  MAX: 9.0,
  SENSITIVITY: 0.0015
};

export const MODES = { 
  ADD: 'ADD', 
  DELETE: 'DELETE', 
  HULL: 'HULL',
  SUB_HULL: 'SUB_HULL', // Новый режим
  EDIT: 'EDIT'
};

export const BLOCK_TEMPLATES = [
  { id: 'hull_1x1', name: 'Блок 1x1', w: 1, h: 1, color: '#3a86ff' },
  { id: 'hull_2x2', name: 'Кабина 2x2', w: 2, h: 2, color: '#00b4d8' },
  { id: 'engine_1x2', name: 'Двигатель 1x2', w: 1, h: 2, color: '#fb8500' },
  { id: 'wing_3x1', name: 'Крыло 3x1', w: 3, h: 1, color: '#8e9aaf' },
];

export const COLORS = {
  space: '#ffffff',
  grid: 'rgba(0, 0, 0, 0.08)',
  accent: '#219ebc',
  anchor: '#e63946'
};