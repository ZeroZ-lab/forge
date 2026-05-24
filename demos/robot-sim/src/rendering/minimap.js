// minimap.js — Minimap overlay (no external imports, data via parameters)

/**
 * createMinimapConfig(): MinimapConfig
 */
export function createMinimapConfig() {
  return {
    width: 160,
    height: 120,
    padding: 8,
    margin: 10,
  };
}

/**
 * isInMinimap(x, y, minimap, renderConfig): boolean (internal)
 */
function isInMinimap(x, y, minimap, renderConfig) {
  const mx = renderConfig.width - minimap.width - minimap.margin;
  const my = minimap.margin;
  return x >= mx && x <= mx + minimap.width && y >= my && y <= my + minimap.height;
}

/**
 * worldToMinimap(worldX, worldY, grid, minimap, renderConfig): { x, y } (internal)
 */
function worldToMinimap(worldX, worldY, grid, minimap, renderConfig) {
  const worldW = grid.cols * grid.cellSize;
  const worldH = grid.rows * grid.cellSize;
  const scaleX = (minimap.width - minimap.padding * 2) / worldW;
  const scaleY = (minimap.height - minimap.padding * 2) / worldH;
  const scale = Math.min(scaleX, scaleY);

  const mx = renderConfig.width - minimap.width - minimap.margin;
  const my = minimap.margin;

  return {
    x: mx + minimap.padding + worldX * scale,
    y: my + minimap.padding + worldY * scale,
  };
}

/**
 * minimapToWorld(mx, my, grid, minimap, renderConfig): { x, y } (internal)
 */
function minimapToWorld(mx, my, grid, minimap, renderConfig) {
  const worldW = grid.cols * grid.cellSize;
  const worldH = grid.rows * grid.cellSize;
  const scaleX = (minimap.width - minimap.padding * 2) / worldW;
  const scaleY = (minimap.height - minimap.padding * 2) / worldH;
  const scale = Math.min(scaleX, scaleY);

  const originX = renderConfig.width - minimap.width - minimap.margin;
  const originY = minimap.margin;

  return {
    x: (mx - originX - minimap.padding) / scale,
    y: (my - originY - minimap.padding) / scale,
  };
}

/**
 * drawMinimap(config, minimap, state, grid, camera): void
 */
export function drawMinimap(config, minimap, state, grid, camera) {
  const { ctx } = config;

  const mx = config.width - minimap.width - minimap.margin;
  const my = minimap.margin;

  // Background
  ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
  ctx.beginPath();
  ctx.roundRect(mx, my, minimap.width, minimap.height, 4);
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Calculate scale
  const worldW = grid.cols * grid.cellSize;
  const worldH = grid.rows * grid.cellSize;
  const scaleX = (minimap.width - minimap.padding * 2) / worldW;
  const scaleY = (minimap.height - minimap.padding * 2) / worldH;
  const scale = Math.min(scaleX, scaleY);

  // Obstacles
  ctx.fillStyle = 'rgba(100, 116, 139, 0.5)';
  for (const obs of state.obstacles) {
    const p = worldToMinimap(obs.x * grid.cellSize, obs.y * grid.cellSize, grid, minimap, config);
    const w = obs.width * grid.cellSize * scale;
    const h = obs.height * grid.cellSize * scale;
    ctx.fillRect(p.x, p.y, Math.max(1, w), Math.max(1, h));
  }

  // Waypoints
  const all = [];
  if (state.waypoints.current) all.push(state.waypoints.current);
  all.push(...state.waypoints.queue);
  ctx.fillStyle = '#00d4ff';
  for (const wp of all) {
    const p = worldToMinimap(wp.x * grid.cellSize, wp.y * grid.cellSize, grid, minimap, config);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Robots
  for (const robot of state.robots) {
    const p = worldToMinimap(robot.x * grid.cellSize, robot.y * grid.cellSize, grid, minimap, config);
    ctx.fillStyle = robot.colliding ? '#ff3366' : '#00d4ff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Viewport rectangle
  if (camera && (camera.zoom !== 1 || camera.offsetX !== 0 || camera.offsetY !== 0)) {
    const vx = camera.offsetX;
    const vy = camera.offsetY;
    const vw = config.width / camera.zoom;
    const vh = config.height / camera.zoom;

    const p1 = worldToMinimap(vx, vy, grid, minimap, config);
    const p2 = worldToMinimap(vx + vw, vy + vh, grid, minimap, config);

    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    ctx.setLineDash([]);
  }
}

/**
 * minimapClickToCamera(event, canvas, minimap, grid, camera, renderConfig): boolean
 */
export function minimapClickToCamera(event, canvas, minimap, grid, camera, renderConfig) {
  const rect = canvas.getBoundingClientRect();
  const sx = event.clientX - rect.left;
  const sy = event.clientY - rect.top;

  if (!isInMinimap(sx, sy, minimap, renderConfig)) return false;

  const world = minimapToWorld(sx, sy, grid, minimap, renderConfig);
  const worldW = grid.cols * grid.cellSize;
  const worldH = grid.rows * grid.cellSize;

  camera.offsetX = world.x * camera.zoom - renderConfig.width / 2;
  camera.offsetY = world.y * camera.zoom - renderConfig.height / 2;

  const maxOffsetX = worldW * camera.zoom - renderConfig.width;
  const maxOffsetY = worldH * camera.zoom - renderConfig.height;
  camera.offsetX = Math.max(0, Math.min(maxOffsetX, camera.offsetX));
  camera.offsetY = Math.max(0, Math.min(maxOffsetY, camera.offsetY));

  return true;
}
