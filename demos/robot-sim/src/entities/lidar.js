// lidar.js — Lidar sensor (no external imports, data via parameters)

/**
 * rayRectIntersect(ox, oy, dx, dy, rect): number (internal)
 * Slab method ray-rectangle intersection
 */
function rayRectIntersect(ox, oy, dx, dy, rect) {
  const x1 = rect.x, y1 = rect.y;
  const x2 = rect.x + rect.width, y2 = rect.y + rect.height;

  let tmin = -Infinity, tmax = Infinity;

  if (dx !== 0) {
    const tx1 = (x1 - ox) / dx;
    const tx2 = (x2 - ox) / dx;
    tmin = Math.max(tmin, Math.min(tx1, tx2));
    tmax = Math.min(tmax, Math.max(tx1, tx2));
  } else if (ox < x1 || ox > x2) {
    return Infinity;
  }

  if (dy !== 0) {
    const ty1 = (y1 - oy) / dy;
    const ty2 = (y2 - oy) / dy;
    tmin = Math.max(tmin, Math.min(ty1, ty2));
    tmax = Math.min(tmax, Math.max(ty1, ty2));
  } else if (oy < y1 || oy > y2) {
    return Infinity;
  }

  if (tmin > tmax || tmax < 0) return Infinity;
  return tmin >= 0 ? tmin : tmax;
}

/**
 * rayBoundaryIntersect(ox, oy, dx, dy, grid): number (internal)
 */
function rayBoundaryIntersect(ox, oy, dx, dy, grid) {
  let t = Infinity;
  if (dx > 0) t = Math.min(t, (grid.cols - ox) / dx);
  if (dx < 0) t = Math.min(t, -ox / dx);
  if (dy > 0) t = Math.min(t, (grid.rows - oy) / dy);
  if (dy < 0) t = Math.min(t, -oy / dy);
  return t < 0 ? Infinity : t;
}

/**
 * castRays(robot, obstacles, grid, config): LidarReading[]
 */
export function castRays(robot, obstacles, grid, config) {
  const rayCount = (config && config.rayCount) || 12;
  const maxRange = (config && config.maxRange) || 5;
  const readings = [];

  for (let i = 0; i < rayCount; i++) {
    const angle = robot.heading + (i * 360) / rayCount;
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);

    let minDist = maxRange;
    let hit = false;

    // Check obstacles
    for (const obs of obstacles) {
      const t = rayRectIntersect(robot.x, robot.y, dx, dy, obs);
      if (t < minDist) {
        minDist = t;
        hit = true;
      }
    }

    // Check boundaries
    const tb = rayBoundaryIntersect(robot.x, robot.y, dx, dy, grid);
    if (tb < minDist) {
      minDist = tb;
      hit = true;
    }

    readings.push({ angle, distance: minDist, hit });
  }

  return readings;
}

/**
 * drawLidar(config, robot, readings, cellSize): void
 */
export function drawLidar(config, robot, readings, cellSize) {
  const { ctx } = config;

  for (const r of readings) {
    const rad = (r.angle * Math.PI) / 180;
    const endX = (robot.x + Math.cos(rad) * r.distance) * cellSize;
    const endY = (robot.y + Math.sin(rad) * r.distance) * cellSize;
    const startX = robot.x * cellSize + cellSize / 2;
    const startY = robot.y * cellSize + cellSize / 2;

    ctx.strokeStyle = r.hit ? 'rgba(255, 51, 102, 0.6)' : 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    if (r.hit) {
      ctx.fillStyle = '#ff3366';
      ctx.beginPath();
      ctx.arc(endX, endY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
