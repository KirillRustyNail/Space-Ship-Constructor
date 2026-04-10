import { BLOCK_TEMPLATES, CELL_SIZE } from '../constants';

const getEffectiveSize = (template, rot) => {
    return (rot === 90 || rot === 270) 
      ? { w: template.h, h: template.w } 
      : { w: template.w, h: template.h };
};

const isPointInPoly = (point, vs) => {
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

const findNearestWallPoint = (mx, my, walls) => {
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
          best = { wallId: wall.id };
        }
      }
    });
    return best;
  };

export default {
  onMouseMove: (e, ctx) => {
    const { world, deleteConfig, blocks, doors, walls, hulls, setHoveredObject, isDraggingSelection, dragStart, setSelectionBox } = ctx;

    if (isDraggingSelection && dragStart) {
        setSelectionBox({ start: dragStart, end: world });
        return;
    }

    let found = null;

    // 1. Blocks
    if (deleteConfig.blocks) {
      const block = [...blocks].reverse().find((b) => {
        const t = BLOCK_TEMPLATES.find((temp) => temp.id === b.type);
        const eff = getEffectiveSize(t, b.rotation || 0);
        return (
          world.x >= b.x &&
          world.x <= b.x + eff.w * CELL_SIZE &&
          world.y >= b.y &&
          world.y <= b.y + eff.h * CELL_SIZE
        );
      });
      if (block) found = { type: "block", id: block.id };
    }

    // 2. Doors
    if (!found && deleteConfig.doors) {
      const door = doors.find((d) => Math.hypot(world.x - d.x, world.y - d.y) < 20);
      if (door) found = { type: "door", id: door.id };
    }

    // 3. Walls
    if (!found && deleteConfig.walls) {
      const wallPoint = findNearestWallPoint(world.x, world.y, walls);
      if (wallPoint) found = { type: "wall", id: wallPoint.wallId };
    }

    // 4. Hulls
    if (!found && deleteConfig.hulls) {
      const hull = hulls.find((h) => isPointInPoly(world, h.nodes));
      if (hull) found = { type: "hull", id: hull.id };
    }

    setHoveredObject(found);
  },

  onMouseDown: (e, ctx) => {
      const { world, hoveredObject, setBlocks, setHulls, setWalls, setDoors, blocks, hulls, walls, doors, saveToHistory, setDragStart, setIsDraggingSelection } = ctx;

      // Start drag area delete if clicked on nothing specific or explicitly holding shift?
      // Or just if clicked on nothing. But here hoveredObject is set.
      
      if (!hoveredObject) {
          setDragStart(world);
          setIsDraggingSelection(true);
          return;
      }

      // Single delete
      let nextBlocks = [...blocks];
      let nextHulls = [...hulls];
      let nextWalls = [...walls];
      let nextDoors = [...doors];
      let changed = false;

      if (hoveredObject.type === "block") {
        nextBlocks = blocks.filter((b) => b.id !== hoveredObject.id);
        changed = true;
      } else if (hoveredObject.type === "hull") {
        nextHulls = hulls.filter((h) => h.id !== hoveredObject.id);
        changed = true;
      } else if (hoveredObject.type === "wall") {
        nextWalls = walls.filter((w) => w.id !== hoveredObject.id);
        nextDoors = doors.filter((d) => d.wallId !== hoveredObject.id);
        changed = true;
      } else if (hoveredObject.type === "door") {
        nextDoors = doors.filter((d) => d.id !== hoveredObject.id);
        changed = true;
      }

      if (changed) {
        setBlocks(nextBlocks);
        setHulls(nextHulls);
        setWalls(nextWalls);
        setDoors(nextDoors);
        saveToHistory(nextBlocks, nextHulls, nextWalls, nextDoors);
        ctx.setHoveredObject(null);
      }
  },

  onMouseUp: (e, ctx) => {
      const { selectionBox, setSelectionBox, setIsDraggingSelection, deleteConfig, blocks, doors, walls, hulls, setBlocks, setDoors, setWalls, setHulls, saveToHistory } = ctx;
      
      if (selectionBox) {
          const box = {
              x: Math.min(selectionBox.start.x, selectionBox.end.x),
              y: Math.min(selectionBox.start.y, selectionBox.end.y),
              w: Math.abs(selectionBox.start.x - selectionBox.end.x),
              h: Math.abs(selectionBox.start.y - selectionBox.end.y)
          };

          let nextBlocks = [...blocks];
          let nextDoors = [...doors];
          let nextWalls = [...walls];
          let nextHulls = [...hulls];
          let changed = false;

          // Delete Blocks
          if (deleteConfig.blocks) {
             const toDelete = nextBlocks.filter(b => {
                 const t = BLOCK_TEMPLATES.find((temp) => temp.id === b.type);
                 if (!t) return false;
                 // Center check
                 const bx = b.x + (t.w * CELL_SIZE)/2; 
                 const by = b.y + (t.h * CELL_SIZE)/2;
                 return bx >= box.x && bx <= box.x + box.w && by >= box.y && by <= box.y + box.h;
             }).map(b => b.id);
             
             if (toDelete.length > 0) {
                 nextBlocks = nextBlocks.filter(b => !toDelete.includes(b.id));
                 changed = true;
             }
          }

          // Delete Doors
          if (deleteConfig.doors) {
             const toDelete = nextDoors.filter(d => 
                 d.x >= box.x && d.x <= box.x + box.w && d.y >= box.y && d.y <= box.y + box.h
             ).map(d => d.id);
             if (toDelete.length > 0) {
                 nextDoors = nextDoors.filter(d => !toDelete.includes(d.id));
                 changed = true;
             }
          }
          
          // Delete Walls (nodes inside)
           if (deleteConfig.walls) {
             const toDelete = nextWalls.filter(w => 
                 w.nodes.some(n => n.x >= box.x && n.x <= box.x + box.w && n.y >= box.y && n.y <= box.y + box.h)
             ).map(w => w.id);
             if (toDelete.length > 0) {
                 nextWalls = nextWalls.filter(w => !toDelete.includes(w.id));
                 // Also delete attached doors
                 nextDoors = nextDoors.filter(d => !toDelete.includes(d.wallId));
                 changed = true;
             }
          }

          // Delete Hulls
           if (deleteConfig.hulls) {
             const toDelete = nextHulls.filter(h => 
                 h.nodes.some(n => n.x >= box.x && n.x <= box.x + box.w && n.y >= box.y && n.y <= box.y + box.h)
             ).map(h => h.id);
             if (toDelete.length > 0) {
                 nextHulls = nextHulls.filter(h => !toDelete.includes(h.id));
                 changed = true;
             }
          }

          if (changed) {
              setBlocks(nextBlocks);
              setDoors(nextDoors);
              setWalls(nextWalls);
              setHulls(nextHulls);
              saveToHistory(nextBlocks, nextHulls, nextWalls, nextDoors);
          }

          setSelectionBox(null);
      }
      
      setIsDraggingSelection(false);
  }
};
