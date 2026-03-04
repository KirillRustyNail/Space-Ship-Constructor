import React, { useState, useRef } from 'react';
import ClipperLib from 'clipper-lib';
import { CELL_SIZE, COLORS, MODES, BLOCK_TEMPLATES } from '../../constants';
import HullLayer from './HullLayer';
import './Editor.css';

const Editor = ({ logic, mode, selectedTemplate, blocks, setBlocks }) => {
  const { camera, setCamera, setAnchorPoint, anchorPoint, screenToWorld, handleZoom } = logic;
  const containerRef = useRef(null);

  const [isPanning, setIsPanning] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [mouseWorld, setMouseWorld] = useState({ x: 0, y: 0 });
  const [currentRotation, setCurrentRotation] = useState(0); // 0, 90, 180, 270
  
  const [hulls, setHulls] = useState([]);
  const [currentHull, setCurrentHull] = useState([]);
  const [draggingNode, setDraggingNode] = useState(null);

  const getEffectiveSize = (template, rotation) => {
    const isRotated = rotation === 90 || rotation === 270;
    return {
      w: isRotated ? template.h : template.w,
      h: isRotated ? template.w : template.h
    };
  };

  const checkCollision = (bx, by, template, rotation) => {
    const size = getEffectiveSize(template, rotation);
    const r1 = { x1: bx, y1: by, x2: bx + size.w * CELL_SIZE, y2: by + size.h * CELL_SIZE };
    
    return blocks.some(b => {
      const t = BLOCK_TEMPLATES.find(temp => temp.id === b.type);
      const bSize = getEffectiveSize(t, b.rotation || 0);
      const r2 = { x1: b.x, y1: b.y, x2: b.x + bSize.w * CELL_SIZE, y2: b.y + bSize.h * CELL_SIZE };
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
    
    setHulls(solution.map(path => ({
      id: Math.random(),
      nodes: path.map(p => {
        const x = p.X / scale;
        const y = p.Y / scale;
        return { x, y, isRounded: metaMap.get(`${x},${y}`) || false };
      })
    })));
  };

  const handleMouseDown = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const world = screenToWorld(e.clientX, e.clientY, rect);
    if (e.button === 1) return setIsPanning(true);
    
    const gx = Math.round(world.x / CELL_SIZE) * CELL_SIZE;
    const gy = Math.round(world.y / CELL_SIZE) * CELL_SIZE;

    if (e.button === 2) {
      if (mode === MODES.ADD) {
        setCurrentRotation(r => (r + 90) % 360);
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
      } else if (mode === MODES.ADD) {
        const bx = Math.floor(world.x / CELL_SIZE) * CELL_SIZE;
        const by = Math.floor(world.y / CELL_SIZE) * CELL_SIZE;
        if (!checkCollision(bx, by, selectedTemplate, currentRotation)) {
          setBlocks([...blocks, { 
            id: Date.now(), 
            x: bx, 
            y: by, 
            type: selectedTemplate.id,
            rotation: currentRotation
          }]);
        }
      } else if (mode === MODES.DELETE) {
        setBlocks(blocks.filter(b => {
          const t = BLOCK_TEMPLATES.find(temp => temp.id === b.type);
          const size = getEffectiveSize(t, b.rotation || 0);
          return !(mouseWorld.x >= b.x && mouseWorld.x <= b.x + size.w * CELL_SIZE && 
                   mouseWorld.y >= b.y && mouseWorld.y <= b.y + size.h * CELL_SIZE);
        }));
      }
    }
  };

  const handleMouseMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const world = screenToWorld(e.clientX, e.clientY, rect);
    setMouseWorld(world);
    if (isPanning) setCamera(c => ({ ...c, x: c.x + e.movementX, y: c.y + e.movementY }));
    
    if (draggingNode && mode === MODES.EDIT) {
      const newHulls = [...hulls];
      const hull = newHulls[draggingNode.hIdx];
      if (hull) {
        hull.nodes[draggingNode.nIdx].x = Math.round(world.x / CELL_SIZE) * CELL_SIZE;
        hull.nodes[draggingNode.nIdx].y = Math.round(world.y / CELL_SIZE) * CELL_SIZE;
        setHulls(newHulls);
      }
    }

    const snap = (mode === MODES.HULL || mode === MODES.SUB_HULL || mode === MODES.EDIT) ? Math.round : Math.floor;
    setHoveredCell({ x: snap(world.x / CELL_SIZE) * CELL_SIZE, y: snap(world.y / CELL_SIZE) * CELL_SIZE });
  };

  return (
    <div className="editor-container" ref={containerRef}
      onWheel={(e) => handleZoom(e, containerRef)}
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
      onMouseUp={() => { setIsPanning(false); setDraggingNode(null); }}
      onContextMenu={e => e.preventDefault()}
      style={{
        backgroundSize: `${CELL_SIZE * camera.scale}px ${CELL_SIZE * camera.scale}px`,
        backgroundPosition: `${camera.x}px ${camera.y}px`,
        backgroundImage: `linear-gradient(to right, ${COLORS.grid} 1px, transparent 1px), linear-gradient(to bottom, ${COLORS.grid} 1px, transparent 1px)`
      }}>
      <div className="world-layer" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }}>
        {/* Layer 1: Hull background (bottom) */}
        <HullLayer 
          hulls={hulls} 
          currentHull={[]} 
          mode={mode} 
          layer="background" 
        />

        {/* Layer 2: Blocks (middle) */}
        {blocks.map(b => {
          const t = BLOCK_TEMPLATES.find(temp => temp.id === b.type);
          const size = getEffectiveSize(t, b.rotation || 0);
          return (
            <div key={b.id} className="block" style={{ 
              left: b.x, 
              top: b.y, 
              width: size.w * CELL_SIZE, 
              height: size.h * CELL_SIZE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible'
            }}>
              <img 
                src={t.svgUrl} 
                alt={t.name}
                style={{
                  width: t.w * CELL_SIZE,
                  height: t.h * CELL_SIZE,
                  transform: `rotate(${b.rotation || 0}deg)`,
                  pointerEvents: 'none',
                  flexShrink: 0
                }}
              />
            </div>
          );
        })}

        {/* Layer 3: Hull interface (top) */}
        <HullLayer 
          hulls={hulls} currentHull={currentHull} mode={mode} 
          layer="interface"
          onNodeMouseDown={(e, h, n) => { e.stopPropagation(); setDraggingNode({hIdx: h, nIdx: n}); }}
          onNodeClick={(hIdx, nIdx) => {
            const newHulls = [...hulls];
            newHulls[hIdx].nodes[nIdx].isRounded = !newHulls[hIdx].nodes[nIdx].isRounded;
            setHulls(newHulls);
          }}
          onNodeDelete={(hIdx, nIdx) => {
            const newHulls = [...hulls];
            newHulls[hIdx].nodes.splice(nIdx, 1);
            if (newHulls[hIdx].nodes.length < 3) newHulls.splice(hIdx, 1);
            setHulls(newHulls);
          }}
        />

        {mode === MODES.ADD && hoveredCell && (
          <div className={`ghost-block ${checkCollision(hoveredCell.x, hoveredCell.y, selectedTemplate, currentRotation) ? 'invalid' : ''}`}
            style={{ 
              left: hoveredCell.x, 
              top: hoveredCell.y, 
              width: getEffectiveSize(selectedTemplate, currentRotation).w * CELL_SIZE, 
              height: getEffectiveSize(selectedTemplate, currentRotation).h * CELL_SIZE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
             <img 
                src={selectedTemplate.svgUrl} 
                alt="ghost"
                style={{
                  width: selectedTemplate.w * CELL_SIZE,
                  height: selectedTemplate.h * CELL_SIZE,
                  transform: `rotate(${currentRotation}deg)`,
                  opacity: 0.6,
                  pointerEvents: 'none'
                }}
              />
          </div>
        )}
        {anchorPoint && <div className="anchor-point" style={{ left: anchorPoint.x, top: anchorPoint.y, width: CELL_SIZE, height: CELL_SIZE }} />}
      </div>
    </div>
  );
};
export default Editor;
