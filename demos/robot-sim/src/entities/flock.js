// flock.js — Multi-robot collision avoidance
// O(n²) pairwise detection, push apart along connection line, slow down when close

/**
 * Resolve collisions between all pairs of robots.
 * Pushes overlapping robots apart and reduces speed at close range.
 */
export function resolveRobotCollisions(robots) {
  for (let i = 0; i < robots.length; i++) {
    for (let j = i + 1; j < robots.length; j++) {
      const a = robots[i];
      const b = robots[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.radius + b.radius;

      if (dist < minDist && dist > 0.001) {
        // Push apart along connection line
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;
      }

      // Slow down when within 2 cells
      if (dist < 2 && dist > 0.001) {
        a.speed = 1;
        b.speed = 1;
      }
    }
  }
}
