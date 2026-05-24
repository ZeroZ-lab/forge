// recorder.js — Recording and playback (no external imports)

/**
 * createRecorder(): RecorderState
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
 * recordFrame(recorder, state): void
 */
export function recordFrame(recorder, state) {
  if (!recorder.recording) return;
  const snapshot = {
    tick: state.tick,
    robots: state.robots.map((r) => ({
      id: r.id,
      x: r.x,
      y: r.y,
      heading: r.heading,
      colliding: r.colliding,
    })),
  };
  recorder.frames.push(snapshot);
}

/**
 * startPlayback(recorder): boolean
 */
export function startPlayback(recorder) {
  if (recorder.frames.length === 0) return false;
  recorder.playing = true;
  recorder.playIndex = 0;
  return true;
}

/**
 * stopPlayback(recorder): void
 */
export function stopPlayback(recorder) {
  recorder.playing = false;
  recorder.playIndex = 0;
}

/**
 * advancePlayback(recorder, state): boolean
 */
export function advancePlayback(recorder, state) {
  if (recorder.playIndex >= recorder.frames.length) return false;

  const frame = recorder.frames[recorder.playIndex];
  for (let i = 0; i < state.robots.length && i < frame.robots.length; i++) {
    state.robots[i].x = frame.robots[i].x;
    state.robots[i].y = frame.robots[i].y;
    state.robots[i].heading = frame.robots[i].heading;
    state.robots[i].colliding = frame.robots[i].colliding;
  }
  state.tick = frame.tick;
  recorder.playIndex++;

  return recorder.playIndex < recorder.frames.length;
}
