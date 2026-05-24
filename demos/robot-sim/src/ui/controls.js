// controls.js — Control panel UI and keyboard bindings
// Creates DOM, binds events, updates display each frame

// Module-level key state for continuous movement input
const heldKeys = new Set();

/**
 * Create the control panel DOM inside the given container.
 * @param {HTMLElement} container
 * @param {object} callbacks - Event handlers for all controls
 * @returns {{ container: HTMLElement, callbacks: object }}
 */
export function createControlPanel(container, callbacks) {
  container.innerHTML = `
    <h2 class="panel-title">Robot Sim</h2>

    <div class="control-section">
      <div class="btn-group">
        <button id="btn-play">▶ Play</button>
        <button id="btn-step">⏭ Step</button>
        <button id="btn-reset">↺ Reset</button>
      </div>
    </div>

    <div class="control-section">
      <div class="slider-control">
        <label>Speed <span class="slider-value" id="speed-value">1x</span></label>
        <input type="range" id="speed-slider" min="1" max="10" value="1">
      </div>
      <div class="slider-control">
        <label>Robots <span class="slider-value" id="robot-count-value">1</span></label>
        <input type="range" id="robot-count-slider" min="1" max="10" value="1">
      </div>
    </div>

    <div class="control-section">
      <div class="grid-size">
        <span>Grid</span>
        <input type="number" id="grid-cols" value="20" min="5" max="50">
        <span>×</span>
        <input type="number" id="grid-rows" value="15" min="5" max="50">
      </div>
    </div>

    <div class="control-section">
      <div class="toggle-control">
        <input type="checkbox" id="autopilot-toggle">
        <label for="autopilot-toggle">Autopilot</label>
      </div>
      <div class="toggle-control">
        <input type="checkbox" id="trail-toggle" checked>
        <label for="trail-toggle">Show Trail</label>
      </div>
    </div>

    <div class="control-section">
      <div class="btn-group">
        <button id="btn-record" class="record-btn">⏺ Record</button>
        <button id="btn-playback">▶ Playback</button>
      </div>
    </div>

    <div class="control-section">
      <button id="btn-theme" class="theme-btn">☀ Light Theme</button>
    </div>

    <div class="control-section">
      <button id="btn-help" class="theme-btn">? Help</button>
    </div>

    <div class="control-section robot-info">
      <h3 class="section-title">Robots</h3>
      <div id="robot-cards"></div>
    </div>
  `;

  // --- Bind button events ---
  container.querySelector('#btn-play').addEventListener('click', () => {
    callbacks.onPlay();
  });
  container.querySelector('#btn-step').addEventListener('click', () => {
    callbacks.onStep();
  });
  container.querySelector('#btn-reset').addEventListener('click', () => {
    callbacks.onReset();
  });

  // Speed slider
  const speedSlider = container.querySelector('#speed-slider');
  const speedValue = container.querySelector('#speed-value');
  speedSlider.addEventListener('input', () => {
    const speed = parseInt(speedSlider.value, 10);
    speedValue.textContent = speed + 'x';
    callbacks.onSpeedChange(speed);
  });

  // Robot count slider
  const robotSlider = container.querySelector('#robot-count-slider');
  const robotCountValue = container.querySelector('#robot-count-value');
  robotSlider.addEventListener('input', () => {
    const count = parseInt(robotSlider.value, 10);
    robotCountValue.textContent = count;
    callbacks.onRobotCountChange(count);
  });

  // Grid size inputs
  const gridCols = container.querySelector('#grid-cols');
  const gridRows = container.querySelector('#grid-rows');
  const handleGridChange = () => {
    const cols = Math.max(5, Math.min(50, parseInt(gridCols.value) || 20));
    const rows = Math.max(5, Math.min(50, parseInt(gridRows.value) || 15));
    callbacks.onGridChange(cols, rows);
  };
  gridCols.addEventListener('change', handleGridChange);
  gridRows.addEventListener('change', handleGridChange);

  // Autopilot toggle
  container.querySelector('#autopilot-toggle').addEventListener('change', (e) => {
    callbacks.onAutopilotToggle(e.target.checked);
  });

  // Trail toggle
  container.querySelector('#trail-toggle').addEventListener('change', (e) => {
    callbacks.onTrailToggle(e.target.checked);
  });

  // Record / Playback
  container.querySelector('#btn-record').addEventListener('click', () => {
    callbacks.onRecordToggle();
  });
  container.querySelector('#btn-playback').addEventListener('click', () => {
    callbacks.onPlayback();
  });

  // Theme
  container.querySelector('#btn-theme').addEventListener('click', () => {
    callbacks.onThemeToggle();
  });

  // Help
  container.querySelector('#btn-help').addEventListener('click', () => {
    callbacks.onHelpToggle();
  });

  return { container, callbacks };
}

