// sound.js — Sound effects via Web Audio API (no external imports)

/**
 * createSoundState(): SoundState
 */
export function createSoundState() {
  return {
    enabled: false,
    volume: 0.3,
    ctx: null,
    lastCollisionTime: 0,
  };
}

/**
 * initAudioContext(sound): void
 */
export function initAudioContext(sound) {
  if (sound.ctx) return;
  try {
    sound.ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn('Web Audio API not supported');
  }
}

/**
 * playTone(sound, freq, duration, startTime, type): void (internal)
 */
function playTone(sound, freq, duration, startTime, type) {
  if (!sound.ctx || !sound.enabled) return;

  const osc = sound.ctx.createOscillator();
  const gain = sound.ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(sound.volume * 0.5, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(sound.ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * playCollisionSound(sound): void
 */
export function playCollisionSound(sound) {
  if (!sound.enabled || !sound.ctx) return;

  const now = sound.ctx.currentTime;
  if (now - sound.lastCollisionTime < 0.1) return;
  sound.lastCollisionTime = now;

  playTone(sound, 200, 0.05, now, 'square');
}

/**
 * playWaypointSound(sound): void
 */
export function playWaypointSound(sound) {
  if (!sound.enabled || !sound.ctx) return;

  const now = sound.ctx.currentTime;
  playTone(sound, 400, 0.08, now, 'sine');
  playTone(sound, 600, 0.08, now + 0.08, 'sine');
}

/**
 * setSoundEnabled(sound, enabled): void
 */
export function setSoundEnabled(sound, enabled) {
  sound.enabled = enabled;
  if (enabled && !sound.ctx) {
    initAudioContext(sound);
  }
}

/**
 * setSoundVolume(sound, volume): void
 */
export function setSoundVolume(sound, volume) {
  sound.volume = Math.max(0, Math.min(1, volume));
}
