import { CELL_SIZE } from '../constants';

export const EditTool = {
  onMouseDown: () => {},

  onMouseMove: (e, ctx) => {
    const { world, draggingNode, draggingWallNode, hulls, walls, setHulls, setWalls, doors, setDoors, mode } = ctx;

    if (draggingNode) {
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

    if (draggingWallNode) {
      const nextWalls = JSON.parse(JSON.stringify(walls));
      const wall = nextWalls[draggingWallNode.wIdx];
      if (wall) {
        const nx = Math.round(world.x / CELL_SIZE) * CELL_SIZE;
        const ny = Math.round(world.y / CELL_SIZE) * CELL_SIZE;

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
  },

  onMouseUp: (e, ctx) => {
    const { draggingNode, draggingWallNode, saveToHistory, blocks, hulls, walls, doors } = ctx;
    if (draggingNode || draggingWallNode) {
      saveToHistory(blocks, hulls, walls, doors);
    }
  }
};
