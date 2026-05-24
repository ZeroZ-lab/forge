// sim-engine.js — Simulation engine: game loop + physics orchestration
// Drives update → render cycle via requestAnimationFrame

import { createRobot, applyCommand, checkCollision } from '../entities/robot.js';
import { createGrid, generateRandomObstacles } from '../entities/map.js';
import { getAutopilotCommand } from '../entities/autopilot.js';
import { advanceWaypoint, getCurrentWaypoint } from '../entities/waypoints.js';
import { resolveRobotCollisions } from '../entities/flock.js';
import { updateStats } from '../entities/stats.js';
import { recordPosition } from '../rendering/trail.js';
import { recordFrame, advancePlayback } from './recorder.js';

const DEG_TO_RAD = Math.PI / 180;

/**
 * Create the initial simulation state
 * @param {GridConfig} gridConfig
 * @returns {SimState}
 */
export function initSimState(gridConfig) {
  const cx = Math.floor(gridConfig.cols / 2);
  const cy = Math.floor(gridConfig.rows / 2);
  const robot = createRobot('robot-1', cx, cy, 0);
  const obstacles = generateRandomObstacles(10, gridConfig, { x: cx, y: cy });

  return {
    running: false,
    paused: false,
    tick: 0,
    speed: 1,
    dt: 1 / 60,
    accumulator: 0,
    robots: [robot],
    obstacles,
    grid: gridConfig,
    initialRobots: [{ id: 'robot-1', x: cx, y: cy, heading: 0 }],
    physicsConfig: { moveSpeed: 2, turnSpeed: 90 },
    // Extended state (attached by main.js)
    autopilot: null,
    waypointState: null,
    trails: [],
    stats: [],
    recorder: null,
    path: [],
  };
}

// --- Game Loop ---

let _animId = null;
let _lastTime = 0;
let _fpsCounter = 0;
let _fpsTime = 0;
let _fps = 60;
let _onUpdate = null;
let _onRender = null;

/**
 * Start the requestAnimationFrame game loop
 */
export function startLoop(state, onUpdate, onRender) {
  _onUpdate = onUpdate;
  _onRender = onRender;
  _lastTime = performance.now();
  _fpsTime = _lastTime;
  _fpsCounter = 0;
  _loop(state);
}

/**
 * Stop the game loop
 */
export function stopLoop() {
  if (_animId !== null) {
    cancelAnimationFrame(_animId);
    _animId = null;
  }
}

/**
 * Internal loop: fixed timestep update, variable render
 */
function _loop(state) {
  _animId = requestAnimationFrame(() => _loop(state));

  const now = performance.now();
  const frameDt = Math.min((now - _lastTime) / 1000, 0.1); // cap at 100ms
  _lastTime = now;

  // FPS calculation
  _fpsCounter++;
  if (now - _fpsTime >= 1000) {
    _fps = _fpsCounter;
    _fpsCounter = 0;
    _fpsTime = now;
  }

  // Update phase
  if (state.running && !state.paused) {
    // During playback, advance recorded frames instead of physics
    if (state.recorder && state.recorder.playing) {
      const continuing = advancePlayback(state.recorder, state);
      if (!continuing) {
        state.running = false;
        state.recorder.playing = false;
      }
    } else {
      // Run N updates per frame based on speed multiplier
      for (let i = 0; i < state.speed; i++) {
        _onUpdate(state, state.dt);
      }
    }
  }

  // Render phase (always, even when paused)
  _onRender(state, _fps);
}

/**
 * Single physics update step for one robot
 */
export function updateRobot(robot, state, dt) {
  const prevX = robot.x;
  const prevY = robot.y;

  let command = null;

  // 1. Autopilot has highest priority
  if (state.autopilot && state.autopilot.enabled) {
    command = getAutopilotCommand(
      robot, state.autopilot, state.tick,
      state.obstacles, state.grid
    );
  }

  // 2. Waypoint steering (overrides autopilot)
  if (state.waypointState) {
    const wp = getCurrentWaypoint(state.waypointState);
    if (wp) {
      const dx = wp.x - robot.x;
      const dy = wp.y - robot.y;
      const targetAngle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
      let angleDiff = targetAngle - robot.heading;
      if (angleDiff > 180) angleDiff -= 360;
      if (angleDiff < -180) angleDiff += 360;

      if (Math.abs(angleDiff) > 10) {
        command = { type: angleDiff > 0 ? 'right' : 'left' };
      } else {
        command = { type: 'forward' };
      }

      advanceWaypoint(state.waypointState, robot);
    }
  }

  // Apply movement command
  if (command) {
    applyCommand(robot, command, dt, state.physicsConfig);
  }

  // Collision detection with obstacles and boundaries
  const wasColliding = robot.colliding;
  const hit = checkCollision(robot, state.obstacles, state.grid);
  if (hit) {
    robot.x = prevX;
    robot.y = prevY;
    robot.colliding = true;
  }

  // Stats update
  const robotIdx = state.robots.indexOf(robot);
  if (state.stats && state.stats[robotIdx]) {
    updateStats(state.stats[robotIdx], robot, prevX, prevY);
  }

  // Trail recording
  if (state.trails && state.trails[robotIdx]) {
    recordPosition(state.trails[robotIdx], robot, state.tick);
  }

  state.tick++;
}

/**
 * Reset simulation to initial state (preserves obstacles)
 */
export function resetSim(state) {
  for (const init of state.initialRobots) {
    const robot = state.robots.find((r) => r.id === init.id);
    if (robot) {
      robot.x = init.x;
      robot.y = init.y;
      robot.heading = init.heading;
      robot.colliding = false;
    }
  }
  state.tick = 0;
  state.running = false;
  state.paused = false;
  state.accumulator = 0;
}

/**
 * Update the speed multiplier
 */
export function setSpeed(state, speed) {
  state.speed = Math.max(1, Math.min(10, speed));
}
