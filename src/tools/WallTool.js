import { generateId } from '../utils/geometry';

export const WallTool = {
  onMouseDown: (e, ctx) => {
    if (e.button !== 0) return;
    const { gx, gy, currentWall, setCurrentWall, walls, setWalls, saveToHistory, blocks, hulls, doors } = ctx;

    if (currentWall.length === 0) {
      setCurrentWall([{ x: gx, y: gy }]);
    } else {
      const p1 = currentWall[0];
      const p2 = { x: gx, y: gy };

      if (p1.x !== p2.x || p1.y !== p2.y) {
        const newWall = { id: generateId(), nodes: [p1, p2] };
        const nextWalls = [...walls, newWall];
        setWalls(nextWalls);
        saveToHistory(blocks, hulls, nextWalls, doors);
      }
      setCurrentWall([]);
    }
  },

  onMouseMove: () => {},
  onMouseUp: () => {}
};
