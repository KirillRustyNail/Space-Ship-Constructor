import React, { useState, useRef, useMemo } from 'react';
import ClipperLib from 'clipper-lib';
import { CELL_SIZE, COLORS, MODES, BLOCK_TEMPLATES } from '../../constants';
import { findNearestWallPoint } from '../../utils/geometry';
import HullLayer from './HullLayer';
import WallLayer from './WallLayer';
import DoorLayer from './DoorLayer';
import { getTool } from '../../tools';
import './Editor.css';

// Helper for generating IDs
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random()}`;
};

const Editor = ({ 
  logic, mode, selectedTemplate, 
  blocks, setBlocks, 
  hulls, setHulls, 
  walls, setWalls, 
  doors, setDoors, 
  selectedIds, setSelectedIds,
  selectionConfig,
  saveToHistory, deleteConfig 
}) => {
  const { camera, setCamera, setAnchorPoint, screenToWorld, handleZoom } = logic;
  const containerRef = useRef(null);

  // Editor specific state
  const [isPanning, setIsPanning] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [mouseWorld, setMouseWorld] = useState({ x: 0, y: 0 });
  const [currentRotation, setCurrentRotation] = useState(0); 

  // Drawing state (legacy tools)
  const [currentHull, setCurrentHull] = useState([]);
  const [currentWall, setCurrentWall] = useState([]);
  const [draggingNode, setDraggingNode] = useState(null); 
  const [draggingWallNode, setDraggingWallNode] = useState(null);
  const [hoveredObject, setHoveredObject] = useState(null);

  // Selection / Dragging state (new tools)
  const [selectionBox, setSelectionBox] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);

  // Helpers (can be extracted later)
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

  // Build Context for Tools
  const toolCtx = useMemo(() => ({
    blocks, setBlocks,
    hulls, setHulls,
    walls, setWalls,
    doors, setDoors,
    selectedIds, setSelectedIds,
    selectionConfig,
    deleteConfig,
    hoveredObject, setHoveredObject,
    selectionBox, setSelectionBox,
    dragStart, setDragStart,
    isDraggingSelection, setIsDraggingSelection,
    saveToHistory,
    world: mouseWorld
  }), [blocks, hulls, walls, doors, selectedIds, selectionConfig, deleteConfig, hoveredObject, selectionBox, dragStart, isDraggingSelection, mouseWorld]);

  const handleMouseDown = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const world = screenToWorld(e.clientX, e.clientY, rect);
    // Update context world position immediately for click
    const currentCtx = { ...toolCtx, world };

    if (e.button === 1) return setIsPanning(true);

    const gx = Math.round(world.x / CELL_SIZE) * CELL_SIZE;
    const gy = Math.round(world.y / CELL_SIZE) * CELL_SIZE;

    // Check for Tool
    const tool = getTool(mode);
    if (tool && tool.onMouseDown) {
       tool.onMouseDown(e, currentCtx);
       return;
    }

    // Legacy Logic Fallback
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
          Math.hypot(gx - currentHull[0].x, gy - currentHull[0].y) < CELL_SIZE / 2
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
      } 
    }
  };

  const handleMouseMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const world = screenToWorld(e.clientX, e.clientY, rect);
    setMouseWorld(world);
    const currentCtx = { ...toolCtx, world };

    if (isPanning)
      setCamera((c) => ({ ...c, x: c.x + e.movementX, y: c.y + e.movementY }));

    // Check for Tool
    const tool = getTool(mode);
    if (tool && tool.onMouseMove) {
       tool.onMouseMove(e, currentCtx);
    } else {
       setHoveredObject(null); // Clear generic hover if not in tool mode
    }

    // Legacy Move Logic (Edit Nodes)
    if (draggingNode && mode === MODES.EDIT) {
      const nextHulls = JSON.parse(JSON.stringify(hulls));
      const hull = nextHulls[draggingNode.hIdx];
      if (hull) {
        hull.nodes[draggingNode.nIdx].x = Math.round(world.x / CELL_SIZE) * CELL_SIZE;
        hull.nodes[draggingNode.nIdx].y = Math.round(world.y / CELL_SIZE) * CELL_SIZE;
        setHulls(nextHulls);
      }
    }

    if (draggingWallNode && mode === MODES.EDIT) {
      const nextWalls = JSON.parse(JSON.stringify(walls));
      const wall = nextWalls[draggingWallNode.wIdx];
      if (wall) {
        const nx = Math.round(world.x / CELL_SIZE) * CELL_SIZE;
        const ny = Math.round(world.y / CELL_SIZE) * CELL_SIZE;
        if (wall.nodes[draggingWallNode.nIdx].x !== nx || wall.nodes[draggingWallNode.nIdx].y !== ny) {
          wall.nodes[draggingWallNode.nIdx].x = nx;
          wall.nodes[draggingWallNode.nIdx].y = ny;
          setWalls(nextWalls);
          // Update doors attached to this wall (simplified, needs full logic)
        }
      }
    }

    const snap = (mode === MODES.HULL || mode === MODES.SUB_HULL || mode === MODES.EDIT || mode === MODES.WALL) ? Math.round : Math.floor;
    setHoveredCell({
      x: snap(world.x / CELL_SIZE) * CELL_SIZE,
      y: snap(world.y / CELL_SIZE) * CELL_SIZE,
    });
  };

  const handleMouseUp = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const world = screenToWorld(e.clientX, e.clientY, rect);
    const currentCtx = { ...toolCtx, world };

    const tool = getTool(mode);
    if (tool && tool.onMouseUp) {
       tool.onMouseUp(e, currentCtx);
    }

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
        
        <HullLayer layer="background" hulls={hulls} currentHull={currentHull} mode={mode} hoveredObject={hoveredObject} selectedIds={selectedIds} />
        
        <WallLayer layer="background" walls={walls} currentWall={currentWall} mode={mode} hoveredCell={hoveredCell} onNodeMouseDown={() => {} } hoveredObject={hoveredObject} selectedIds={selectedIds} />

        <DoorLayer 
          doors={doors} 
          mode={mode}
          MODES={MODES}
          hoveredObject={hoveredObject}
          selectedIds={selectedIds} // Pass selection
          onDoorDelete={(doorId) => { /* Legacy delete via context menu if needed */ }} 
        />

        {/* Blocks Layer */}
        {(blocks || []).map(b => {
          const t = BLOCK_TEMPLATES.find(temp => temp.id === b.type);
          if (!t) return null;
          const eff = getEffectiveSize(t, b.rotation || 0);
          const isSelected = selectedIds.includes(b.id);
          const isHoveredDelete = hoveredObject?.type === 'block' && hoveredObject.id === b.id;

          return (
            <div key={b.id} 
                 className={`block ${isHoveredDelete ? 'delete-hover' : ''} ${isSelected ? 'selected-outline' : ''}`}
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

        {/* Selection / Delete Box */}
        {selectionBox && (
            <div 
                className={mode === MODES.DELETE ? "delete-box" : "selection-box"}
                style={{
                    left: Math.min(selectionBox.start.x, selectionBox.end.x),
                    top: Math.min(selectionBox.start.y, selectionBox.end.y),
                    width: Math.abs(selectionBox.start.x - selectionBox.end.x),
                    height: Math.abs(selectionBox.start.y - selectionBox.end.y),
                }}
            />
        )}

        {/* Ghosts and Interface Layers */}
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

        {mode === MODES.DOOR && (
          <svg className="hulls-svg-layer" style={{ pointerEvents: 'none' }}>
            {(() => {
              const best = findNearestWallPoint(mouseWorld.x, mouseWorld.y, walls);
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
          onNodeDelete={(hIdx, nIdx) => { /* Legacy via context menu */ }}
        />

        <WallLayer 
            layer="interface" 
            walls={walls} currentWall={currentWall} mode={mode}
            onNodeMouseDown={(e, w, n) => { e.stopPropagation(); setDraggingWallNode({wIdx: w, nIdx: n}); }}
            onNodeDelete={(wIdx, nIdx) => { /* Legacy via context menu */ }}
        />

      </div>
    </div>
  );
};
export default Editor;
