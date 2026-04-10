import { generateId, checkCollision, getEffectiveSize } from '../utils/geometry';
import { CELL_SIZE } from '../constants';

export const BlockTool = {
  onMouseDown: (e, ctx) => {
    if (e.button !== 0) return;
    const { world, selectedTemplate, currentRotation, blocks, setBlocks, saveToHistory, hulls, walls, doors } = ctx;

    const bx = Math.floor(world.x / CELL_SIZE) * CELL_SIZE;
    const by = Math.floor(world.y / CELL_SIZE) * CELL_SIZE;
    const eff = getEffectiveSize(selectedTemplate, currentRotation);
    
    if (!checkCollision(bx, by, eff.w, eff.h, blocks)) {
      const newBlock = {
        id: generateId(),
        x: bx,
        y: by,
        type: selectedTemplate.id,
        rotation: currentRotation,
      };
      const nextBlocks = [...blocks, newBlock];
      setBlocks(nextBlocks);
      saveToHistory(nextBlocks, hulls, walls, doors);
    }
  },

  onMouseMove: () => {},
  onMouseUp: () => {}
};
