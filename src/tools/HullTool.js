import ClipperLib from 'clipper-lib';
import { generateId } from '../utils/geometry';
import { CELL_SIZE } from '../constants';

const processBooleanHulls = (newPoints, isSubtract, hulls, setHulls, saveToHistory, blocks, walls, doors) => {
  const clipper = new ClipperLib.Clipper();
  const scale = 100;

  const metaMap = new Map();
  hulls.forEach(h => h.nodes.forEach(n => metaMap.set(`${n.x},${n.y}`, n.isRounded)));
  newPoints.forEach(p => metaMap.set(`${p.x},${p.y}`, p.isRounded || false));

  hulls.forEach(h => {
    clipper.AddPath(h.nodes.map(p => ({ X: p.x * scale, Y: p.y * scale })), ClipperLib.PolyType.ptSubject, true);
  });

  clipper.AddPath(newPoints.map(p => ({ X: p.x * scale, Y: p.y * scale })), ClipperLib.PolyType.ptClip, true);
  
  const solution = new ClipperLib.Paths();
  const clipType = isSubtract ? ClipperLib.ClipType.ctDifference : ClipperLib.ClipType.ctUnion;
  
  clipper.Execute(clipType, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  
  const nextHulls = solution.map(path => ({
    id: generateId(),
    nodes: path.map(p => {
      const x = p.X / scale;
      const y = p.Y / scale;
      return { x, y, isRounded: metaMap.get(`${x},${y}`) || false };
    })
  }));

  setHulls(nextHulls);
  saveToHistory(blocks, nextHulls, walls, doors);
};

export const HullTool = {
  onMouseDown: (e, ctx) => {
    if (e.button !== 0) return;
    
    const { gx, gy, currentHull, setCurrentHull, mode, MODES, hulls, setHulls, saveToHistory, blocks, walls, doors } = ctx;
    const isSubtract = mode === MODES.SUB_HULL;

    if (
      currentHull.length >= 3 &&
      Math.hypot(gx - currentHull[0].x, gy - currentHull[0].y) < CELL_SIZE / 2
    ) {
      processBooleanHulls(currentHull, isSubtract, hulls, setHulls, saveToHistory, blocks, walls, doors);
      setCurrentHull([]);
    } else {
      setCurrentHull([...currentHull, { x: gx, y: gy, isRounded: false }]);
    }
  },
  
  onMouseMove: () => {}, // Hull tool uses click-to-point, visual feedback is handled by React render
  onMouseUp: () => {}
};
