import React, { useState, useRef} from 'react';
import ClipperLib from 'clipper-lib';
import { CELL_SIZE, COLORS, MODES, BLOCK_TEMPLATES } from '../../constants';
import HullLayer from './HullLayer';
import WallLayer from './WallLayer';
import DoorLayer from './DoorLayer';
import './Editor.css';

// Helper for generating IDs outside the component to satisfy purity rules
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random()}`;
};

const Editor = ({ logic, mode, selectedTemplate, blocks, setBlocks, hulls, setHulls, walls, setWalls, doors, setDoors, saveToHistory, deleteConfig }) => {
  const { camera, setCamera, setAnchorPoint, screenToWorld, handleZoom } = logic;
  const containerRef = useRef(null);

  const [isPanning, setIsPanning] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [mouseWorld, setMouseWorld] = useState({ x: 0, y: 0 });
  const [currentRotation, setCurrentRotation] = useState(0); // 0, 90, 180, 270

  const [currentHull, setCurrentHull] = useState([]);
  const [currentWall, setCurrentWall] = useState([]);
  const [draggingNode, setDraggingNode] = useState(null); // {hIdx, nIdx} or {wIdx, nIdx}
  const [draggingWallNode, setDraggingWallNode] = useState(null);

  const [hoveredObject, setHoveredObject] = useState(null);

  const getEffectiveSize = (template, rot) => {
    return (rot === 90 || rot === 270) 
      ? { w: template.h, h: template.w } 
      : { w: template.w, h: template.h };
  };

  const checkCollision = (bx, by, bw, bh) => {
    const r1 = { x1: bx, y1: by, x2: bx + bw * CELL_SIZE, y2: by + bh * CELL_SIZE };
    return (blocks || []).some(b => {
      const t = BLOCK_TEMPLATES.find(temp => temp.id === b.type);
      if (!t) return false;
      const eff = getEffectiveSize(t, b.rotation || 0);
      const r2 = { x1: b.x, y1: b.y, x2: b.x + eff.w * CELL_SIZE, y2: b.y + eff.h * CELL_SIZE };
      return r1.x1 < r2.x2 && r1.x2 > r2.x1 && r1.y1 < r2.y2 && r1.y2 > r2.y1;
    });
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

  const processBooleanHulls = (newPoints, isSubtract = false) => {
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

  const findNearestWallPoint = (mx, my) => {
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

  const handleMouseDown = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const world = screenToWorld(e.clientX, e.clientY, rect);
    if (e.button === 1) return setIsPanning(true);

    const gx = Math.round(world.x / CELL_SIZE) * CELL_SIZE;
    const gy = Math.round(world.y / CELL_SIZE) * CELL_SIZE;

    if (e.button === 2) {
      if (mode === MODES.ADD) {
        setCurrentRotation((prev) => (prev + 90) % 360);
      } else {
        setAnchorPoint({ x: gx, y: gy });
      }
      return;
    }

    if (e.button === 0) {
      if (mode === MODES.HULL || mode === MODES.SUB_HULL) {
        if (
          currentHull.length >= 3 &&
          Math.hypot(gx - currentHull[0].x, gy - currentHull[0].y) <
            CELL_SIZE / 2
        ) {
          processBooleanHulls(currentHull, mode === MODES.SUB_HULL);
          setCurrentHull([]);
        } else {
          setCurrentHull([...currentHull, { x: gx, y: gy, isRounded: false }]);
        }
      } else if (mode === MODES.WALL) {
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
      } else if (mode === MODES.DOOR) {
        const best = findNearestWallPoint(world.x, world.y);
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
      } else if (mode === MODES.ADD) {
        const bx = Math.floor(world.x / CELL_SIZE) * CELL_SIZE;
        const by = Math.floor(world.y / CELL_SIZE) * CELL_SIZE;
        const eff = getEffectiveSize(selectedTemplate, currentRotation);
        if (!checkCollision(bx, by, eff.w, eff.h)) {
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
      } else if (mode === MODES.DELETE && hoveredObject) {
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
          // Удаляем двери, висящие на этой стене
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
          setHoveredObject(null); // Сбрасываем после удаления
        }
      }
    }
  };


  const handleMouseMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const world = screenToWorld(e.clientX, e.clientY, rect);
    setMouseWorld(world);
    if (isPanning)
      setCamera((c) => ({ ...c, x: c.x + e.movementX, y: c.y + e.movementY }));

    if (draggingNode && mode === MODES.EDIT) {
      const nextHulls = JSON.parse(JSON.stringify(hulls));
      const hull = nextHulls[draggingNode.hIdx];
      if (hull) {
        hull.nodes[draggingNode.nIdx].x =
          Math.round(world.x / CELL_SIZE) * CELL_SIZE;
        hull.nodes[draggingNode.nIdx].y =
          Math.round(world.y / CELL_SIZE) * CELL_SIZE;
        setHulls(nextHulls);
      }
    }

    if (draggingWallNode && mode === MODES.EDIT) {
      const nextWalls = JSON.parse(JSON.stringify(walls));
      const wall = nextWalls[draggingWallNode.wIdx];
      if (wall) {
        const nx = Math.round(world.x / CELL_SIZE) * CELL_SIZE;
        const ny = Math.round(world.y / CELL_SIZE) * CELL_SIZE;

        // Only update if moved to a new grid point
        if (
          wall.nodes[draggingWallNode.nIdx].x !== nx ||
          wall.nodes[draggingWallNode.nIdx].y !== ny
        ) {
          wall.nodes[draggingWallNode.nIdx].x = nx;
          wall.nodes[draggingWallNode.nIdx].y = ny;
          setWalls(nextWalls);

          // Update doors attached to this wall
          setDoors((prevDoors) =>
            (prevDoors || []).map((door) => {
              if (door.wallId === wall.id) {
                const p1 = wall.nodes[door.p1Idx];
                const p2 = wall.nodes[door.p2Idx];
                if (p1 && p2) {
                  const dx = p2.x - p1.x;
                  const dy = p2.y - p1.y;
                  return {
                    ...door,
                    x: p1.x + door.t * dx,
                    y: p1.y + door.t * dy,
                    angle: Math.atan2(dy, dx) * (180 / Math.PI),
                  };
                }
              }
              return door;
            }),
          );
        }
      }
    }

    if (mode === MODES.DELETE) {
      let found = null;

      // 1. Проверка блоков (приоритет сверху)
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

      // 2. Проверка дверей
      if (!found && deleteConfig.doors) {
        const door = doors.find(
          (d) => Math.hypot(world.x - d.x, world.y - d.y) < 20,
        );
        if (door) found = { type: "door", id: door.id };
      }

      // 3. Проверка стен
      if (!found && deleteConfig.walls) {
        const wallPoint = findNearestWallPoint(world.x, world.y);
        if (wallPoint) found = { type: "wall", id: wallPoint.wallId };
      }

      // 4. Проверка корпуса
      if (!found && deleteConfig.hulls) {
        const hull = hulls.find((h) => isPointInPoly(world, h.nodes));
        if (hull) found = { type: "hull", id: hull.id };
      }

      setHoveredObject(found);
    } else {
      setHoveredObject(null);
    }

    const snap =
      mode === MODES.HULL ||
      mode === MODES.SUB_HULL ||
      mode === MODES.EDIT ||
      mode === MODES.WALL
        ? Math.round
        : Math.floor;
    setHoveredCell({
      x: snap(world.x / CELL_SIZE) * CELL_SIZE,
      y: snap(world.y / CELL_SIZE) * CELL_SIZE,
    });
  };

  const handleMouseUp = () => {
    if (draggingNode || draggingWallNode) {
      saveToHistory(blocks, hulls, walls, doors);
    }
    setIsPanning(false); 
    setDraggingNode(null); 
    setDraggingWallNode(null);
  };

  return (
    <div className="editor-container" ref={containerRef}
      onWheel={(e) => handleZoom(e, containerRef)}
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={e => e.preventDefault()}
      style={{
        backgroundSize: `${CELL_SIZE * camera.scale}px ${CELL_SIZE * camera.scale}px`,
        backgroundPosition: `${camera.x}px ${camera.y}px`,
        backgroundImage: `linear-gradient(to right, ${COLORS.grid} 1px, transparent 1px), linear-gradient(to bottom, ${COLORS.grid} 1px, transparent 1px)`
      }}>
      <div className="world-layer" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }}>
        
        {/* Layer 1: Background Hulls */}
        <HullLayer layer="background" hulls={hulls} currentHull={currentHull} mode={mode} hoveredObject={hoveredObject} />
        
        {/* Layer 1.5: Walls */}
        <WallLayer layer="background" walls={walls} currentWall={currentWall} mode={mode} hoveredCell={hoveredCell} onNodeMouseDown={() => {} } hoveredObject={hoveredObject} />

        {/* Layer 1.6: Doors */}
        <DoorLayer 
          doors={doors} 
          mode={mode}
          MODES={MODES}
          hoveredObject={hoveredObject}
          onDoorDelete={(doorId) => {
            const nextDoors = (doors || []).filter(d => d.id !== doorId);
            setDoors(nextDoors);
            saveToHistory(blocks, hulls, walls, nextDoors);
          }} 
        />

        {/* Layer 2: Blocks */}
        {(blocks || []).map(b => {
          const t = BLOCK_TEMPLATES.find(temp => temp.id === b.type);
          if (!t) return null;
          const eff = getEffectiveSize(t, b.rotation || 0);
          return (
            <div key={b.id} className={`block ${hoveredObject?.type === 'block' && hoveredObject.id === b.id ? 'delete-hover' : ''}`}
                 style={{ 
                    left: b.x, top: b.y, 
                    width: eff.w * CELL_SIZE, height: eff.h * CELL_SIZE,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                 }}>
              <img 
                src={t.svgUrl} 
                style={{
                  width: t.w * CELL_SIZE, height: t.h * CELL_SIZE,
                  transform: `rotate(${b.rotation || 0}deg)`,
                  objectFit: 'contain'
                }} 
              />
            </div>
          );
        })}

        {/* Ghost block for placement */}
        {mode === MODES.ADD && hoveredCell && (
          <div className={`ghost-block ${checkCollision(hoveredCell.x, hoveredCell.y, getEffectiveSize(selectedTemplate, currentRotation).w, getEffectiveSize(selectedTemplate, currentRotation).h) ? 'invalid' : ''}`}
            style={{ 
              left: hoveredCell.x, top: hoveredCell.y, 
              width: getEffectiveSize(selectedTemplate, currentRotation).w * CELL_SIZE, 
              height: getEffectiveSize(selectedTemplate, currentRotation).h * CELL_SIZE,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
             <img 
              src={selectedTemplate.svgUrl} 
              style={{
                width: selectedTemplate.w * CELL_SIZE, height: selectedTemplate.h * CELL_SIZE,
                transform: `rotate(${currentRotation}deg)`,
                objectFit: 'contain',
                opacity: 0.6
              }} 
            />
          </div>
        )}

        {/* Ghost door for placement */}
        {mode === MODES.DOOR && (
          <svg className="hulls-svg-layer" style={{ pointerEvents: 'none' }}>
            {(() => {
              const best = findNearestWallPoint(mouseWorld.x, mouseWorld.y);
              if (best) {
                const w = selectedTemplate.w || 1;
                const h = selectedTemplate.h || 1;
                return (
                  <g transform={`translate(${best.x}, ${best.y}) rotate(${best.angle})`}>
                    <image 
                      href={selectedTemplate.svgUrl} 
                      x={-w * CELL_SIZE / 2} 
                      y={-h * CELL_SIZE / 2} 
                      width={w * CELL_SIZE} 
                      height={h * CELL_SIZE}
                      style={{ opacity: 0.6, pointerEvents: 'none' }}
                    />
                  </g>
                );
              }
              return null;
            })()}
          </svg>
        )}

        {/* Layer 3: HUD / Interface Layer */}
        <HullLayer 
          layer="interface"
          hulls={hulls} currentHull={currentHull} mode={mode} 
          onNodeMouseDown={(e, h, n) => { e.stopPropagation(); setDraggingNode({hIdx: h, nIdx: n}); }}
          onNodeClick={(hIdx, nIdx) => {
            const nextHulls = JSON.parse(JSON.stringify(hulls));
            nextHulls[hIdx].nodes[nIdx].isRounded = !nextHulls[hIdx].nodes[nIdx].isRounded;
            setHulls(nextHulls);
            saveToHistory(blocks, nextHulls, walls, doors);
          }}
          onNodeDelete={(hIdx, nIdx) => {
            let nextHulls = JSON.parse(JSON.stringify(hulls));
            nextHulls[hIdx].nodes.splice(nIdx, 1);
            if (nextHulls[hIdx].nodes.length < 3) nextHulls.splice(hIdx, 1);
            setHulls(nextHulls);
            saveToHistory(blocks, nextHulls, walls, doors);
          }}
        />

        <WallLayer 
            layer="interface" 
            walls={walls} currentWall={currentWall} mode={mode}
            onNodeMouseDown={(e, w, n) => { e.stopPropagation(); setDraggingWallNode({wIdx: w, nIdx: n}); }}
            onNodeDelete={(wIdx, nIdx) => {
              let nextWalls = JSON.parse(JSON.stringify(walls));
              nextWalls[wIdx].nodes.splice(nIdx, 1);
              if (nextWalls[wIdx].nodes.length < 2) nextWalls.splice(wIdx, 1);
              setWalls(nextWalls);
              saveToHistory(blocks, hulls, nextWalls, doors);
            }}
        />

      </div>
    </div>
  );
};
export default Editor;
