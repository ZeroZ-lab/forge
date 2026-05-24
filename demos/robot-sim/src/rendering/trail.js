// trail.js — Robot trajectory trail
// Records position every N frames, renders with fading alpha

/**
 * Create a trail state
 */
export function createTrail(maxPoints = 200, interval = 3) {
  return {
    points: [],
    maxPoints,
    recordInterval: interval,
    enabled: true,
  };
}

/**
 * Record the robot's current position if it's time (every interval frames)
 */
export function recordPosition(trail, robot, tick) {
  if (!trail.enabled) return;
  if (tick % trail.recordInterval !== 0) return;

  trail.points.push({ x: robot.x, y: robot.y });
  if (trail.points.length > trail.maxPoints) {
    trail.points.shift(); // FIFO
  }
}

/**
 * Draw the trail on the canvas with fading transparency
 */
export function drawTrail(ctx, trail, cellSize) {
  if (!trail.enabled || trail.points.length < 2) return;

  for (let i = 1; i < trail.points.length; i++) {
    const alpha = 0.1 + (i / trail.points.length) * 0.9;
    ctx.beginPath();
    ctx.moveTo(
      trail.points[i - 1].x * cellSize,
      trail.points[i - 1].y * cellSize
    );
    ctx.lineTo(
      trail.points[i].x * cellSize,
      trail.points[i].y * cellSize
    );
    ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * Clear all trail points
 */
export function clearTrail(trail) {
  trail.points = [];
}
