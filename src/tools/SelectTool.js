import { CELL_SIZE, BLOCK_TEMPLATES } from '../constants';
import { findNearestWallPoint, isPointInPoly } from '../utils/geometry';

// Хелпер для проверки попадания точки в прямоугольник блока
const isPointInRect = (px, py, rect) => {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
};

// Получение границ блока
const getBlockRect = (b) => {
  const t = BLOCK_TEMPLATES.find((temp) => temp.id === b.type);
  if (!t) return { x: 0, y: 0, w: 0, h: 0 };
  const w = (b.rotation === 90 || b.rotation === 270) ? t.h : t.w;
  const h = (b.rotation === 90 || b.rotation === 270) ? t.w : t.h;
  return { x: b.x, y: b.y, w: w * CELL_SIZE, h: h * CELL_SIZE };
};

export default {
  onMouseDown: (e, ctx) => {
    const { world, selectionConfig, blocks, hulls, walls, doors, selectedIds, setSelectedIds, setDragStart, setIsDraggingSelection, setSelectionBox } = ctx;

    // ПКМ - Вращение
    if (e.button === 2) {
      if (selectedIds.length > 0) {
        let changed = false;
        
        // Вращаем блоки
        const nextBlocks = blocks.map(b => {
          if (selectedIds.includes(b.id)) {
            changed = true;
            return { ...b, rotation: (b.rotation + 90) % 360 };
          }
          return b;
        });
        
        // Переворачиваем двери (если они выделены)
        const nextDoors = doors.map(d => {
            if (selectedIds.includes(d.id)) {
                changed = true;
                return { ...d, angle: (d.angle + 180) % 360 }; 
            }
            return d;
        });

        if (changed) {
            ctx.setBlocks(nextBlocks);
            ctx.setDoors(nextDoors);
            ctx.saveToHistory(nextBlocks, hulls, walls, nextDoors);
        }
      }
      return;
    }

    // ЛКМ - Выделение или начало перетаскивания
    
    // Проверяем, кликнули ли мы в уже выделенный объект (для начала перетаскивания)
    let clickedInSelection = false;
    // ... проверка сложная, проще заново найти объект под курсором
    
    let clickedId = null;
    let clickedType = null;

    // 1. Блоки (Приоритет)
    if (selectionConfig.blocks) {
      // Ищем с конца (сверху визуально)
      const block = [...blocks].reverse().find(b => isPointInRect(world.x, world.y, getBlockRect(b)));
      if (block) { clickedId = block.id; clickedType = 'block'; }
    }
    
    // 2. Двери
    if (!clickedId && selectionConfig.doors) {
      const door = doors.find(d => Math.hypot(world.x - d.x, world.y - d.y) < 20);
      if (door) { clickedId = door.id; clickedType = 'door'; }
    }
    
    // 3. Стены
    if (!clickedId && selectionConfig.walls) {
        const wall = walls.find(w => {
           // Проверка узлов
           if (w.nodes.some(n => Math.hypot(world.x - n.x, world.y - n.y) < 15)) return true;
           // Проверка сегментов
           for (let i=0; i<w.nodes.length-1; i++) {
               const p1 = w.nodes[i];
               const p2 = w.nodes[i+1];
               const l2 = (p1.x-p2.x)**2 + (p1.y-p2.y)**2;
               if (l2 === 0) continue;
               let t = ((world.x - p1.x) * (p2.x - p1.x) + (world.y - p1.y) * (p2.y - p1.y)) / l2;
               t = Math.max(0, Math.min(1, t));
               const px = p1.x + t * (p2.x - p1.x);
               const py = p1.y + t * (p2.y - p1.y);
               if (Math.hypot(world.x - px, world.y - py) < 10) return true;
           }
           return false;
       });
       if (wall) { clickedId = wall.id; clickedType = 'wall'; }
    }

    // 4. Корпус
    if (!clickedId && selectionConfig.hulls) {
        const hull = hulls.find(h => isPointInPoly(world, h.nodes));
        if (hull) { clickedId = hull.id; clickedType = 'hull'; }
    }

    if (clickedId) {
      // Логика выделения
      if (e.shiftKey) {
        if (selectedIds.includes(clickedId)) {
          setSelectedIds(selectedIds.filter(id => id !== clickedId));
        } else {
          setSelectedIds([...selectedIds, clickedId]);
        }
      } else {
        if (!selectedIds.includes(clickedId)) {
          setSelectedIds([clickedId]);
        }
        // Если объект уже выделен, не снимаем выделение, чтобы можно было перетаскивать группу
      }
      
      // Начало перетаскивания
      setDragStart({ x: world.x, y: world.y }); // Используем точные координаты мыши для дельты
      setIsDraggingSelection(true);
      
    } else {
      // Клик в пустоту -> Начало рамки выделения
      if (!e.shiftKey) setSelectedIds([]);
      setSelectionBox({ start: {x: world.x, y: world.y}, end: {x: world.x, y: world.y} });
    }
  },

  onMouseMove: (e, ctx) => {
    const { 
        world, isDraggingSelection, dragStart, selectionBox, setSelectionBox, setDragStart,
        blocks, hulls, walls, doors, selectedIds, setBlocks, setHulls, setWalls, setDoors 
    } = ctx;

    // 1. Рамка выделения
    if (selectionBox) {
      setSelectionBox({
        ...selectionBox,
        end: { x: world.x, y: world.y }
      });
      return;
    }

    // 2. Перетаскивание объектов
    if (isDraggingSelection && dragStart && selectedIds.length > 0) {
      const rawDx = world.x - dragStart.x;
      const rawDy = world.y - dragStart.y;

      const dx = Math.round(rawDx / CELL_SIZE) * CELL_SIZE;
      const dy = Math.round(rawDy / CELL_SIZE) * CELL_SIZE;

      if (dx === 0 && dy === 0) return;
      
      // Обновляем стартовую точку для следующего кадра (накопительная дельта)
      setDragStart({ x: dragStart.x + dx, y: dragStart.y + dy });

      let nextBlocks = blocks;
      let nextHulls = hulls;
      let nextWalls = walls;
      let nextDoors = doors;
      
      // Списки измененных ID стен, чтобы двигать привязанные двери
      const movedWallIds = new Set();

      // --- Перемещение Блоков ---
      nextBlocks = blocks.map(b => {
        if (selectedIds.includes(b.id)) {
           return { ...b, x: b.x + dx, y: b.y + dy };
        }
        return b;
      });

      // --- Перемещение Корпусов ---
      nextHulls = hulls.map(h => {
        if (selectedIds.includes(h.id)) {
           return {
             ...h,
             nodes: h.nodes.map(n => ({ ...n, x: n.x + dx, y: n.y + dy }))
           };
        }
        return h;
      });

      // --- Перемещение Стен ---
      nextWalls = walls.map(w => {
        if (selectedIds.includes(w.id)) {
           movedWallIds.add(w.id);
           return {
             ...w,
             nodes: w.nodes.map(n => ({ ...n, x: n.x + dx, y: n.y + dy }))
           };
        }
        return w;
      });

      // --- Перемещение Дверей ---
      nextDoors = doors.map(d => {
        // Случай А: Дверь выделена + Стена выделена (или не выделена, но дверь "едет" вместе с ней?)
        // Если стена двери двигается, дверь двигается автоматически (дельта)
        if (movedWallIds.has(d.wallId)) {
           return { ...d, x: d.x + dx, y: d.y + dy };
        }
        
          // Случай Б: Дверь выделена отдельно -> Скольжение по стенам
        if (selectedIds.includes(d.id)) {
           // Ищем ближайшую точку на ЛЮБОЙ стене
           const best = findNearestWallPoint(dragStart.x + dx, dragStart.y + dy, walls); 
           if (best) {
             return {
               ...d,
               wallId: best.wallId,
               x: best.x,
               y: best.y,
               angle: best.angle,
               t: best.t,
               p1Idx: best.p1Idx,
               p2Idx: best.p2Idx
             };
           }
        }
        return d;
      });

      setBlocks(nextBlocks);
      setHulls(nextHulls);
      setWalls(nextWalls);
      setDoors(nextDoors);
    }
  },

  onMouseUp: (e, ctx) => {
    const { 
        selectionBox, setSelectionBox, setIsDraggingSelection, setDragStart,
        blocks, hulls, walls, doors, setSelectedIds, selectedIds, selectionConfig
    } = ctx;

    // Завершение рамки выделения
    if (selectionBox) {
      const x1 = Math.min(selectionBox.start.x, selectionBox.end.x);
      const y1 = Math.min(selectionBox.start.y, selectionBox.end.y);
      const x2 = Math.max(selectionBox.start.x, selectionBox.end.x);
      const y2 = Math.max(selectionBox.start.y, selectionBox.end.y);
      
      const newSelected = [];

      // Блоки
      if (selectionConfig.blocks) {
        blocks.forEach(b => {
          const rect = getBlockRect(b);
          // Центр блока внутри рамки
          const cx = rect.x + rect.w/2;
          const cy = rect.y + rect.h/2;
          if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) newSelected.push(b.id);
        });
      }

      // Стены (если хотя бы один узел внутри)
      if (selectionConfig.walls) {
        walls.forEach(w => {
          if (w.nodes.some(n => n.x >= x1 && n.x <= x2 && n.y >= y1 && n.y <= y2)) {
            newSelected.push(w.id);
          }
        });
      }

      // Двери
      if (selectionConfig.doors) {
        doors.forEach(d => {
          if (d.x >= x1 && d.x <= x2 && d.y >= y1 && d.y <= y2) newSelected.push(d.id);
        });
      }

       // Корпуса (если хотя бы один узел внутри)
      if (selectionConfig.hulls) {
        hulls.forEach(h => {
          if (h.nodes.some(n => n.x >= x1 && n.x <= x2 && n.y >= y1 && n.y <= y2)) {
            newSelected.push(h.id);
          }
        });
      }

      if (e.shiftKey) {
        // Объединяем с текущим
        const unique = new Set([...selectedIds, ...newSelected]);
        setSelectedIds(Array.from(unique));
      } else {
        setSelectedIds(newSelected);
      }
      
      setSelectionBox(null);
    } else {
      // Завершение перетаскивания -> Сохраняем в историю
      if (ctx.isDraggingSelection) {
        ctx.saveToHistory(blocks, hulls, walls, doors);
      }
      setIsDraggingSelection(false);
      setDragStart(null);
    }
  }
};
