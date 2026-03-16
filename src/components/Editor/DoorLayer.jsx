import React from 'react';
import { CELL_SIZE } from '../../constants';

const DoorLayer = ({ doors = [], onDoorDelete, mode, MODES }) => {
  return (
    <svg className="hulls-svg-layer" style={{ pointerEvents: 'none' }}>
      <g className="doors-layer">
        {(doors || []).map(door => (
          door && (
            <g 
              key={door.id} 
              transform={`translate(${door.x}, ${door.y}) rotate(${door.angle})`}
            >
              <image 
                href={door.svgUrl || "/blocks/door_v1.svg"} 
                x={-(door.w || 1) * CELL_SIZE / 2} 
                y={-(door.h || 1) * CELL_SIZE / 2} 
                width={(door.w || 1) * CELL_SIZE} 
                height={(door.h || 1) * CELL_SIZE}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (mode === MODES.DOOR && onDoorDelete) {
                    onDoorDelete(door.id);
                  }
                }}
                style={{ pointerEvents: 'auto', userSelect: 'none', cursor: 'pointer' }}
              />
            </g>
          )
        ))}
      </g>
    </svg>
  );
};

export default DoorLayer;
