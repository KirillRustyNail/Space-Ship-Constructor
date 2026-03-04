import React from 'react';
import { MODES } from '../../constants';

const WallLayer = ({ walls, currentWall = [], mode, layer, hoveredCell, onNodeMouseDown, onNodeDelete }) => {
  return (
    <svg className="hulls-svg-layer" style={{ pointerEvents: 'none' }}>
      {layer === 'background' && (
        <g className="walls-layer">
          {walls.map(wall => (
            <polyline
              key={wall.id}
              points={wall.nodes.map(p => `${p.x},${p.y}`).join(' ')}
              className="wall-line"
            />
          ))}
          {/* Elastic line while drawing */}
          {mode === MODES.WALL && currentWall.length === 1 && hoveredCell && (
            <line 
                x1={currentWall[0].x} y1={currentWall[0].y}
                x2={hoveredCell.x} y2={hoveredCell.y}
                className="wall-line active-wall-line"
                style={{ strokeOpacity: 0.6, strokeDasharray: '4,4' }}
            />
          )}
        </g>
      )}
      {layer === 'interface' && (
        <>
          {mode === MODES.EDIT && (
            <g style={{ pointerEvents: 'auto' }}>
              {walls.map((wall, wIdx) => (
                wall.nodes.map((p, nIdx) => (
                  <circle
                    key={`wall-${wall.id}-${nIdx}`}
                    cx={p.x} cy={p.y} r={5}
                    className="edit-node-handle wall-node"
                    onMouseDown={(e) => { e.stopPropagation(); onNodeMouseDown(e, wIdx, nIdx); }}
                    onContextMenu={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      onNodeDelete(wIdx, nIdx); 
                    }}
                  />
                ))
              ))}
            </g>
          )}
          {mode === MODES.WALL && currentWall.map((p, i) => (
            <circle key={`wall-cur-${i}`} cx={p.x} cy={p.y} r={4} fill="#457b9d" />
          ))}
        </>
      )}
    </svg>
  );
};

export default WallLayer;
