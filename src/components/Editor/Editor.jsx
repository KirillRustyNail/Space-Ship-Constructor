import React, { useState, useRef, useEffect } from 'react';
import ClipperLib from 'clipper-lib';
import { CELL_SIZE, COLORS, MODES, BLOCK_TEMPLATES } from '../../constants';
import HullLayer from './HullLayer';
import WallLayer from './WallLayer';
import './Editor.css';

const Editor = ({ logic, mode, selectedTemplate, blocks, setBlocks, hulls, setHulls, walls, setWalls, saveToHistory }) => {
  const { camera, setCamera, setAnchorPoint, anchorPoint, screenToWorld, handleZoom } = logic;
  const containerRef = useRef(null);

  const [isPanning, setIsPanning] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [mouseWorld, setMouseWorld] = useState({ x: 0, y: 0 });
  const [currentRotation, setCurrentRotation] = useState(0); // 0, 90, 180, 270

  const [currentHull, setCurrentHull] = useState([]);
  const [currentWall, setCurrentWall] = useState([]);
  const [draggingNode, setDraggingNode] = useState(null); // {hIdx, nIdx} or {wIdx, nIdx}
  const [draggingWallNode, setDraggingWallNode] = useState(null);

  const getEffectiveSize = (template, rot) => {
    return (rot === 90 || rot === 270) 
      ? { w: template.h, h: template.w } 
      : { w: template.w, h: template.h };
  };

  const checkCollision = (bx, by, bw, bh) => {
    const r1 = { x1: bx, y1: by, x2: bx + bw * CELL_SIZE, y2: by + bh * CELL_SIZE };
    return blocks.some(b => {
      const t = BLOCK_TEMPLATES.find(temp => temp.id === b.type);
      const eff = getEffectiveSize(t, b.rotation || 0);
      const r2 = { x1: b.x, y1: b.y, x2: b.x + eff.w * CELL_SIZE, y2: b.y + eff.h * CELL_SIZE };
      return r1.x1 < r2.x2 && r1.x2 > r2.x1 && r1.y1 < r2.y2 && r1.y2 > r2.y1;
    });
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
      id: Math.random(),
      nodes: path.map(p => {
        const x = p.X / scale;
        const y = p.Y / scale;
        return { x, y, isRounded: metaMap.get(`${x},${y}`) || false };
      })
    }));

    setHulls(nextHulls);
    saveToHistory(blocksRef.current, nextHulls, wallsRef.current);
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
        if (currentHull.length >= 3 && Math.hypot(gx - currentHull[0].x, gy - currentHull[0].y) < CELL_SIZE / 2) {
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
          // Only create wall if points are different
          if (p1.x !== p2.x || p1.y !== p2.y) {
            const newWall = { id: Math.random(), nodes: [p1, p2] };
            const nextWalls = JSON.parse(JSON.stringify(wallsRef.current));
            nextWalls.push(newWall);
            setWalls(nextWalls);
            saveToHistory(blocksRef.current, hullsRef.current, nextWalls);
          }
          setCurrentWall([]);
        }
      } else if (mode === MODES.ADD) {
        const bx = Math.floor(world.x / CELL_SIZE) * CELL_SIZE;
        const by = Math.floor(world.y / CELL_SIZE) * CELL_SIZE;
        const eff = getEffectiveSize(selectedTemplate, currentRotation);
        if (!checkCollision(bx, by, eff.w, eff.h)) {
          const newBlock = { id: Date.now(), x: bx, y: by, type: selectedTemplate.id, rotation: currentRotation };
          const nextBlocks = JSON.parse(JSON.stringify(blocksRef.current));
          nextBlocks.push(newBlock);
          setBlocks(nextBlocks);
          saveToHistory(nextBlocks, hullsRef.current, wallsRef.current);
        }
      } else if (mode === MODES.DELETE) {
        let changed = false;
        const nextBlocks = blocksRef.current.filter(b => {
          const t = BLOCK_TEMPLATES.find(temp => temp.id === b.type);
          const eff = getEffectiveSize(t, b.rotation || 0);
          const match = (mouseWorld.x >= b.x && mouseWorld.x <= b.x + eff.w * CELL_SIZE && mouseWorld.y >= b.y && mouseWorld.y <= b.y + eff.h * CELL_SIZE);
          if (match) changed = true;
          return !match;
        });

        const nextWalls = wallsRef.current.filter(wall => {
            const isClickNearLine = wall.nodes.some((p, i) => {
                if (i === 0) return false;
                const p1 = wall.nodes[i - 1];
                const p2 = p;
                const L2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
                if (L2 === 0) return false;
                const t = ((mouseWorld.x - p1.x) * (p2.x - p1.x) + (mouseWorld.y - p1.y) * (p2.y - p1.y)) / L2;
                const tt = Math.max(0, Math.min(1, t));
                const dist = Math.hypot(mouseWorld.x - (p1.x + tt * (p2.x - p1.x)), mouseWorld.y - (p1.y + tt * (p2.y - p1.y)));
                return dist < 10;
            });
            if (isClickNearLine) changed = true;
            return !isClickNearLine;
        });

        if (changed) {
          setBlocks(nextBlocks);
          setWalls(nextWalls);
          saveToHistory(nextBlocks, hullsRef.current, nextWalls);
        }
      }
    }
  };

  // Refs to track current state for history saving after drags
  const hullsRef = useRef(hulls);
  const wallsRef = useRef(walls);
  const blocksRef = useRef(blocks);

  useEffect(() => { hullsRef.current = hulls; }, [hulls]);
  useEffect(() => { wallsRef.current = walls; }, [walls]);
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);

  const handleMouseMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const world = screenToWorld(e.clientX, e.clientY, rect);
    setMouseWorld(world);
    if (isPanning) setCamera(c => ({ ...c, x: c.x + e.movementX, y: c.y + e.movementY }));
    
    if (draggingNode && mode === MODES.EDIT) {
      const nextHulls = JSON.parse(JSON.stringify(hullsRef.current));
      const hull = nextHulls[draggingNode.hIdx];
      if (hull) {
        hull.nodes[draggingNode.nIdx].x = Math.round(world.x / CELL_SIZE) * CELL_SIZE;
        hull.nodes[draggingNode.nIdx].y = Math.round(world.y / CELL_SIZE) * CELL_SIZE;
        setHulls(nextHulls);
      }
    }
    
    if (draggingWallNode && mode === MODES.EDIT) {
      const nextWalls = JSON.parse(JSON.stringify(wallsRef.current));
      const wall = nextWalls[draggingWallNode.wIdx];
      if (wall) {
        wall.nodes[draggingWallNode.nIdx].x = Math.round(world.x / CELL_SIZE) * CELL_SIZE;
        wall.nodes[draggingWallNode.nIdx].y = Math.round(world.y / CELL_SIZE) * CELL_SIZE;
        setWalls(nextWalls);
      }
    }

    const snap = (mode === MODES.HULL || mode === MODES.SUB_HULL || mode === MODES.EDIT || mode === MODES.WALL) ? Math.round : Math.floor;
    setHoveredCell({ x: snap(world.x / CELL_SIZE) * CELL_SIZE, y: snap(world.y / CELL_SIZE) * CELL_SIZE });
  };

  const handleMouseUp = () => {
    if (draggingNode || draggingWallNode) {
      saveToHistory(blocksRef.current, hullsRef.current, wallsRef.current);
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
        <HullLayer layer="background" hulls={hulls} currentHull={currentHull} mode={mode} />
        
        {/* Layer 1.5: Walls */}
        <WallLayer layer="background" walls={walls} currentWall={currentWall} mode={mode} hoveredCell={hoveredCell} onNodeMouseDown={() => {}} />

        {/* Layer 2: Blocks */}
        {blocks.map(b => {
          const t = BLOCK_TEMPLATES.find(temp => temp.id === b.type);
          const eff = getEffectiveSize(t, b.rotation || 0);
          return (
            <div key={b.id} className="block" 
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

        {/* Layer 3: HUD / Interface Layer */}
        <HullLayer 
          layer="interface"
          hulls={hulls} currentHull={currentHull} mode={mode} 
          onNodeMouseDown={(e, h, n) => { e.stopPropagation(); setDraggingNode({hIdx: h, nIdx: n}); }}
          onNodeClick={(hIdx, nIdx) => {
            const nextHulls = JSON.parse(JSON.stringify(hullsRef.current));
            nextHulls[hIdx].nodes[nIdx].isRounded = !nextHulls[hIdx].nodes[nIdx].isRounded;
            setHulls(nextHulls);
            saveToHistory(blocksRef.current, nextHulls, wallsRef.current);
          }}
          onNodeDelete={(hIdx, nIdx) => {
            let nextHulls = JSON.parse(JSON.stringify(hullsRef.current));
            nextHulls[hIdx].nodes.splice(nIdx, 1);
            if (nextHulls[hIdx].nodes.length < 3) nextHulls.splice(hIdx, 1);
            setHulls(nextHulls);
            saveToHistory(blocksRef.current, nextHulls, wallsRef.current);
          }}
        />

        <WallLayer 
            layer="interface" 
            walls={walls} currentWall={currentWall} mode={mode}
            onNodeMouseDown={(e, w, n) => { e.stopPropagation(); setDraggingWallNode({wIdx: w, nIdx: n}); }}
            onNodeDelete={(wIdx, nIdx) => {
              let nextWalls = JSON.parse(JSON.stringify(wallsRef.current));
              nextWalls[wIdx].nodes.splice(nIdx, 1);
              if (nextWalls[wIdx].nodes.length < 2) nextWalls.splice(wIdx, 1);
              setWalls(nextWalls);
              saveToHistory(blocksRef.current, hullsRef.current, nextWalls);
            }}
        />

        {anchorPoint && <div className="anchor-point" style={{ left: anchorPoint.x, top: anchorPoint.y, width: CELL_SIZE, height: CELL_SIZE }} />}
      </div>
    </div>
  );
};
export default Editor;
