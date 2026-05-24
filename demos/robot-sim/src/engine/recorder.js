// recorder.js — Trajectory recording and playback
// Records per-frame snapshots of all robot states, replays them sequentially

/**
 * Create a recorder state
 */
export function createRecorder() {
  return {
    recording: false,
    playing: false,
    frames: [],
    playIndex: 0,
  };
}

/**
 * Record a single frame snapshot of all robot states
 */
export function recordFrame(recorder, state) {
  if (!recorder.recording) return;
  recorder.frames.push({
    tick: state.tick,
    robots: state.robots.map((r) => ({
      id: r.id,
      x: r.x,
      y: r.y,
      heading: r.heading,
      colliding: r.colliding,
    })),
  });
}

/**
 * Start playback from the first recorded frame
 */
export function startPlayback(recorder) {
  if (recorder.frames.length === 0) return;
  recorder.playing = true;
  recorder.playIndex = 0;
}

/**
 * Advance playback by one frame, restoring robot states from the snapshot.
 * @returns {boolean} true if playback is still ongoing, false if finished
 */
export function advancePlayback(recorder, state) {
  if (!recorder.playing) return false;
  if (recorder.playIndex >= recorder.frames.length) {
    recorder.playing = false;
    return false;
  }

  const frame = recorder.frames[recorder.playIndex];
  for (const snap of frame.robots) {
    const robot = state.robots.find((r) => r.id === snap.id);
    if (robot) {
      robot.x = snap.x;
      robot.y = snap.y;
      robot.heading = snap.heading;
      robot.colliding = snap.colliding;
    }
  }
  state.tick = frame.tick;
  recorder.playIndex++;
  return true;
}
