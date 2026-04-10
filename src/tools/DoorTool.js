import { generateId, findNearestWallPoint } from '../utils/geometry';

export const DoorTool = {
  onMouseDown: (e, ctx) => {
    if (e.button !== 0) return;
    const { world, selectedTemplate, doors, setDoors, saveToHistory, blocks, hulls, walls } = ctx;

    const best = findNearestWallPoint(world.x, world.y, walls);
    if (best) {
      const nextDoors = [
        ...doors,
        {
          id: generateId(),
          type: selectedTemplate.id,
          svgUrl: selectedTemplate.svgUrl,
          w: selectedTemplate.w || 1,
          h: selectedTemplate.h || 1,
          ...best,
        },
      ];
      setDoors(nextDoors);
      saveToHistory(blocks, hulls, walls, nextDoors);
    }
  },

  onMouseMove: () => {},
  onMouseUp: () => {}
};
