import React from 'react';
import { CELL_SIZE, MODES } from '../../constants';

const DoorLayer = ({ doors = [], onDoorDelete, mode, hoveredObject, selectedIds }) => {
  return (
    <svg className="hulls-svg-layer" style={{ pointerEvents: 'none' }}>
      <g className="doors-layer">
        {(doors || []).map(door => {
          // Проверяем, наведена ли мышь на эту дверь в режиме удаления
          const isHoveredForDelete = hoveredObject?.type === 'door' && hoveredObject.id === door.id;
          const isSelected = (selectedIds || []).includes(door.id);

          return (
            <g 
              key={door.id} 
              transform={`translate(${door.x}, ${door.y}) rotate(${door.angle})`}
            >
              <rect
                 x={-(door.w || 1) * CELL_SIZE / 2 - 2} 
                 y={-(door.h || 1) * CELL_SIZE / 2 - 2}
                 width={(door.w || 1) * CELL_SIZE + 4} 
                 height={(door.h || 1) * CELL_SIZE + 4}
                 fill="none"
                 stroke={isSelected ? "#219ebc" : "none"}
                 strokeWidth="2"
                 style={{ pointerEvents: 'none' }}
              />
              <image 
                href={door.svgUrl || "/blocks/door_v1.svg"} 
                x={-(door.w || 1) * CELL_SIZE / 2} 
                y={-(door.h || 1) * CELL_SIZE / 2} 
                width={(door.w || 1) * CELL_SIZE} 
                height={(door.h || 1) * CELL_SIZE}
                
                // Класс подсветки
                className={`door-image ${isHoveredForDelete ? 'delete-hover' : ''}`}
                
                // Важно для работы кликов внутри SVG с pointer-events: none у родителя
                style={{ pointerEvents: 'auto', userSelect: 'none', cursor: 'pointer' }}
                
                // Удаление правой кнопкой в режиме DOOR
                onContextMenu={(e) => {
                  if (mode === MODES.DOOR) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onDoorDelete) onDoorDelete(door.id);
                  }
                }}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export default DoorLayer;
