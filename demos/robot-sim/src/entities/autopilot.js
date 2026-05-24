// autopilot.js — Autonomous roaming (no external imports)

/**
 * randomTurnTime(currentTick): number (internal)
 */
function randomTurnTime(currentTick) {
  return currentTick + 180 + Math.floor(Math.random() * 120);
}

/**
 * createAutopilot(): AutopilotState
 */
export function createAutopilot() {
  return {
    enabled: false,
    nextTurnTime: randomTurnTime(0),
    turnDirection: Math.random() < 0.5 ? 1 : -1,
  };
}

/**
 * getAutopilotCommand(robot, autopilot, tick): RobotCommand
 */
export function getAutopilotCommand(robot, autopilot, tick) {
  if (!robot.lidarReadings || robot.lidarReadings.length === 0) {
    return 'forward';
  }

  const readings = robot.lidarReadings;
  const ahead = readings.filter(r => {
    const diff = Math.abs(((r.angle - robot.heading + 540) % 360) - 180);
    return diff < 30;
  });

  const left = readings.filter(r => {
    const diff = Math.abs(((r.angle - robot.heading + 540) % 360) - 180);
    return diff >= 30 && diff < 90;
  });

  const right = readings.filter(r => {
    const diff = Math.abs(((r.angle - robot.heading + 540) % 360) - 180);
    return diff >= 90 && diff < 150;
  });

  const minAhead = ahead.length > 0 ? Math.min(...ahead.map(r => r.distance)) : 5;
  const minLeft = left.length > 0 ? Math.min(...left.map(r => r.distance)) : 5;
  const minRight = right.length > 0 ? Math.min(...right.map(r => r.distance)) : 5;

  // Random turn timer
  if (tick >= autopilot.nextTurnTime) {
    autopilot.nextTurnTime = randomTurnTime(tick);
    autopilot.turnDirection = Math.random() < 0.5 ? 1 : -1;
  }

  // Obstacle avoidance
  if (minAhead < 2) {
    if (minLeft > minRight) return 'left';
    if (minRight > minLeft) return 'right';
    return autopilot.turnDirection > 0 ? 'right' : 'left';
  }

  // Random exploration
  if (tick % 60 === 0 && Math.random() < 0.3) {
    return autopilot.turnDirection > 0 ? 'right' : 'left';
  }

  return 'forward';
}
