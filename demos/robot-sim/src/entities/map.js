// map.js — Grid and obstacle management
// Data models: GridConfig { cols, rows, cellSize }, Obstacle { id, x, y, width, height }

/**
 * Create a grid configuration
 * @param {number} cols - Number of columns (default 20)
 * @param {number} rows - Number of rows (default 15)
 * @param {number} cellSize - Cell size in pixels (default 40)
 * @returns {GridConfig}
 */
export function createGrid(cols = 20, rows = 15, cellSize = 40) {
  return { cols, rows, cellSize };
}

/**
 * Place an obstacle at the given grid position
 * @returns {Obstacle|null} The new obstacle, or null if position is occupied
 */
export function placeObstacle(obstacles, x, y, w = 1, h = 1) {
  for (const obs of obstacles) {
    if (
      x < obs.x + obs.width &&
      x + w > obs.x &&
      y < obs.y + obs.height &&
      y + h > obs.y
    ) {
      return null; // position conflict
    }
  }
  const obstacle = {
    id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    x, y,
    width: w,
    height: h,
  };
  obstacles.push(obstacle);
  return obstacle;
}

/**
 * Remove an obstacle by ID
 * @returns {Obstacle[]} Updated obstacle list
 */
export function removeObstacle(obstacles, id) {
  return obstacles.filter((o) => o.id !== id);
}

/**
 * Check if a grid cell is occupied by any obstacle
 */
export function isOccupied(x, y, obstacles) {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  return obstacles.some(
    (o) =>
      gx >= o.x &&
      gx < o.x + o.width &&
      gy >= o.y &&
      gy < o.y + o.height
  );
}

/**
 * Check if coordinates are within grid bounds
 */
export function isInBounds(x, y, gridConfig) {
  return x >= 0 && x < gridConfig.cols && y >= 0 && y < gridConfig.rows;
}

/**
 * Generate random obstacles, avoiding the center region
 * @param {number} count - Number of obstacles to generate
 * @param {GridConfig} gridConfig
 * @param {{x: number, y: number}} excludeCenter - Center point to avoid
 * @returns {Obstacle[]}
 */
export function generateRandomObstacles(count, gridConfig, excludeCenter) {
  const obstacles = [];
  const cx = excludeCenter ? excludeCenter.x : Math.floor(gridConfig.cols / 2);
  const cy = excludeCenter ? excludeCenter.y : Math.floor(gridConfig.rows / 2);
  let attempts = 0;

  while (obstacles.length < count && attempts < count * 20) {
    const x = Math.floor(Math.random() * gridConfig.cols);
    const y = Math.floor(Math.random() * gridConfig.rows);
    attempts++;

    // Avoid center region (±2 cells)
    if (Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2) continue;

    const obs = placeObstacle(obstacles, x, y);
    if (obs) {
      // push already happened inside placeObstacle
    }
  }

  return obstacles;
}
