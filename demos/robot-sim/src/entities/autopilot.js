// autopilot.js — Autonomous exploration using lidar
// Drives forward when clear, turns to avoid obstacles, random direction changes

import { castRays, createLidarConfig } from './lidar.js';

/**
 * Create an autopilot state
 */
export function createAutopilot() {
  return {
    enabled: false,
    nextTurnTime: 180, // tick for first random turn (3s at 60fps)
    turnDirection: 1,
    lidarConfig: createLidarConfig(12, 5),
  };
}

/**
 * Determine the next command based on lidar readings and state.
 * @param {RobotState} robot
 * @param {AutopilotState} autopilot
 * @param {number} tick - Current simulation tick
 * @param {Obstacle[]} obstacles
 * @param {GridConfig} grid
 * @returns {{ type: string }} RobotCommand
 */
export function getAutopilotCommand(robot, autopilot, tick, obstacles, grid) {
  const readings = castRays(robot, obstacles, grid, autopilot.lidarConfig);

  // Find minimum distance in the forward cone (±30° from heading, indices 11, 0, 1)
  const forwardIndices = [11, 0, 1];
  let minForward = Infinity;
  for (const idx of forwardIndices) {
    const r = readings[idx % readings.length];
    if (r && r.hit && r.distance < minForward) {
      minForward = r.distance;
    }
  }

  // Obstacle within 2 cells ahead → turn to avoid
  if (minForward < 2) {
    // Read left side (indices 8, 9, 10 = angles 240°, 270°, 300°)
    const leftIndices = [8, 9, 10];
    let leftMin = Infinity;
    for (const idx of leftIndices) {
      const r = readings[idx];
      if (r && r.hit && r.distance < leftMin) leftMin = r.distance;
    }

    // Read right side (indices 2, 3, 4 = angles 60°, 90°, 120°)
    const rightIndices = [2, 3, 4];
    let rightMin = Infinity;
    for (const idx of rightIndices) {
      const r = readings[idx];
      if (r && r.hit && r.distance < rightMin) rightMin = r.distance;
    }

    // Turn toward the side with more clearance
    if (leftMin > rightMin) {
      return { type: 'left' };
    } else if (rightMin > leftMin) {
      return { type: 'right' };
    } else {
      // Both sides similar — use stored turn direction
      return autopilot.turnDirection > 0
        ? { type: 'right' }
        : { type: 'left' };
    }
  }

  // Random direction change every 3-5 seconds
  if (tick >= autopilot.nextTurnTime) {
    autopilot.turnDirection = Math.random() > 0.5 ? 1 : -1;
    autopilot.nextTurnTime = tick + 180 + Math.floor(Math.random() * 120);
    return autopilot.turnDirection > 0
      ? { type: 'right' }
      : { type: 'left' };
  }

  // Default: drive forward
  return { type: 'forward' };
}
