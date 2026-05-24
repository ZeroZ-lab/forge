// trail.js — Trail rendering (no external imports)

/**
 * createTrail(maxPoints, recordInterval): TrailState
 */
export function createTrail(maxPoints = 200, recordInterval = 3) {
  return {
    points: [],
    maxPoints,
    recordInterval,
    enabled: true,
  };
}

/**
 * recordPosition(trail, robot, tick): void
 */
export function recordPosition(trail, robot, tick) {
  if (!trail.enabled) return;
  if (tick % trail.recordInterval !== 0) return;

  trail.points.push({ x: robot.x, y: robot.y, tick });

  if (trail.points.length > trail.maxPoints) {
    trail.points.shift();
  }
}

/**
 * drawTrail(config, trail, cellSize): void
 */
export function drawTrail(config, trail, cellSize) {
  if (!trail.enabled || trail.points.length < 2) return;

  const { ctx } = config;
  const points = trail.points;

  for (let i = 1; i < points.length; i++) {
    const alpha = 0.1 + (i / points.length) * 0.5;
    ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(points[i - 1].x * cellSize + cellSize / 2, points[i - 1].y * cellSize + cellSize / 2);
    ctx.lineTo(points[i].x * cellSize + cellSize / 2, points[i].y * cellSize + cellSize / 2);
    ctx.stroke();
  }
}

/**
 * clearTrail(trail): void
 */
export function clearTrail(trail) {
  trail.points = [];
}
