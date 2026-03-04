import React from 'react';
import { MODES, COLORS } from '../../constants';

const generatePathData = (nodes, radius = 15) => {
  if (!nodes || nodes.length < 2) return "";
  
  let d = "";
  nodes.forEach((p, i) => {
    const prev = nodes[(i + nodes.length - 1) % nodes.length];
    const next = nodes[(i + 1) % nodes.length];

    if (p.isRounded && nodes.length > 2) {
      const lenPrev = Math.hypot(p.x - prev.x, p.y - prev.y);
      const lenNext = Math.hypot(next.x - p.x, next.y - p.y);
      const r = Math.min(radius, lenPrev / 2, lenNext / 2);

      const startX = p.x - (r * (p.x - prev.x)) / lenPrev;
      const startY = p.y - (r * (p.y - prev.y)) / lenPrev;
      const endX = p.x + (r * (next.x - p.x)) / lenNext;
      const endY = p.y + (r * (next.y - p.y)) / lenNext;

      d += `${i === 0 ? 'M' : 'L'} ${startX} ${startY} Q ${p.x} ${p.y} ${endX} ${endY} `;
    } else {
      d += `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y} `;
    }
  });
  return d + " Z ";
};

const HullLayer = ({ hulls, currentHull, mode, onNodeMouseDown, onNodeClick, onNodeDelete, layer = 'all' }) => {
  return (
    <svg className="hulls-svg-layer">
      {/* Background layer: Только заливка корпуса */}
      {(layer === 'all' || layer === 'background') && (
        <path
          d={hulls.map(h => generatePathData(h.nodes)).join(' ')}
          className="hull-shape"
          fillRule="evenodd"
        />
      )}
      
      {/* Interface layer: Точки редактирования, активные линии и т.д. */}
      {(layer === 'all' || layer === 'interface') && (
        <>
          {currentHull.length > 0 && (
            <polyline
              points={currentHull.map(p => `${p.x},${p.y}`).join(' ')}
              className="hull-active-polyline"
            />
          )}
          {(mode === MODES.HULL || mode === MODES.SUB_HULL) && currentHull.map((p, i) => (
            <circle key={`cur-${i}`} cx={p.x} cy={p.y} r={4} fill={COLORS.accent} />
          ))}
          {mode === MODES.EDIT && hulls.map((hull, hIdx) => (
            hull.nodes.map((p, nIdx) => (
              <circle
                key={`${hull.id}-${nIdx}`}
                cx={p.x} cy={p.y} r={6}
                className={`edit-node-handle ${p.isRounded ? 'is-rounded' : 'is-sharp'}`}
                onMouseDown={(e) => { e.stopPropagation(); onNodeMouseDown(e, hIdx, nIdx); }}
                onClick={(e) => { e.stopPropagation(); onNodeClick(hIdx, nIdx); }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onNodeDelete(hIdx, nIdx); }}
              />
            ))
          ))}
        </>
      )}
    </svg>
  );
};

export default HullLayer;