// lidar.js — Laser range finder sensor
// 12 rays, 360°, max 5 cells, slab method ray-AABB intersection

const DEG_TO_RAD = Math.PI / 180;

/**
 * Create a lidar configuration
 */
export function createLidarConfig(rayCount = 12, maxRange = 5) {
  return { rayCount, maxRange };
}

/**
 * Cast rays from the robot position and return distance readings.
 * Uses the slab method for ray-AABB intersection with each obstacle.
 * @returns {LidarReading[]} Array of { angle, distance, hit }
 */
export function castRays(robot, obstacles, grid, config) {
  const readings = [];
  const angleStep = 360 / config.rayCount;

  for (let i = 0; i < config.rayCount; i++) {
    const angle = i * angleStep;
    const rad = angle * DEG_TO_RAD;
    const dirX = Math.cos(rad);
    const dirY = Math.sin(rad);

    let minDist = config.maxRange;
    let hit = false;

    // Check intersection with each obstacle (AABB)
    for (const obs of obstacles) {
      const dist = rayAABB(
        robot.x, robot.y,
        dirX, dirY,
        obs.x, obs.y,
        obs.x + obs.width, obs.y + obs.height
      );
      if (dist !== null && dist < minDist && dist > 0) {
        minDist = dist;
        hit = true;
      }
    }

    // Check grid boundaries as walls
    const bounds = [
      rayAxis(dirX, robot.x, 0, grid.cols),
      rayAxis(dirY, robot.y, 0, grid.rows),
    ];
    for (const t of bounds) {
      if (t !== null && t > 0.001 && t < minDist) {
        minDist = t;
        hit = true;
      }
    }

    readings.push({ angle, distance: minDist, hit });
  }

  return readings;
}

/**
 * Slab method: ray-AABB intersection
 * Returns distance along ray to intersection, or null if no hit
 */
function rayAABB(ox, oy, dx, dy, minX, minY, maxX, maxY) {
  let tmin = -Infinity;
  let tmax = Infinity;

  if (Math.abs(dx) < 1e-8) {
    if (ox < minX || ox > maxX) return null;
  } else {
    const t1 = (minX - ox) / dx;
    const t2 = (maxX - ox) / dx;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
    if (tmin > tmax) return null;
  }

  if (Math.abs(dy) < 1e-8) {
    if (oy < minY || oy > maxY) return null;
  } else {
    const t1 = (minY - oy) / dy;
    const t2 = (maxY - oy) / dy;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
    if (tmin > tmax) return null;
  }

  return tmin >= 0 ? tmin : tmax > 0 ? tmax : null;
}

/**
 * Ray vs a single axis boundary (for grid edge detection)
 */
function rayAxis(dirComponent, origin, minBound, maxBound) {
  if (Math.abs(dirComponent) < 1e-8) return null;
  const tMin = (minBound - origin) / dirComponent;
  const tMax = (maxBound - origin) / dirComponent;
  return Math.max(tMin, tMax);
}

/**
 * Draw lidar rays on the canvas
 */
export function drawLidar(ctx, robot, readings, cellSize) {
  const rx = robot.x * cellSize;
  const ry = robot.y * cellSize;

  for (const reading of readings) {
    const rad = reading.angle * DEG_TO_RAD;
    const endX = rx + Math.cos(rad) * reading.distance * cellSize;
    const endY = ry + Math.sin(rad) * reading.distance * cellSize;

    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(endX, endY);

    if (reading.hit) {
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
      ctx.lineWidth = 1;
    }
    ctx.stroke();

    // Red dot at hit point
    if (reading.hit) {
      ctx.beginPath();
      ctx.arc(endX, endY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ff3366';
      ctx.fill();
    }
  }
}
