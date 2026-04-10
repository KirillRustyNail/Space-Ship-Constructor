import { CELL_SIZE, BLOCK_TEMPLATES } from '../constants';

export const getEffectiveSize = (template, rot) => {
  return (rot === 90 || rot === 270) 
    ? { w: template.h, h: template.w } 
    : { w: template.w, h: template.h };
};

export const checkCollision = (bx, by, bw, bh, blocks) => {
  const r1 = { x1: bx, y1: by, x2: bx + bw * CELL_SIZE, y2: by + bh * CELL_SIZE };
  return (blocks || []).some(b => {
    const t = BLOCK_TEMPLATES.find(temp => temp.id === b.type);
    if (!t) return false;
    const eff = getEffectiveSize(t, b.rotation || 0);
    const r2 = { x1: b.x, y1: b.y, x2: b.x + eff.w * CELL_SIZE, y2: b.y + eff.h * CELL_SIZE };
    return r1.x1 < r2.x2 && r1.x2 > r2.x1 && r1.y1 < r2.y2 && r1.y2 > r2.y1;
  });
};

export const isPointInPoly = (point, vs) => {
  let x = point.x, y = point.y;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      let xi = vs[i].x, yi = vs[i].y;
      let xj = vs[j].x, yj = vs[j].y;
      let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
  }
  return inside;
};

export const findNearestWallPoint = (mx, my, walls) => {
  let best = null;
  let minDist = Infinity;
  
  (walls || []).forEach(wall => {
    if (!wall.nodes) return;
    for (let i = 1; i < wall.nodes.length; i++) {
      const p1 = wall.nodes[i - 1];
      const p2 = wall.nodes[i];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const L2 = dx*dx + dy*dy;
      if (L2 === 0) continue;
      
      let t = ((mx - p1.x) * dx + (my - p1.y) * dy) / L2;
      t = Math.max(0, Math.min(1, t));
      
      const px = p1.x + t * dx;
      const py = p1.y + t * dy;
      const d = Math.hypot(mx - px, my - py);
      
      if (d < minDist && d < 30) {
        minDist = d;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        best = { x: px, y: py, angle, wallId: wall.id, p1Idx: i - 1, p2Idx: i, t };
      }
    }
  });
  return best;
};

export const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random()}`;
};
