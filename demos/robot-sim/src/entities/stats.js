// stats.js — Per-robot statistics tracking
// Tracks cumulative distance and collision count

/**
 * Create a stats tracker for a robot
 */
export function createStats() {
  return {
    distance: 0,
    collisionCount: 0,
    wasColliding: false,
  };
}

/**
 * Update stats after a physics step.
 * @param {RobotStats} stats
 * @param {RobotState} robot - Current robot state
 * @param {number} prevX - Robot X before this step
 * @param {number} prevY - Robot Y before this step
 */
export function updateStats(stats, robot, prevX, prevY) {
  // Accumulate distance traveled
  const dx = robot.x - prevX;
  const dy = robot.y - prevY;
  stats.distance += Math.sqrt(dx * dx + dy * dy);

  // Count collision transitions (false → true)
  if (robot.colliding && !stats.wasColliding) {
    stats.collisionCount++;
  }
  stats.wasColliding = robot.colliding;
}
