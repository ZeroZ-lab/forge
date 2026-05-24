// sim-engine.js — Entry point: game loop, orchestration, event bindings
// Orchestration logic ref: contract.md ## 编排

import { createGrid, generateRandomObstacles, isOccupied } from '../entities/map.js';
import {
  createRobot,
  moveForward,
  checkCollision,
  clampToBounds,
  applyCommand,
} from '../entities/robot.js';
import { createAutopilot, getAutopilotCommand } from '../entities/autopilot.js';
import {
  createWaypointState,
  addWaypoint,
  canvasClickToGrid,
  advanceWaypoint,
} from '../entities/waypoints.js';
import { findPath } from './pathfinder.js';
import { resolveRobotCollisions } from '../entities/flock.js';
import { createStats, updateStats } from '../entities/stats.js';
import { createTrail, recordPosition } from '../rendering/trail.js';
import {
  createRecorder,
  recordFrame,
  startPlayback,
  advancePlayback,
  stopPlayback,
} from './recorder.js';
import { initRenderer, renderFrame } from '../rendering/renderer.js';
import { createCamera, panCamera, zoomCamera, resetCamera } from '../rendering/camera.js';
import { createMinimapConfig, minimapClickToCamera } from '../rendering/minimap.js';
import {
  createSoundState,
  playCollisionSound,
  playWaypointSound,
  setSoundEnabled,
} from './sound.js';
import {
  createParticleState,
  updateParticles,
  spawnCollisionParticles,
  spawnWaypointParticles,
} from '../rendering/particles.js';
import { exportSimulationData } from './exporter.js';
import { createControlPanel, updateControlPanel } from '../ui/controls.js';
import { initTheme, toggleTheme } from '../ui/theme.js';
import { createHelpOverlay, toggleHelp } from '../ui/help.js';

// ============================================================
// Global state
// ============================================================

let canvas, renderConfig, grid, state, panel, camera, minimapConfig, sound;
let animFrameId = null;
let lastTimestamp = 0;
let fpsAccum = 0;
let fpsFrames = 0;

const physics = {
  moveSpeed: 2, // cell/s
  turnSpeed: 90, // degree/s
};

// ============================================================
// initSimState(grid, robotCount): SimState
// ============================================================

function initSimState(grid, robotCount) {
  const obstacles = generateRandomObstacles(10, grid);
  const robots = [];
  const stats = [];
  const trails = [];

  for (let i = 0; i < robotCount; i++) {
    let x, y;
    let attempts = 0;
    do {
      x = 2 + Math.random() * (grid.cols - 4);
      y = 2 + Math.random() * (grid.rows - 4);
      attempts++;
    } while (isOccupied(x, y, obstacles) && attempts < 100);

    const robot = createRobot(`robot-${i + 1}`, x, y, Math.random() * 360);
    robot.autopilot = createAutopilot();
    robots.push(robot);
    stats.push(createStats());
    trails.push(createTrail());
  }

  return {
    running: false,
    paused: false,
    tick: 0,
    speed: 1,
    dt: 1 / 60,
    robots,
    obstacles,
    grid,
    robotCount,
    fps: 60,
    lidarEnabled: true,
    autopilotEnabled: false,
    waypoints: createWaypointState(),
    trails,
    currentPath: [],
    recorder: createRecorder(),
    activeCommands: new Set(),
    stats,
    particles: createParticleState(),
  };
}

// ============================================================
// loop(timestamp) — requestAnimationFrame callback
// ============================================================

function loop(timestamp) {
  animFrameId = requestAnimationFrame(loop);

  // Delta + FPS
  const rawDelta = (timestamp - lastTimestamp) / 1000;
  const delta = Math.min(rawDelta, 0.1); // Cap at 100ms
  lastTimestamp = timestamp;

  fpsAccum += rawDelta;
  fpsFrames++;
  if (fpsAccum >= 1) {
    state.fps = fpsFrames / fpsAccum;
    fpsAccum = 0;
    fpsFrames = 0;
  }

  // Mode decision
  if (state.recorder.playing) {
    const hasMore = advancePlayback(state.recorder, state);
    if (!hasMore) {
      stopPlayback(state.recorder);
    }
  } else if (state.running && !state.paused) {
    // Speed multiplier: run update() N times
    for (let i = 0; i < state.speed; i++) {
      update(state.dt);
    }
  }

  // Render (always)
  renderFrame(renderConfig, state, grid, camera, minimapConfig);

  // UI update
  updateControlPanel(panel, state);
  updateStatusBar();

  // Record frame if recording
  if (state.recorder.recording) {
    recordFrame(state.recorder, state);
  }
}

// ============================================================
// update(dt) — one physics step
// ============================================================

