// renderer.js — Canvas rendering
// Dependencies: lidar.js, waypoints.js, trail.js, pathfinder.js, camera.js, minimap.js, particles.js

import { castRays, drawLidar } from '../entities/lidar.js';
import { drawWaypoints } from '../entities/waypoints.js';
import { drawTrail } from './trail.js';
import { drawPath } from '../engine/pathfinder.js';
import { applyCameraTransform } from './camera.js';
import { drawMinimap } from './minimap.js';
import { drawParticles } from './particles.js';

/**
 * initRenderer(canvas, grid): RenderConfig
 */
export function initRenderer(canvas, grid) {
  const dpr = window.devicePixelRatio || 1;
  const width = grid.cols * grid.cellSize;
  const height = grid.rows * grid.cellSize;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  return { canvas, ctx, width, height, dpr };
}

/**
 * Internal: clear
 */
function clear(config) {
  const { ctx, width, height } = config;
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg-primary')
    .trim() || '#0a0e17';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Internal: drawGrid
 */
function drawGrid(config, grid) {
  const { ctx, width, height } = config;
  const { cols, rows, cellSize } = grid;

  ctx.strokeStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg-tertiary')
    .trim() || '#1a2035';
  ctx.lineWidth = 1;

  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize, 0);
    ctx.lineTo(x * cellSize, height);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellSize);
    ctx.lineTo(width, y * cellSize);
    ctx.stroke();
  }

  const muted = getComputedStyle(document.documentElement)
    .getPropertyValue('--text-muted')
    .trim() || '#64748b';
  ctx.fillStyle = muted;
  ctx.font = '10px "JetBrains Mono", monospace';

  for (let x = 0; x < cols; x++) {
    ctx.textAlign = 'center';
    ctx.fillText(String(x), x * cellSize + cellSize / 2, 10);
  }
  for (let y = 1; y < rows; y++) {
    ctx.textAlign = 'left';
    ctx.fillText(String(y), 2, y * cellSize + 12);
  }
}

/**
 * Internal: drawRobot
 */
function drawRobot(config, robot, cellSize) {
  const { ctx } = config;
  const cx = robot.x * cellSize + cellSize / 2;
  const cy = robot.y * cellSize + cellSize / 2;
  const size = cellSize * 0.35;
  const headingRad = (robot.heading * Math.PI) / 180;

  const color = robot.colliding ? '#ff3366' : '#00d4ff';

  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(
    cx + Math.cos(headingRad) * size,
    cy + Math.sin(headingRad) * size
  );
  ctx.lineTo(
    cx + Math.cos(headingRad + 2.4) * size * 0.7,
    cy + Math.sin(headingRad + 2.4) * size * 0.7
  );
  ctx.lineTo(
    cx + Math.cos(headingRad - 2.4) * size * 0.7,
    cy + Math.sin(headingRad - 2.4) * size * 0.7
  );
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + Math.cos(headingRad) * size * 1.2,
    cy + Math.sin(headingRad) * size * 1.2
  );
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/**
 * Internal: drawObstacle
 */
function drawObstacle(config, obstacle, cellSize) {
  const { ctx } = config;
  const x = obstacle.x * cellSize;
  const y = obstacle.y * cellSize;
  const w = obstacle.width * cellSize;
  const h = obstacle.height * cellSize;

  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--text-muted')
    .trim() || '#64748b';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 4);
  ctx.fill();
}

/**
 * Internal: drawHUD
 */
function drawHUD(config, state) {
  const { ctx, height } = config;
  const textColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--text-secondary')
    .trim() || '#94a3b8';
  ctx.fillStyle = textColor;
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';

  const y = height - 10;
  ctx.fillText(
    'FPS: ' + Math.round(state.fps) +
    '  |  Tick: ' + state.tick +
    '  |  Robots: ' + state.robots.length,
    8,
    y
  );
}

/**
 * renderFrame(config, state, grid, camera, minimapConfig): void
 * Full frame render: reset transform → clear → camera → world → reset → HUD → minimap
 */
export function renderFrame(config, state, grid, camera, minimapConfig) {
  const { ctx } = config;
  const { cellSize } = grid;

  // 0. Reset transform + clear
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(config.dpr, config.dpr);
  clear(config);

  // 1. Apply camera transform
  if (camera) {
    applyCameraTransform(ctx, camera);
  }

  // 2. Grid
  drawGrid(config, grid);

  // 3. Obstacles
  for (const obs of state.obstacles) {
    drawObstacle(config, obs, cellSize);
  }

  // 4. Waypoints
  drawWaypoints(config, state.waypoints, cellSize);

  // 5. A* path
  drawPath(config, state.currentPath, cellSize);

  // 6. Trails
  for (const trail of state.trails) {
    drawTrail(config, trail, cellSize);
  }

  // 7-8. LiDAR + Robots
  for (let i = 0; i < state.robots.length; i++) {
    const robot = state.robots[i];

    if (state.lidarEnabled) {
      const readings = castRays(robot, state.obstacles, grid);
      robot.lidarReadings = readings;
      drawLidar(config, robot, readings, cellSize);
    }

    drawRobot(config, robot, cellSize);
  }

  // 9. Particles (world space)
  if (state.particles) {
    drawParticles(config, state.particles);
  }

  // 10. Reset transform for HUD (screen space)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(config.dpr, config.dpr);
  drawHUD(config, state);

  // 11. Minimap (screen space)
  if (minimapConfig) {
    drawMinimap(config, minimapConfig, state, grid, camera);
  }
}
