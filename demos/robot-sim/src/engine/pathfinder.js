// pathfinder.js — A* pathfinding (no external imports, data via parameters)

/**
 * findPath(startX, startY, goalX, goalY, obstacles, grid): Array<{x, y}>
 */
export function findPath(startX, startY, goalX, goalY, obstacles, grid) {
  if (startX === goalX && startY === goalY) return [];

  const occupied = new Set();
  for (const obs of obstacles) {
    for (let dx = 0; dx < obs.width; dx++) {
      for (let dy = 0; dy < obs.height; dy++) {
        occupied.add((obs.x + dx) + ',' + (obs.y + dy));
      }
    }
  }

  if (occupied.has(goalX + ',' + goalY)) return [];

  const key = (x, y) => x + ',' + y;
  const heuristic = (x, y) => Math.abs(x - goalX) + Math.abs(y - goalY);

  const open = new Map();
  const closed = new Set();
  const startKey = key(startX, startY);

  open.set(startKey, {
    x: startX, y: startY,
    g: 0, h: heuristic(startX, startY),
    f: heuristic(startX, startY),
    parent: null,
  });

  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];

  let iterations = 0;
  const maxIter = grid.cols * grid.rows * 2;

  while (open.size > 0 && iterations < maxIter) {
    iterations++;

    // Find lowest f in open set
    let bestKey = null;
    let bestF = Infinity;
    for (const [k, node] of open) {
      if (node.f < bestF) {
        bestF = node.f;
        bestKey = k;
      }
    }

    const current = open.get(bestKey);
    open.delete(bestKey);
    closed.add(bestKey);

    if (current.x === goalX && current.y === goalY) {
      // Reconstruct path
      const path = [];
      let node = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    for (const [dx, dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nk = key(nx, ny);

      if (nx < 0 || nx >= grid.cols || ny < 0 || ny >= grid.rows) continue;
      if (closed.has(nk)) continue;
      if (occupied.has(nk)) continue;

      // Diagonal: check both adjacent cells to prevent wall-cutting
      if (dx !== 0 && dy !== 0) {
        if (occupied.has(key(current.x + dx, current.y)) ||
            occupied.has(key(current.x, current.y + dy))) {
          continue;
        }
      }

      const cost = (dx !== 0 && dy !== 0) ? 1.414 : 1;
      const ng = current.g + cost;
      const nh = heuristic(nx, ny);

      const existing = open.get(nk);
      if (existing && ng >= existing.g) continue;

      open.set(nk, {
        x: nx, y: ny,
        g: ng, h: nh, f: ng + nh,
        parent: current,
      });
    }
  }

  return [];
}

/**
 * drawPath(config, path, cellSize): void
 */
export function drawPath(config, path, cellSize) {
  if (!path || path.length < 2) return;

  const { ctx } = config;
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#ffaa00';
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < path.length; i++) {
    const px = path[i].x * cellSize + cellSize / 2;
    const py = path[i].y * cellSize + cellSize / 2;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.stroke();
  ctx.setLineDash([]);
}