function update(dt) {
  // A* path to current waypoint
  if (state.waypoints.current && state.robots.length > 0) {
    const r = state.robots[0];
    state.currentPath = findPath(
      Math.round(r.x),
      Math.round(r.y),
      state.waypoints.current.x,
      state.waypoints.current.y,
      state.obstacles,
      grid
    );
  } else {
    state.currentPath = [];
  }

  // Per-robot update
  for (let i = 0; i < state.robots.length; i++) {
    const robot = state.robots[i];
    const prevX = robot.x;
    const prevY = robot.y;

    // Determine movement command (priority high → low):
    // 1. Waypoint navigation
    // 2. Autopilot
    // 3. Keyboard control
    // 4. Default: move forward
    let command = null;

    if (state.waypoints.current) {
      // Steer toward waypoint
      const wp = state.waypoints.current;
      const dx = wp.x - robot.x;
      const dy = wp.y - robot.y;
      const targetAngle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
      let diff = targetAngle - robot.heading;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      if (Math.abs(diff) > 10) {
        command = diff > 0 ? 'right' : 'left';
      } else {
        command = 'forward';
      }

      const wpReached = advanceWaypoint(state.waypoints, robot);
      if (wpReached) {
        if (sound) playWaypointSound(sound);
        if (state.particles) {
          spawnWaypointParticles(state.particles, robot.x * grid.cellSize, robot.y * grid.cellSize);
        }
      }
    } else if (state.autopilotEnabled && robot.autopilot.enabled) {
      command = getAutopilotCommand(robot, robot.autopilot, state.tick);
    } else if (state.activeCommands.size > 0) {
      for (const cmd of state.activeCommands) {
        command = cmd;
        break;
      }
    }

    // Apply command or default forward
    if (command) {
      applyCommand(robot, command, dt, physics);
    } else {
      moveForward(robot, dt, physics);
    }

    // Collision + bounds
    const wasColliding = robot.colliding;
    checkCollision(robot, state.obstacles, grid);
    clampToBounds(robot, grid);
    if (!wasColliding && robot.colliding) {
      if (sound) playCollisionSound(sound);
      if (state.particles) {
        spawnCollisionParticles(state.particles, robot.x * grid.cellSize, robot.y * grid.cellSize);
      }
    }

    // Trail
    recordPosition(state.trails[i], robot, state.tick);

    // Stats
    updateStats(state.stats[i], robot, prevX, prevY);
  }

  // Multi-robot collision avoidance
  resolveRobotCollisions(state.robots);

  // Particles
  if (state.particles) {
    updateParticles(state.particles, dt);
  }

  state.tick++;
}

// ============================================================
// Loop control
// ============================================================

function startLoop() {
  if (!state.running) {
    state.running = true;
    state.paused = false;
    lastTimestamp = performance.now();
    if (!animFrameId) animFrameId = requestAnimationFrame(loop);
  } else if (state.paused) {
    state.paused = false;
  }
  panel.setPlaying(true);
}

function stopLoop() {
  state.running = false;
  state.paused = false;
  panel.setPlaying(false);
}

function pauseLoop() {
  state.paused = true;
  panel.setPlaying(false);
}

function resumeLoop() {
  state.paused = false;
  panel.setPlaying(true);
}

function stepOnce() {
  update(state.dt);
  renderFrame(renderConfig, state, grid, camera, minimapConfig);
  updateControlPanel(panel, state);
  updateStatusBar();
}

function resetSim() {
  state = initSimState(grid, state.robotCount);
  state.autopilotEnabled = false;
  if (camera) resetCamera(camera);
  renderFrame(renderConfig, state, grid, camera, minimapConfig);
  updateControlPanel(panel, state);
  updateStatusBar();
  panel.setPlaying(false);
}

function setSpeed(speed) {
  state.speed = speed;
}

function setRobotCount(count) {
  state.robotCount = count;
  resetSim();
}

function changeGrid(cols, rows) {
  grid = createGrid(cols, rows, grid.cellSize);
  renderConfig = initRenderer(canvas, grid);
  state = initSimState(grid, state.robotCount);
  if (camera) resetCamera(camera);
  renderFrame(renderConfig, state, grid, camera, minimapConfig);
  updateControlPanel(panel, state);
  panel.setPlaying(false);
}

function updateStatusBar() {
  const bar = document.getElementById('status-bar');
  if (!bar) return;
  let text = 'Ready';
  if (state.recorder.playing) text = '▶ Playback';
  else if (state.recorder.recording) text = '⏺ Recording';
  else if (!state.running) text = 'Stopped';
  else if (state.paused) text = '⏸ Paused';
  else text = '▶ Running';
  bar.textContent = text + ' | FPS: ' + Math.round(state.fps) + ' | Tick: ' + state.tick;
}

// ============================================================
// Keyboard
// ============================================================

function setupRobotKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    const key = e.key.toLowerCase();
    if (
      key === 'w' || key === 'arrowup' ||
      key === 'a' || key === 'arrowleft' ||
      key === 's' || key === 'arrowdown' ||
      key === 'd' || key === 'arrowright'
    ) {
      e.preventDefault();
      const cmdMap = {
        w: 'forward', arrowup: 'forward',
        s: 'backward', arrowdown: 'backward',
        a: 'left', arrowleft: 'left',
        d: 'right', arrowright: 'right',
      };
      state.activeCommands.add(cmdMap[key]);
    }

    if (e.key === 'h' || e.key === 'H') {
      toggleHelp();
    }
    if (e.key === 'Escape') {
      toggleHelp();
    }
  });

  document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    const cmdMap = {
      w: 'forward', arrowup: 'forward',
      s: 'backward', arrowdown: 'backward',
      a: 'left', arrowleft: 'left',
      d: 'right', arrowright: 'right',
    };
    if (cmdMap[key]) {
      state.activeCommands.delete(cmdMap[key]);
    }
  });
}

// ============================================================
// Camera controls (wheel zoom + middle-button pan)
// ============================================================

function setupCameraControls() {
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const pivotX = e.clientX - rect.left;
    const pivotY = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const worldW = grid.cols * grid.cellSize;
    const worldH = grid.rows * grid.cellSize;
    zoomCamera(camera, factor, pivotX, pivotY, worldW, worldH, renderConfig.width, renderConfig.height);
  }, { passive: false });

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button === 1) {
      e.preventDefault();
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (isPanning) {
      const dx = panStartX - e.clientX;
      const dy = panStartY - e.clientY;
      panStartX = e.clientX;
      panStartY = e.clientY;
      const worldW = grid.cols * grid.cellSize;
      const worldH = grid.rows * grid.cellSize;
      panCamera(camera, dx, dy, worldW, worldH, renderConfig.width, renderConfig.height);
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (e.button === 1) {
      isPanning = false;
      canvas.releasePointerCapture(e.pointerId);
    }
  });
}

// ============================================================
// boot() — Entry point (sequence from contract.md ## 编排)
// ============================================================

function boot() {
  // 1. Theme
  initTheme();

  // 2. Grid
  grid = createGrid(20, 15, 40);

  // 3. State (obstacles + robots + autopilot + stats)
  state = initSimState(grid, 1);

  // 4. Renderer
  canvas = document.getElementById('sim-canvas');
  renderConfig = initRenderer(canvas, grid);

  // 5. First frame
  renderFrame(renderConfig, state, grid, camera, minimapConfig);

  // 6. Control panel
  const controlContainer = document.getElementById('control-panel');
  panel = createControlPanel(controlContainer, {
    onPlay: () => {
      if (!state.running || state.paused) startLoop();
      else pauseLoop();
    },
    onPause: pauseLoop,
    onReset: resetSim,
    onStep: stepOnce,
    onSpeedChange: setSpeed,
    onRobotCountChange: setRobotCount,
    onGridChange: changeGrid,
    onAutopilotToggle: (enabled) => {
      state.autopilotEnabled = enabled;
      for (const robot of state.robots) {
        robot.autopilot.enabled = enabled;
      }
    },
    onRecordToggle: (recording) => {
      state.recorder.recording = recording;
    },
    onPlayback: () => {
      if (state.recorder.playing) {
        stopPlayback(state.recorder);
      } else {
        startPlayback(state.recorder);
      }
    },
    onThemeToggle: toggleTheme,
    onSoundToggle: (enabled) => {
      if (sound) setSoundEnabled(sound, enabled);
    },
    onExport: () => {
      exportSimulationData(state, grid);
    },
  });

  // 7. Keyboard
  setupRobotKeyboard();

  // 7.5 Camera
  camera = createCamera();
  setupCameraControls();

  // 7.6 Minimap
  minimapConfig = createMinimapConfig();

  // 7.7 Sound
  sound = createSoundState();

  // 8. Help overlay
  createHelpOverlay();

  // Canvas click → minimap (priority) or waypoints
  canvas.addEventListener('click', (e) => {
    if (minimapClickToCamera(e, canvas, minimapConfig, grid, camera, renderConfig)) {
      return;
    }
    const pos = canvasClickToGrid(e, canvas, grid, camera);
    addWaypoint(state.waypoints, pos.x, pos.y);
  });

  // Window resize → re-render
  window.addEventListener('resize', () => {
    if (renderConfig) {
      renderFrame(renderConfig, state, grid, camera, minimapConfig);
    }
  });

  // Start rAF loop (renders even when paused)
  animFrameId = requestAnimationFrame(loop);
}

// --- Launch ---
boot();
