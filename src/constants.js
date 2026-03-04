export const GRID_SIZE_MM = 5;
export const PX_PER_MM = 3.78;
export const CELL_SIZE = Math.round(GRID_SIZE_MM * PX_PER_MM);

export const ZOOM_CONFIG = {
  MIN: 0.5,
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
  { id: 'hull_1x1', name: 'Блок 1x1', w: 1, h: 1, color: '#3a86ff', svgUrl: 'src/blocks/cabin_2x2.svg' },
  { id: 'hull_2x2', name: 'Кабина 2x2', w: 2, h: 2, color: '#00b4d8', svgUrl: 'src/blocks/cabin_2x2.svg' },
  { id: 'engine_1x2', name: 'Двигатель 1x2', w: 1, h: 2, color: '#fb8500', svgUrl: 'src/blocks/engine_1x2.svg' },
  { id: 'wing_3x1', name: 'Крыло 3x1', w: 3, h: 1, color: '#8e9aaf', svgUrl: 'src/blocks/wing_3x1.svg' },
  { id: 'test_5x5', name: 'Тест 5x5', w: 3, h: 3, color: '#8b1414', svgUrl: 'src/blocks/accelerate-svgrepo-com.svg' },
];

export const COLORS = {
  space: '#ffffff',
  grid: 'rgba(0, 0, 0, 0.08)',
  accent: '#219ebc',
  anchor: '#e63946'
};