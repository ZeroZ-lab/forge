// robot.js — Robot entity
// Data model: RobotState { id, x, y, heading, speed, radius, colliding, color }
// Angle convention: 0=right, 90=down, 180=left, 270=up (degrees)

import { isInBounds, isOccupied } from './map.js';

const DEG_TO_RAD = Math.PI / 180;

/**
 * Create a robot at the given position and heading
 */
export function createRobot(id, x, y, heading = 0) {
  return {
    id,
    x,
    y,
    heading,
    speed: 2, // cell/s
    radius: 0.4, // cell
    colliding: false,
    color: null, // null = use accent-primary
  };
}

/**
 * Move forward along heading direction
 */
export function moveForward(robot, dt, physicsConfig) {
  const rad = robot.heading * DEG_TO_RAD;
  const dx = Math.cos(rad) * physicsConfig.moveSpeed * dt;
  const dy = Math.sin(rad) * physicsConfig.moveSpeed * dt;
  robot.x += dx;
  robot.y += dy;
}

/**
 * Move backward (opposite of heading)
 */
export function moveBackward(robot, dt, physicsConfig) {
  const rad = robot.heading * DEG_TO_RAD;
  const dx = Math.cos(rad) * physicsConfig.moveSpeed * dt;
  const dy = Math.sin(rad) * physicsConfig.moveSpeed * dt;
  robot.x -= dx;
  robot.y -= dy;
}

/**
 * Turn left (heading decreases)
 */
export function turnLeft(robot, dt, physicsConfig) {
  robot.heading -= physicsConfig.turnSpeed * dt;
  robot.heading = ((robot.heading % 360) + 360) % 360;
}

/**
 * Turn right (heading increases)
 */
export function turnRight(robot, dt, physicsConfig) {
  robot.heading += physicsConfig.turnSpeed * dt;
  robot.heading = ((robot.heading % 360) + 360) % 360;
}

/**
 * Check collision with obstacles and grid boundaries.
 * Sets robot.colliding and reverts position on collision.
 * @returns {boolean} Whether the robot is colliding
 */
export function checkCollision(robot, obstacles, gridConfig) {
  // Boundary check
  if (!isInBounds(robot.x, robot.y, gridConfig)) {
    robot.colliding = true;
    return true;
  }

  // Obstacle collision using radius sampling (4 cardinal + 4 diagonal)
  const r = robot.radius;
  const offsets = [
    [0, 0],
    [r, 0], [-r, 0], [0, r], [0, -r],
    [r * 0.707, r * 0.707],
    [-r * 0.707, r * 0.707],
    [r * 0.707, -r * 0.707],
    [-r * 0.707, -r * 0.707],
  ];

  for (const [dx, dy] of offsets) {
    if (isOccupied(robot.x + dx, robot.y + dy, obstacles)) {
      robot.colliding = true;
      return true;
    }
  }

  robot.colliding = false;
  return false;
}

/**
 * Apply a movement/turn command to the robot
 * @param {'forward'|'backward'|'left'|'right'|'stop'} command
 */
export function applyCommand(robot, command, dt, physicsConfig) {
  switch (command.type) {
    case 'forward':
      moveForward(robot, dt, physicsConfig);
      break;
    case 'backward':
      moveBackward(robot, dt, physicsConfig);
      break;
    case 'left':
      turnLeft(robot, dt, physicsConfig);
      break;
    case 'right':
      turnRight(robot, dt, physicsConfig);
      break;
    case 'stop':
      break;
  }
}
