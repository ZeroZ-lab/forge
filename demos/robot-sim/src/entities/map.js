// map.js — Grid and obstacles (no external imports)

/**
 * createGrid(cols, rows, cellSize): GridConfig
 */
export function createGrid(cols = 20, rows = 15, cellSize = 40) {
  return { cols, rows, cellSize };
}

/**
 * isInBounds(x, y, grid): boolean
 */
export function isInBounds(x, y, grid) {
  return x >= 0 && x < grid.cols && y >= 0 && y < grid.rows;
}

/**
 * isOccupied(x, y, obstacles): boolean
 */
export function isOccupied(x, y, obstacles) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  for (const obs of obstacles) {
    if (ix >= obs.x && ix < obs.x + obs.width &&
        iy >= obs.y && iy < obs.y + obs.height) {
      return true;
    }
  }
  return false;
}

/**
 * placeObstacle(obstacles, x, y, w, h): Obstacle | null
 */
export function placeObstacle(obstacles, x, y, w = 1, h = 1) {
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      if (isOccupied(x + dx, y + dy, obstacles)) return null;
    }
  }
  const obs = { id: 'obs-' + (obstacles.length + 1), x, y, width: w, height: h };
  obstacles.push(obs);
  return obs;
}

/**
 * removeObstacle(obstacles, id): Obstacle[]
 */
export function removeObstacle(obstacles, id) {
  return obstacles.filter((o) => o.id !== id);
}

/**
 * generateRandomObstacles(count, grid, excludeCenter): Obstacle[]
 */
export function generateRandomObstacles(count, grid, excludeCenter = 2) {
  const obstacles = [];
  const cx = Math.floor(grid.cols / 2);
  const cy = Math.floor(grid.rows / 2);
  let attempts = 0;

  while (obstacles.length < count && attempts < count * 10) {
    const x = Math.floor(Math.random() * grid.cols);
    const y = Math.floor(Math.random() * grid.rows);
    attempts++;

    if (Math.abs(x - cx) <= excludeCenter && Math.abs(y - cy) <= excludeCenter) continue;
    if (isOccupied(x, y, obstacles)) continue;

    const w = Math.random() < 0.3 ? 2 : 1;
    const h = Math.random() < 0.3 ? 2 : 1;
    if (x + w >= grid.cols || y + h >= grid.rows) continue;

    obstacles.push({ id: 'obs-' + obstacles.length, x, y, width: w, height: h });
  }

  return obstacles;
}
