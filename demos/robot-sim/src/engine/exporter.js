// exporter.js — Data export to JSON file (no external imports)

/**
 * buildExportData(state, grid): ExportData
 */
export function buildExportData(state, grid) {
  const robots = state.robots.map((r) => ({
    id: r.id,
    x: r.x,
    y: r.y,
    heading: r.heading,
    colliding: r.colliding,
  }));

  const stats = state.stats.map((s) => ({
    distance: s.distance,
    collisionCount: s.collisionCount,
  }));

  const trails = state.trails.map((t) =>
    t.points ? t.points.map((p) => ({ x: p.x, y: p.y, tick: p.tick })) : []
  );

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    tick: state.tick,
    grid: {
      cols: grid.cols,
      rows: grid.rows,
      cellSize: grid.cellSize,
    },
    robots,
    stats,
    trails,
  };
}

/**
 * downloadJSON(data, filename): void
 */
export function downloadJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

/**
 * exportSimulationData(state, grid): void
 */
export function exportSimulationData(state, grid) {
  const data = buildExportData(state, grid);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `robot-sim-${timestamp}.json`;
  downloadJSON(data, filename);
}
