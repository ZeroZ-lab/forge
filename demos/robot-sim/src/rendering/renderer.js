// renderer.js — Canvas 2D rendering
// Layer order: background → grid → obstacles → trail → lidar → path → waypoints → robots → HUD

/**
 * Initialize the renderer: set canvas size with DPR scaling
 * @returns {{ canvas, ctx, dpr }}
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

  return { canvas, ctx, dpr, width, height };
}

/**
 * Resize the canvas to fill its container, maintaining grid proportions
 */
export function resizeCanvas(renderConfig, container, grid) {
  const dpr = window.devicePixelRatio || 1;
  const w = container.clientWidth;
  const h = container.clientHeight;

  renderConfig.canvas.width = w * dpr;
  renderConfig.canvas.height = h * dpr;
  renderConfig.canvas.style.width = w + 'px';
  renderConfig.canvas.style.height = h + 'px';
  renderConfig.width = w;
  renderConfig.height = h;
  renderConfig.dpr = dpr;

  const ctx = renderConfig.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  // Recalculate cell size to fill available space
  grid.cellSize = Math.floor(
    Math.min(w / grid.cols, h / grid.rows)
  );
}

/**
 * Clear the canvas and fill with background color
 */
export function clear(ctx, width, height) {
  const bgColor = getCSSVar('--bg-primary') || '#0a0e17';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Draw the grid lines and coordinate labels
 */
export function drawGrid(ctx, grid) {
  const { cols, rows, cellSize } = grid;
  const lineColor = getCSSVar('--bg-tertiary') || '#1a2035';
  const textColor = getCSSVar('--text-muted') || '#64748b';

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 0.5;

  // Vertical lines
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize, 0);
    ctx.lineTo(x * cellSize, rows * cellSize);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellSize);
    ctx.lineTo(cols * cellSize, y * cellSize);
    ctx.stroke();
  }

  // Coordinate labels
  ctx.fillStyle = textColor;
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let x = 0; x < cols; x += 5) {
    ctx.fillText(String(x), x * cellSize + cellSize / 2, 2);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let y = 0; y < rows; y += 5) {
    ctx.fillText(String(y), 2, y * cellSize + cellSize / 2);
  }
}

/**
 * Draw a single obstacle as a rounded solid block
 */
export function drawObstacle(ctx, obs, cellSize) {
  const color = getCSSVar('--text-muted') || '#64748b';
  const x = obs.x * cellSize + 1;
  const y = obs.y * cellSize + 1;
  const w = obs.width * cellSize - 2;
  const h = obs.height * cellSize - 2;
  const r = 3;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Draw a robot as a triangle pointing in its heading direction, with glow
 */
export function drawRobot(ctx, robot, cellSize) {
  const accentColor = getCSSVar('--accent-primary') || '#00d4ff';
  const dangerColor = getCSSVar('--accent-danger') || '#ff3366';
  const color = robot.colliding ? dangerColor : accentColor;

  const px = robot.x * cellSize;
  const py = robot.y * cellSize;
  const size = cellSize * 0.35;
  const rad = (robot.heading * Math.PI) / 180;

  // Triangle vertices
  const nose = {
    x: px + Math.cos(rad) * size,
    y: py + Math.sin(rad) * size,
  };
  const left = {
    x: px + Math.cos(rad + (2.4)) * size * 0.7,
    y: py + Math.sin(rad + (2.4)) * size * 0.7,
  };
  const right = {
    x: px + Math.cos(rad - (2.4)) * size * 0.7,
    y: py + Math.sin(rad - (2.4)) * size * 0.7,
  };

  // Glow effect
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.moveTo(nose.x, nose.y);
  ctx.lineTo(left.x, left.y);
  ctx.lineTo(right.x, right.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();

  // Direction line extending from nose
  ctx.beginPath();
  ctx.moveTo(nose.x, nose.y);
  ctx.lineTo(
    px + Math.cos(rad) * size * 1.5,
    py + Math.sin(rad) * size * 1.5
  );
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/**
 * Draw HUD overlay (FPS counter and tick number) in top-left corner
 */
export function drawHUD(ctx, state, fps) {
  const textColor = getCSSVar('--text-secondary') || '#94a3b8';
  ctx.fillStyle = textColor;
  ctx.font = '11px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`FPS: ${fps}`, 8, 8);
  ctx.fillText(`Tick: ${state.tick}`, 8, 22);
}

/**
 * Read a CSS custom property value from :root
 */
function getCSSVar(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}
