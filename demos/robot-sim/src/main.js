// main.js — Application entry point
// Orchestrates all modules: initialization, update loop, render pipeline

import { initTheme, toggleTheme } from './ui/theme.js';
import { createHelpOverlay, toggleHelp } from './ui/help.js';
import { createGrid, generateRandomObstacles, isInBounds } from './entities/map.js';
import { createRobot, applyCommand } from './entities/robot.js';
import { createAutopilot } from './entities/autopilot.js';
import { createWaypointState, addWaypoint, clearWaypoints, canvasClickToGrid, drawWaypoints } from './entities/waypoints.js';
import { createTrail, clearTrail, drawTrail } from './rendering/trail.js';
import { createStats } from './entities/stats.js';
import { createRecorder, recordFrame, startPlayback } from './engine/recorder.js';
import { findPath, drawPath } from './engine/pathfinder.js';
import { castRays, createLidarConfig, drawLidar } from './entities/lidar.js';
import { resolveRobotCollisions } from './entities/flock.js';
import {
  initRenderer, resizeCanvas, clear,
  drawGrid, drawObstacle, drawRobot, drawHUD,
} from './rendering/renderer.js';
import {
  initSimState, startLoop, stopLoop,
  updateRobot, resetSim, setSpeed,
} from './engine/sim-engine.js';
import {
  createControlPanel, updateControlPanel,
  createKeyboardBindings, getPressedKey,
} from './ui/controls.js';

// ============================================================
// Initialization
// ============================================================

// 1. Theme
initTheme();

// 2. Grid
const grid = createGrid(20, 15, 40);

// 3. Initial robot + obstacles
const cx = Math.floor(grid.cols / 2);
const cy = Math.floor(grid.rows / 2);
const initialRobot = createRobot('robot-1', cx, cy, 0);
const obstacles = generateRandomObstacles(10, grid, { x: cx, y: cy });

// 4. Canvas renderer
const canvas = document.getElementById('sim-canvas');
const canvasContainer = document.getElementById('canvas-container');
const renderConfig = initRenderer(canvas, grid);

// Fit canvas to container
resizeCanvas(renderConfig, canvasContainer, grid);

// 5. Extended state objects
const trails = [createTrail(200, 3)];
const waypointState = createWaypointState();
const autopilot = createAutopilot();
const recorder = createRecorder();
const stats = [createStats()];
const lidarConfig = createLidarConfig(12, 5);

// 6. Simulation state
const state = initSimState(grid);
state.obstacles = obstacles;
state.robots = [initialRobot];
state.autopilot = autopilot;
state.waypointState = waypointState;
state.trails = trails;
state.stats = stats;
state.recorder = recorder;
state.path = [];
state.lidarConfig = lidarConfig;

// ============================================================
// Status bar
// ============================================================

const statusBar = document.getElementById('status-bar');

function updateStatusBar() {
  if (!statusBar) return;
  let statusText = 'Stopped';
  let dotClass = '';

  if (recorder.playing) {
    statusText = 'Playing Back';
    dotClass = 'paused';
  } else if (recorder.recording) {
    statusText = 'Recording';
    dotClass = 'running';
  } else if (state.running && !state.paused) {
    statusText = 'Running';
    dotClass = 'running';
  } else if (state.paused) {
    statusText = 'Paused';
    dotClass = 'paused';
  }

  statusBar.innerHTML =
    `<span class="status-dot ${dotClass}"></span>` +
    `<span>${statusText}</span>` +
    `<span>Speed: ${state.speed}x</span>` +
    `<span>Robots: ${state.robots.length}</span>` +
    `<span>Grid: ${grid.cols}×${grid.rows}</span>`;
}

// ============================================================
// Update callback (called each physics tick)
// ============================================================

