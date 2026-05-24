// stats.js — Statistics tracking (no external imports)

/**
 * createStats(): RobotStats
 */
export function createStats() {
  return {
    distance: 0,
    collisionCount: 0,
    wasColliding: false,
  };
}

/**
 * updateStats(stats, robot, prevX, prevY): void
 */
export function updateStats(stats, robot, prevX, prevY) {
  const dx = robot.x - prevX;
  const dy = robot.y - prevY;
  stats.distance += Math.sqrt(dx * dx + dy * dy);

  if (!stats.wasColliding && robot.colliding) {
    stats.collisionCount++;
  }
  stats.wasColliding = robot.colliding;
}
