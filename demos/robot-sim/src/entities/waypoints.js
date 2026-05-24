// waypoints.js — Waypoint system (no external imports, data via parameters)

/**
 * createWaypointState(): WaypointState
 */
export function createWaypointState() {
  return {
    queue: [],
    current: null,
    nextId: 1,
  };
}

/**
 * addWaypoint(state, x, y): void
 */
export function addWaypoint(state, x, y) {
  const wp = { x, y, id: state.nextId++ };
  state.queue.push(wp);
  if (!state.current) {
    state.current = state.queue.shift();
  }
}

/**
 * removeWaypoint(state, id): void
 */
export function removeWaypoint(state, id) {
  if (state.current && state.current.id === id) {
    state.current = state.queue.shift() || null;
  } else {
    state.queue = state.queue.filter((w) => w.id !== id);
  }
}

/**
 * clearWaypoints(state): void
 */
export function clearWaypoints(state) {
  state.queue = [];
  state.current = null;
}

/**
 * getCurrentWaypoint(state): Waypoint | null
 */
export function getCurrentWaypoint(state) {
  return state.current;
}

/**
 * advanceWaypoint(state, robot): boolean
 */
export function advanceWaypoint(state, robot) {
  if (!state.current) return false;
  const dx = robot.x - state.current.x;
  const dy = robot.y - state.current.y;
  if (Math.sqrt(dx * dx + dy * dy) < 0.5) {
    state.current = state.queue.shift() || null;
    return true;
  }
  return false;
}

/**
 * canvasClickToGrid(event, canvas, grid, camera): { x, y }
 */
export function canvasClickToGrid(event, canvas, grid, camera) {
  const rect = canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;

  let worldX, worldY;
  if (camera) {
    worldX = (screenX + camera.offsetX) / camera.zoom;
    worldY = (screenY + camera.offsetY) / camera.zoom;
  } else {
    const cellSize = rect.width / grid.cols;
    worldX = screenX / cellSize * grid.cellSize;
    worldY = screenY / cellSize * grid.cellSize;
  }

  const x = Math.floor(worldX / grid.cellSize);
  const y = Math.floor(worldY / grid.cellSize);

  return {
    x: Math.max(0, Math.min(grid.cols - 1, x)),
    y: Math.max(0, Math.min(grid.rows - 1, y)),
  };
}

/**
 * drawWaypoints(config, waypointState, cellSize): void
 */
export function drawWaypoints(config, waypointState, cellSize) {
  const { ctx } = config;
  const all = [];
  if (waypointState.current) all.push(waypointState.current);
  all.push(...waypointState.queue);

  if (all.length === 0) return;

  // Connecting dashed lines
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < all.length; i++) {
    const px = all[i].x * cellSize + cellSize / 2;
    const py = all[i].y * cellSize + cellSize / 2;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Diamond markers
  for (let i = 0; i < all.length; i++) {
    const wp = all[i];
    const px = wp.x * cellSize + cellSize / 2;
    const py = wp.y * cellSize + cellSize / 2;
    const size = 8;
    const isCurrent = wp === waypointState.current;

    ctx.fillStyle = isCurrent ? '#00d4ff' : 'rgba(0, 212, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(px, py - size);
    ctx.lineTo(px + size, py);
    ctx.lineTo(px, py + size);
    ctx.lineTo(px - size, py);
    ctx.closePath();
    ctx.fill();

    // Sequence number
    ctx.fillStyle = '#0a0e17';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), px, py);
  }
}
