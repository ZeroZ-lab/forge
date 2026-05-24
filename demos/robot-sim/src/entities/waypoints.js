// waypoints.js — Waypoint navigation system
// Click canvas to set waypoints, FIFO queue, auto-advance when reached

/**
 * Create an empty waypoint state
 */
export function createWaypointState() {
  return {
    queue: [],
    current: null,
    nextId: 1,
  };
}

/**
 * Add a waypoint to the queue
 */
export function addWaypoint(state, x, y) {
  const wp = { x, y, id: state.nextId++ };
  state.queue.push(wp);
  if (!state.current) {
    state.current = state.queue.shift();
  }
}

/**
 * Remove a waypoint by ID
 */
export function removeWaypoint(state, id) {
  state.queue = state.queue.filter((w) => w.id !== id);
  if (state.current && state.current.id === id) {
    state.current = state.queue.shift() || null;
  }
}

/**
 * Clear all waypoints
 */
export function clearWaypoints(state) {
  state.queue = [];
  state.current = null;
  state.nextId = 1;
}

/**
 * Get the current target waypoint
 */
export function getCurrentWaypoint(state) {
  return state.current;
}

/**
 * Check if robot has reached the current waypoint and advance to next.
 * @returns {boolean} Whether a waypoint was reached
 */
export function advanceWaypoint(state, robot) {
  if (!state.current) return false;
  const dx = robot.x - state.current.x;
  const dy = robot.y - state.current.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.5) {
    state.current = state.queue.shift() || null;
    return true;
  }
  return false;
}

/**
 * Convert a canvas click event to grid coordinates
 */
export function canvasClickToGrid(event, canvas, grid) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / grid.cellSize;
  const y = (event.clientY - rect.top) / grid.cellSize;
  return { x, y };
}

/**
 * Draw waypoints and connecting lines on the canvas
 */
export function drawWaypoints(ctx, waypointState, cellSize) {
  const all = [];
  if (waypointState.current) all.push(waypointState.current);
  all.push(...waypointState.queue);

  if (all.length === 0) return;

  // Dashed connecting line
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < all.length - 1; i++) {
    ctx.moveTo(all[i].x * cellSize, all[i].y * cellSize);
    ctx.lineTo(all[i + 1].x * cellSize, all[i + 1].y * cellSize);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw each waypoint as a diamond + number
  for (const wp of all) {
    const px = wp.x * cellSize;
    const py = wp.y * cellSize;
    const s = 6;

    ctx.beginPath();
    ctx.moveTo(px, py - s);
    ctx.lineTo(px + s, py);
    ctx.lineTo(px, py + s);
    ctx.lineTo(px - s, py);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(wp.id), px, py);
  }
}