function onUpdate(state, dt) {
  for (let i = 0; i < state.robots.length; i++) {
    const robot = state.robots[i];

    // Manual keyboard input (only for first robot, when autopilot off and no waypoints)
    if (
      i === 0 &&
      (!state.autopilot || !state.autopilot.enabled) &&
      (!state.waypointState || !state.waypointState.current)
    ) {
      const key = getPressedKey();
      if (key) {
        if (state.waypointState.current) {
          clearWaypoints(state.waypointState);
          state.path = [];
        }
        applyCommand(robot, { type: key }, dt, state.physicsConfig);
      }
    }

    updateRobot(robot, state, dt);
  }

  // Multi-robot collision resolution
  if (state.robots.length > 1) {
    resolveRobotCollisions(state.robots);
  }

  // Path recalculation for waypoints
  if (state.waypointState && state.waypointState.current && state.robots[0]) {
    const robot = state.robots[0];
    const wp = state.waypointState.current;
    state.path = findPath(
      Math.round(robot.x), Math.round(robot.y),
      Math.round(wp.x), Math.round(wp.y),
      state.obstacles, state.grid
    );
  } else {
    state.path = [];
  }

  // Record frame if recording
  if (recorder.recording) {
    recordFrame(recorder, state);
  }

  updateStatusBar();
}

// ============================================================
// Render callback (called each animation frame)
// ============================================================

function onRender(state, fps) {
  const { ctx, width, height } = renderConfig;
  const cs = grid.cellSize;

  // Layer 1: Clear + background
  clear(ctx, width, height);

  // Layer 2: Grid
  drawGrid(ctx, grid);

  // Layer 3: Obstacles
  for (const obs of state.obstacles) {
    drawObstacle(ctx, obs, cs);
  }

  // Layer 4: Trails
  if (state.trails) {
    for (const trail of state.trails) {
      drawTrail(ctx, trail, cs);
    }
  }

  // Layer 5: A* Path (yellow dashed)
  if (state.path && state.path.length > 1) {
    drawPath(ctx, state.path, cs);
  }

  // Layer 6: Waypoints (cyan dashed + diamonds)
  if (state.waypointState) {
    drawWaypoints(ctx, state.waypointState, cs);
  }

  // Layer 7: Lidar rays (when autopilot enabled)
  if (state.autopilot && state.autopilot.enabled && state.robots[0]) {
    const robot = state.robots[0];
    const readings = castRays(robot, state.obstacles, grid, lidarConfig);
    drawLidar(ctx, robot, readings, cs);
  }

  // Layer 8: Robots
  for (const robot of state.robots) {
    drawRobot(ctx, robot, cs);
  }

  // Layer 9: HUD
  drawHUD(ctx, state, fps);

  // Update control panel DOM
  if (controlPanel) {
    updateControlPanel(controlPanel, state);
  }
}

// ============================================================
// Reset helper
// ============================================================

function doReset() {
  stopLoop();
  resetSim(state);

  // Clear trails
  if (state.trails) {
    for (const t of state.trails) clearTrail(t);
  }

  // Clear waypoints and path
  clearWaypoints(waypointState);
  state.path = [];

  // Reset recorder
  recorder.recording = false;
  recorder.playing = false;

  // Reset stats
  if (state.stats) {
    for (const s of state.stats) {
      s.distance = 0;
      s.collisionCount = 0;
      s.wasColliding = false;
    }
  }

  // Render one frame to show reset state
  onRender(state, 0);
  updateStatusBar();
}

// ============================================================
// Control panel
// ============================================================

const controlPanelContainer = document.getElementById('control-panel');
let controlPanel = null;

