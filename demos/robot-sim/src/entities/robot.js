// robot.js — Robot entity (no external imports)

/**
 * degToRad(deg): number (internal)
 */
function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * normalizeAngle(angle): number (internal)
 */
function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

/**
 * createRobot(id, x, y, heading): RobotState
 */
export function createRobot(id, x, y, heading = 0) {
  return {
    id,
    x,
    y,
    heading: normalizeAngle(heading),
    speed: 0,
    radius: 0.4,
    colliding: false,
    color: '#00d4ff',
  };
}

/**
 * moveForward(robot, dt, physics): void
 */
export function moveForward(robot, dt, physics) {
  const rad = degToRad(robot.heading);
  robot.x += Math.cos(rad) * physics.moveSpeed * dt;
  robot.y += Math.sin(rad) * physics.moveSpeed * dt;
}

/**
 * moveBackward(robot, dt, physics): void
 */
export function moveBackward(robot, dt, physics) {
  const rad = degToRad(robot.heading);
  robot.x -= Math.cos(rad) * physics.moveSpeed * dt;
  robot.y -= Math.sin(rad) * physics.moveSpeed * dt;
}

/**
 * turnLeft(robot, dt, physics): void
 */
export function turnLeft(robot, dt, physics) {
  robot.heading = normalizeAngle(robot.heading - physics.turnSpeed * dt);
}

/**
 * turnRight(robot, dt, physics): void
 */
export function turnRight(robot, dt, physics) {
  robot.heading = normalizeAngle(robot.heading + physics.turnSpeed * dt);
}

/**
 * checkCollision(robot, obstacles, grid): boolean
 */
export function checkCollision(robot, obstacles, grid) {
  let colliding = false;

  // Boundary check
  if (robot.x < 0 || robot.x >= grid.cols || robot.y < 0 || robot.y >= grid.rows) {
    colliding = true;
  }

  // Obstacle check
  if (!colliding) {
    for (const obs of obstacles) {
      if (
        robot.x >= obs.x && robot.x < obs.x + obs.width &&
        robot.y >= obs.y && robot.y < obs.y + obs.height
      ) {
        colliding = true;
        break;
      }
    }
  }

  robot.colliding = colliding;
  return colliding;
}

/**
 * applyCommand(robot, command, dt, physics): void
 */
export function applyCommand(robot, command, dt, physics) {
  switch (command) {
    case 'forward':
      moveForward(robot, dt, physics);
      break;
    case 'backward':
      moveBackward(robot, dt, physics);
      break;
    case 'left':
      turnLeft(robot, dt, physics);
      break;
    case 'right':
      turnRight(robot, dt, physics);
      break;
    case 'stop':
      break;
  }
}

/**
 * clampToBounds(robot, grid): void
 */
export function clampToBounds(robot, grid) {
  robot.x = Math.max(0, Math.min(grid.cols - 0.01, robot.x));
  robot.y = Math.max(0, Math.min(grid.rows - 0.01, robot.y));
}
