// camera.js — Camera/viewport with pan and zoom (no external imports)

/**
 * createCamera(): CameraState
 */
export function createCamera() {
  return {
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 3,
  };
}

/**
 * screenToWorld(screenX, screenY, camera): { x, y }
 */
export function screenToWorld(screenX, screenY, camera) {
  return {
    x: (screenX + camera.offsetX) / camera.zoom,
    y: (screenY + camera.offsetY) / camera.zoom,
  };
}

/**
 * worldToScreen(worldX, worldY, camera): { x, y }
 */
export function worldToScreen(worldX, worldY, camera) {
  return {
    x: worldX * camera.zoom - camera.offsetX,
    y: worldY * camera.zoom - camera.offsetY,
  };
}

/**
 * clampOffset(camera, worldWidth, worldHeight, viewWidth, viewHeight): void
 */
export function clampOffset(camera, worldWidth, worldHeight, viewWidth, viewHeight) {
  const maxOffsetX = worldWidth * camera.zoom - viewWidth;
  const maxOffsetY = worldHeight * camera.zoom - viewHeight;
  camera.offsetX = Math.max(0, Math.min(maxOffsetX, camera.offsetX));
  camera.offsetY = Math.max(0, Math.min(maxOffsetY, camera.offsetY));
}

/**
 * panCamera(camera, dx, dy, worldWidth, worldHeight, viewWidth, viewHeight): void
 */
export function panCamera(camera, dx, dy, worldWidth, worldHeight, viewWidth, viewHeight) {
  camera.offsetX += dx;
  camera.offsetY += dy;
  clampOffset(camera, worldWidth, worldHeight, viewWidth, viewHeight);
}

/**
 * zoomCamera(camera, factor, pivotX, pivotY, worldWidth, worldHeight, viewWidth, viewHeight): void
 */
export function zoomCamera(camera, factor, pivotX, pivotY, worldWidth, worldHeight, viewWidth, viewHeight) {
  const worldBefore = screenToWorld(pivotX, pivotY, camera);
  camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.zoom * factor));
  camera.offsetX = worldBefore.x * camera.zoom - pivotX;
  camera.offsetY = worldBefore.y * camera.zoom - pivotY;
  clampOffset(camera, worldWidth, worldHeight, viewWidth, viewHeight);
}

/**
 * resetCamera(camera): void
 */
export function resetCamera(camera) {
  camera.offsetX = 0;
  camera.offsetY = 0;
  camera.zoom = 1;
}

/**
 * applyCameraTransform(ctx, camera): void
 */
export function applyCameraTransform(ctx, camera) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.offsetX / camera.zoom, -camera.offsetY / camera.zoom);
}
