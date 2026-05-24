// pathfinder.js — A* pathfinding on the grid
// 8-directional movement, Manhattan distance heuristic, diagonal wall-cutting prevention

import { isOccupied } from '../entities/map.js';

const DIRECTIONS = [
  { dx: 1, dy: 0, cost: 1 },
  { dx: -1, dy: 0, cost: 1 },
  { dx: 0, dy: 1, cost: 1 },
  { dx: 0, dy: -1, cost: 1 },
  { dx: 1, dy: 1, cost: Math.SQRT2 },
  { dx: -1, dy: 1, cost: Math.SQRT2 },
  { dx: 1, dy: -1, cost: Math.SQRT2 },
  { dx: -1, dy: -1, cost: Math.SQRT2 },
];

function heuristic(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function isBlocked(x, y, obstacles, grid) {
  if (x < 0 || x >= grid.cols || y < 0 || y >= grid.rows) return true;
  return isOccupied(x, y, obstacles);
}

function reconstructPath(node) {
  const path = [];
  let current = node;
  while (current) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }
  return path;
}

/**
 * Find a path from start to goal using A*.
 * @returns {Array<{x: number, y: number}>} Path coordinates, or empty array if no path
 */
export function findPath(startX, startY, goalX, goalY, obstacles, grid) {
  const sx = Math.round(startX);
  const sy = Math.round(startY);
  const gx = Math.round(goalX);
  const gy = Math.round(goalY);

  if (isBlocked(gx, gy, obstacles, grid)) return [];
  if (sx === gx && sy === gy) return [];

  const startNode = {
    x: sx, y: sy,
    g: 0,
    h: heuristic(sx, sy, gx, gy),
    f: heuristic(sx, sy, gx, gy),
    parent: null,
  };

  let openList = [startNode];
  const closedSet = new Set();

  while (openList.length > 0) {
    // Find node with lowest f
    let bestIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[bestIdx].f) bestIdx = i;
    }
    const current = openList[bestIdx];
    openList.splice(bestIdx, 1);

    // Goal reached
    if (current.x === gx && current.y === gy) {
      return reconstructPath(current);
    }

    closedSet.add(`${current.x},${current.y}`);

    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const key = `${nx},${ny}`;

      if (closedSet.has(key)) continue;
      if (isBlocked(nx, ny, obstacles, grid)) continue;

      // Prevent diagonal wall-cutting
      if (dir.dx !== 0 && dir.dy !== 0) {
        if (
          isBlocked(current.x + dir.dx, current.y, obstacles, grid) ||
          isBlocked(current.x, current.y + dir.dy, obstacles, grid)
        ) {
          continue;
        }
      }

      const g = current.g + dir.cost;
      const h = heuristic(nx, ny, gx, gy);
      const f = g + h;

      // Check if already in open list with better g
      const existingIdx = openList.findIndex((n) => n.x === nx && n.y === ny);
      if (existingIdx !== -1 && openList[existingIdx].g <= g) continue;

      const neighbor = { x: nx, y: ny, g, h, f, parent: current };

      if (existingIdx !== -1) {
        openList[existingIdx] = neighbor;
      } else {
        openList.push(neighbor);
      }
    }
  }

  return []; // No path found
}

/**
 * Draw a computed path on the canvas as a yellow dashed line
 */
export function drawPath(ctx, path, cellSize) {
  if (path.length < 2) return;

  ctx.beginPath();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = 'rgba(255, 170, 0, 0.6)';
  ctx.lineWidth = 2;
  ctx.moveTo(path[0].x * cellSize, path[0].y * cellSize);

  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x * cellSize, path[i].y * cellSize);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}