const callbacks = {
  onPlay: () => {
    if (recorder.playing) return;
    if (state.running) {
      state.paused = !state.paused;
    } else {
      state.running = true;
      state.paused = false;
      startLoop(state, onUpdate, onRender);
    }
    updateStatusBar();
  },

  onPause: () => {
    state.paused = true;
    updateStatusBar();
  },

  onReset: () => {
    doReset();
  },

  onStep: () => {
    if (!state.running || state.paused) {
      updateRobot(state.robots[0], state, state.dt);
      onRender(state, 0);
    }
  },

  onSpeedChange: (speed) => {
    setSpeed(state, speed);
    updateStatusBar();
  },

  onRobotCountChange: (count) => {
    while (state.robots.length < count) {
      let x, y, attempts = 0;
      do {
        x = Math.random() * (grid.cols - 2) + 1;
        y = Math.random() * (grid.rows - 2) + 1;
        attempts++;
      } while (attempts < 100 && !isInBounds(x, y, grid));

      const id = `robot-${state.robots.length + 1}`;
      const robot = createRobot(id, x, y, Math.random() * 360);
      state.robots.push(robot);
      state.trails.push(createTrail(200, 3));
      state.stats.push(createStats());
      state.initialRobots.push({ id, x, y, heading: robot.heading });
    }
    while (state.robots.length > count) {
      state.robots.pop();
      state.trails.pop();
      state.stats.pop();
      state.initialRobots.pop();
    }
    updateStatusBar();
  },

  onGridChange: (cols, rows) => {
    grid.cols = cols;
    grid.rows = rows;

    // Recalculate cell size to fit container
    resizeCanvas(renderConfig, canvasContainer, grid);

    // Stop and reset
    doReset();

    // Regenerate obstacles
    const newCx = Math.floor(grid.cols / 2);
    const newCy = Math.floor(grid.rows / 2);
    state.obstacles = generateRandomObstacles(10, grid, { x: newCx, y: newCy });

    // Reset initial robot position
    state.initialRobots = [{ id: 'robot-1', x: newCx, y: newCy, heading: 0 }];
    if (state.robots[0]) {
      state.robots[0].x = newCx;
      state.robots[0].y = newCy;
      state.robots[0].heading = 0;
    }

    onRender(state, 0);
    updateStatusBar();
  },

  onAutopilotToggle: (enabled) => {
    autopilot.enabled = enabled;
    if (enabled) {
      clearWaypoints(waypointState);
      state.path = [];
    }
  },

  onTrailToggle: (enabled) => {
    for (const trail of state.trails) {
      trail.enabled = enabled;
    }
  },

  onRecordToggle: () => {
    if (recorder.playing) return;
    if (!recorder.recording) {
      // Start recording
      recorder.recording = true;
      recorder.frames = [];
      recorder.playIndex = 0;
    } else {
      // Stop recording
      recorder.recording = false;
    }
    updateStatusBar();
  },

  onPlayback: () => {
    if (recorder.frames.length === 0) return;
    doReset();
    startPlayback(recorder);
    state.running = true;
    startLoop(state, onUpdate, onRender);
    updateStatusBar();
  },

  onThemeToggle: () => {
    const newTheme = toggleTheme();
    const btn = controlPanelContainer.querySelector('#btn-theme');
    if (btn) {
      btn.textContent = newTheme === 'dark' ? '☀ Light Theme' : '🌙 Dark Theme';
    }
    onRender(state, 0);
  },

  onHelpToggle: () => {
    toggleHelp();
  },
};

controlPanel = createControlPanel(controlPanelContainer, callbacks);

// ============================================================
// Keyboard bindings
// ============================================================

createKeyboardBindings(callbacks);

// ============================================================
// Help overlay
// ============================================================

createHelpOverlay();

// ============================================================
// Canvas click → waypoints
// ============================================================

canvas.addEventListener('click', (e) => {
  if (recorder.playing || recorder.recording) return;
  const pos = canvasClickToGrid(e, canvas, grid);
  const gx = Math.floor(pos.x);
  const gy = Math.floor(pos.y);
  if (isInBounds(gx, gy, grid)) {
    addWaypoint(waypointState, pos.x, pos.y);
    // Calculate path to new waypoint
    if (state.robots[0]) {
      const robot = state.robots[0];
      state.path = findPath(
        Math.round(robot.x), Math.round(robot.y),
        gx, gy,
        state.obstacles, grid
      );
    }
  }
});

// ============================================================
// Window resize
// ============================================================

window.addEventListener('resize', () => {
  resizeCanvas(renderConfig, canvasContainer, grid);
  if (!state.running) {
    onRender(state, 0);
  }
});

// ============================================================
// Initial render + status
// ============================================================

updateStatusBar();
onRender(state, 0);