/**
 * Update the control panel display to reflect current simulation state.
 * Called every frame.
 */
export function updateControlPanel(panel, state) {
  const { container } = panel;

  // Play/Pause button label
  const playBtn = container.querySelector('#btn-play');
  if (playBtn) {
    playBtn.textContent = state.running ? '⏸ Pause' : '▶ Play';
  }

  // Record button state
  const recordBtn = container.querySelector('#btn-record');
  if (recordBtn) {
    if (state.recorder && state.recorder.recording) {
      recordBtn.classList.add('recording');
      recordBtn.textContent = ' Stop';
    } else {
      recordBtn.classList.remove('recording');
      recordBtn.textContent = '⏺ Record';
    }
  }

  // Autopilot toggle sync
  const autopilotToggle = container.querySelector('#autopilot-toggle');
  if (autopilotToggle && state.autopilot) {
    autopilotToggle.checked = state.autopilot.enabled;
  }

  // Trail toggle sync
  const trailToggle = container.querySelector('#trail-toggle');
  if (trailToggle && state.trails && state.trails[0]) {
    trailToggle.checked = state.trails[0].enabled;
  }

  // Update robot info cards
  const cardsContainer = container.querySelector('#robot-cards');
  if (cardsContainer && state.robots) {
    cardsContainer.innerHTML = '';
    state.robots.forEach((robot, i) => {
      const stats = state.stats ? state.stats[i] : null;
      const card = document.createElement('div');
      card.className = 'robot-card';

      const statusLabel = robot.colliding
        ? 'Colliding'
        : state.running
          ? 'Running'
          : 'Stopped';

      card.innerHTML = `
        <div class="robot-card-header">
          <span class="robot-dot ${robot.colliding ? 'colliding' : ''}"></span>
          <span>${robot.id}</span>
        </div>
        <div class="robot-card-body">
          Pos: (${robot.x.toFixed(1)}, ${robot.y.toFixed(1)})<br>
          Heading: ${Math.round(robot.heading)}°<br>
          Status: ${statusLabel}
          ${stats ? `<br>Distance: ${stats.distance.toFixed(1)} cells<br>Collisions: ${stats.collisionCount}` : ''}
        </div>
      `;
      cardsContainer.appendChild(card);
    });
  }
}

/**
 * Bind global keyboard shortcuts.
 * Ignores keypresses when an input/select/textarea is focused.
 * @returns {function} Cleanup function to remove listeners
 */
export function createKeyboardBindings(callbacks) {
  const keydownHandler = (e) => {
    if (
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'SELECT' ||
      e.target.tagName === 'TEXTAREA'
    ) {
      return;
    }

    // Track held keys for continuous movement
    if (['ArrowUp', 'w', 'W'].includes(e.key)) heldKeys.add('forward');
    if (['ArrowDown', 'x', 'X'].includes(e.key)) heldKeys.add('backward');
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) heldKeys.add('left');
    if (['ArrowRight', 'd', 'D'].includes(e.key)) heldKeys.add('right');

    // One-shot actions
    switch (e.key) {
      case ' ':
        e.preventDefault();
        callbacks.onPlay();
        break;
      case 'r':
      case 'R':
        callbacks.onReset();
        break;
      case 'h':
      case 'H':
        callbacks.onHelpToggle();
        break;
      case 'Escape':
        callbacks.onHelpToggle();
        break;
      case 's':
      case 'S':
        callbacks.onStep();
        break;
    }
  };

  const keyupHandler = (e) => {
    if (['ArrowUp', 'w', 'W'].includes(e.key)) heldKeys.delete('forward');
    if (['ArrowDown', 'x', 'X'].includes(e.key)) heldKeys.delete('backward');
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) heldKeys.delete('left');
    if (['ArrowRight', 'd', 'D'].includes(e.key)) heldKeys.delete('right');
  };

  document.addEventListener('keydown', keydownHandler);
  document.addEventListener('keyup', keyupHandler);

  return () => {
    document.removeEventListener('keydown', keydownHandler);
    document.removeEventListener('keyup', keyupHandler);
    heldKeys.clear();
  };
}

/**
 * Get the currently held movement key direction.
 * Checked each frame by the engine for continuous input.
 * @returns {'forward'|'backward'|'left'|'right'|null}
 */
export function getPressedKey() {
  if (heldKeys.has('forward')) return 'forward';
  if (heldKeys.has('backward')) return 'backward';
  if (heldKeys.has('left')) return 'left';
  if (heldKeys.has('right')) return 'right';
  return null;
}
