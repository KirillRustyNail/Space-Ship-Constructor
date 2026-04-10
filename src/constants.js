export const GRID_SIZE_MM = 5;
export const PX_PER_MM = 3.78;
export const CELL_SIZE = Math.round(GRID_SIZE_MM * PX_PER_MM);
export const MAX_HISTORY = 20;

export const ZOOM_CONFIG = {
  MIN: 0.5,
  MAX: 9.0,
  SENSITIVITY: 0.0015
};

export const MODES = { 
  ADD: 'ADD', 
  DELETE: 'DELETE', 
  HULL: 'HULL',
  SUB_HULL: 'SUB_HULL', 
  EDIT: 'EDIT',
  WALL: 'WALL',
  DOOR: 'DOOR',
  SELECT: 'SELECT'
};


export const BLOCK_TEMPLATES = [
  { id: 'hull_1x1', name: 'Блок 1x1', type: 'block', w: 1, h: 1, svgUrl: 'src/blocks/hull_1x1.svg' },
  { id: 'hull_2x2', name: 'Кабина 2x2',  type: 'block', w: 2, h: 2, svgUrl: 'src/blocks/cabin_2x2.svg' },
  { id: 'engine_1x2', name: 'Двигатель 1x2', type: 'block', w: 1, h: 2, svgUrl: 'src/blocks/engine_1x2.svg' },
  { id: 'wing_3x1', name: 'Крыло 3x1',  type: 'block', w: 3, h: 1, svgUrl: 'src/blocks/wing_3x1.svg' },
  { id: 'test_5x5', name: 'Тест 5x5',  type: 'block', w: 3, h: 3, svgUrl: 'src/blocks/accelerate-svgrepo-com.svg' },
  { id: 'door_v1', name: 'Дверь Стандарт', type: 'door', w: 1, h: 1,  svgUrl: 'src/blocks/doors/door1.svg' },
  { id: 'door_v2', name: 'Дверь Герметик', type: 'door', w: 2, h: 1,  svgUrl: 'src/blocks/doors/door2.svg' },
  { id: 'door_v3', name: 'Дверь Герметик', type: 'door', w: 10, h: 10,  svgUrl: 'src/blocks/doors/door3.svg' },

];

export const COLORS = {
  space: '#ffffff',
  grid: 'rgba(0, 0, 0, 0.08)',
  accent: '#219ebc',
  anchor: '#e63946',
  wall: '#457b9d',
  door: '#ffca3a'
};
