// particles.js — Particle effects (no external imports)

/**
 * createParticleState(): ParticleState
 */
export function createParticleState() {
  return {
    particles: [],
    maxParticles: 200,
  };
}

/**
 * spawnParticles(state, x, y, count, color, speedMin, speedMax, life, size): void (internal)
 */
function spawnParticles(state, x, y, count, color, speedMin, speedMax, life, size) {
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= state.maxParticles) {
      state.particles.shift();
    }

    const angle = Math.random() * Math.PI * 2;
    const speed = speedMin + Math.random() * (speedMax - speedMin);

    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      color,
      size,
    });
  }
}

/**
 * spawnCollisionParticles(state, worldX, worldY): void
 */
export function spawnCollisionParticles(state, worldX, worldY) {
  spawnParticles(state, worldX, worldY, 8, '#ff3366', 30, 80, 0.5, 3);
}

/**
 * spawnWaypointParticles(state, worldX, worldY): void
 */
export function spawnWaypointParticles(state, worldX, worldY) {
  spawnParticles(state, worldX, worldY, 12, '#00d4ff', 40, 100, 0.8, 3);
}

/**
 * updateParticles(state, dt): void
 */
export function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

/**
 * drawParticles(config, state): void
 */
export function drawParticles(config, state) {
  const { ctx } = config;

  for (const p of state.particles) {
    const progress = p.life / p.maxLife;
    const alpha = progress;
    const size = p.size * progress;

    if (size <= 0) continue;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}
