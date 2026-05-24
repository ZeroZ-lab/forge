// controls.js — Control panel UI (no external imports, callbacks for engine communication)

/**
 * createControlPanel(container, callbacks): ControlPanel
 */
export function createControlPanel(container, callbacks) {
  container.innerHTML = '';

  const panel = document.createElement('div');
  panel.className = 'control-panel';

  // --- Control buttons ---
  const btnGroup = document.createElement('div');
  btnGroup.className = 'control-group';

  const btnPlay = document.createElement('button');
  btnPlay.id = 'btn-play';
  btnPlay.className = 'btn';
  btnPlay.textContent = '▶ 播放';
  btnPlay.addEventListener('click', () => {
    if (btnPlay.classList.contains('playing')) {
      callbacks.onPause();
    } else {
      callbacks.onPlay();
    }
  });

  const btnStep = document.createElement('button');
  btnStep.id = 'btn-step';
  btnStep.className = 'btn';
  btnStep.textContent = '⏭ 单步';
  btnStep.addEventListener('click', callbacks.onStep);

  const btnReset = document.createElement('button');
  btnReset.id = 'btn-reset';
  btnReset.className = 'btn';
  btnReset.textContent = '↺ 重置';
  btnReset.addEventListener('click', callbacks.onReset);

  const btnAutopilot = document.createElement('button');
  btnAutopilot.id = 'btn-autopilot';
  btnAutopilot.className = 'btn';
  btnAutopilot.textContent = '🤖 自动驾驶';
  btnAutopilot.addEventListener('click', () => {
    const active = btnAutopilot.classList.toggle('active');
    callbacks.onAutopilotToggle(active);
  });

  const btnRecord = document.createElement('button');
  btnRecord.id = 'btn-record';
  btnRecord.className = 'btn';
  btnRecord.textContent = '⏺ 录制';
  btnRecord.addEventListener('click', () => {
    const recording = btnRecord.classList.toggle('active');
    callbacks.onRecordToggle(recording);
  });

  const btnPlayback = document.createElement('button');
  btnPlayback.id = 'btn-playback';
  btnPlayback.className = 'btn';
  btnPlayback.textContent = '⏮ 回放';
  btnPlayback.addEventListener('click', callbacks.onPlayback);

  const btnSound = document.createElement('button');
  btnSound.id = 'btn-sound';
  btnSound.className = 'btn';
  btnSound.textContent = '🔇 音效';
  btnSound.addEventListener('click', () => {
    const active = btnSound.classList.toggle('active');
    btnSound.textContent = active ? '🔊 音效' : '🔇 音效';
    callbacks.onSoundToggle(active);
  });

  const btnExport = document.createElement('button');
  btnExport.id = 'btn-export';
  btnExport.className = 'btn';
  btnExport.textContent = '📥 导出';
  btnExport.addEventListener('click', callbacks.onExport);

  btnGroup.append(btnPlay, btnStep, btnReset, btnAutopilot, btnRecord, btnPlayback, btnSound, btnExport);

  // --- Sliders ---
  const sliderGroup = document.createElement('div');
  sliderGroup.className = 'control-group';

  const speedLabel = document.createElement('label');
  speedLabel.textContent = '速度';
  const speedVal = document.createElement('span');
  speedVal.id = 'speed-value';
  speedVal.className = 'mono';
  speedVal.textContent = '1x';
  const speedSlider = document.createElement('input');
  speedSlider.type = 'range';
  speedSlider.id = 'speed-slider';
  speedSlider.min = '1';
  speedSlider.max = '10';
  speedSlider.value = '1';
  speedSlider.addEventListener('input', () => {
    const v = Number(speedSlider.value);
    speedVal.textContent = v + 'x';
    callbacks.onSpeedChange(v);
  });

  const rcLabel = document.createElement('label');
  rcLabel.textContent = '机器人数';
  const rcVal = document.createElement('span');
  rcVal.id = 'robot-count-value';
  rcVal.className = 'mono';
  rcVal.textContent = '1';
  const rcSlider = document.createElement('input');
  rcSlider.type = 'range';
  rcSlider.id = 'robot-count';
  rcSlider.min = '1';
  rcSlider.max = '10';
  rcSlider.value = '1';
  rcSlider.addEventListener('input', () => {
    const v = Number(rcSlider.value);
    rcVal.textContent = v;
    callbacks.onRobotCountChange(v);
  });

  sliderGroup.append(
    speedLabel, speedVal, speedSlider,
    rcLabel, rcVal, rcSlider
  );

  // --- Grid config ---
  const gridGroup = document.createElement('div');
  gridGroup.className = 'control-group grid-config';

  const gcLabel = document.createElement('label');
  gcLabel.textContent = '地图大小';
  const colsInput = document.createElement('input');
  colsInput.type = 'number';
  colsInput.id = 'grid-cols';
  colsInput.value = '20';
  colsInput.min = '5';
  colsInput.max = '50';
  const sep = document.createElement('span');
  sep.textContent = '×';
  const rowsInput = document.createElement('input');
  rowsInput.type = 'number';
  rowsInput.id = 'grid-rows';
  rowsInput.value = '15';
  rowsInput.min = '5';
  rowsInput.max = '50';
  const btnGrid = document.createElement('button');
  btnGrid.id = 'btn-apply-grid';
  btnGrid.className = 'btn';
  btnGrid.textContent = '应用';
  btnGrid.addEventListener('click', () => {
    callbacks.onGridChange(Number(colsInput.value), Number(rowsInput.value));
  });

  gridGroup.append(gcLabel, colsInput, sep, rowsInput, btnGrid);

  // --- Theme ---
  const themeGroup = document.createElement('div');
  themeGroup.className = 'control-group';
  const btnTheme = document.createElement('button');
  btnTheme.id = 'btn-theme';
  btnTheme.className = 'btn';
  btnTheme.textContent = '🌓 切换主题';
  btnTheme.addEventListener('click', callbacks.onThemeToggle);
  themeGroup.appendChild(btnTheme);

  // --- Robot info ---
  const infoGroup = document.createElement('div');
  infoGroup.className = 'control-group';
  const robotInfo = document.createElement('div');
  robotInfo.id = 'robot-info';
  infoGroup.appendChild(robotInfo);

  panel.append(btnGroup, sliderGroup, gridGroup, themeGroup, infoGroup);
  container.appendChild(panel);

  const controlPanel = {
    container,
    btnPlay,
    btnAutopilot,
    btnRecord,
    btnPlayback,
    btnSound,
    btnExport,
    robotInfo,
    speedSlider,
    speedVal,
    rcSlider,
    rcVal,
    cleanupKeyboard: () => {},
    setPlaying(playing) {
      btnPlay.textContent = playing ? '⏸ 暂停' : '▶ 播放';
      if (playing) btnPlay.classList.add('playing');
      else btnPlay.classList.remove('playing');
    },
  };

  return controlPanel;
}

/**
 * updateControlPanel(panel, state): void
 */
export function updateControlPanel(panel, state) {
  const info = panel.robotInfo;
  if (!info) return;

  const existingCards = info.querySelectorAll('.robot-card');
  if (existingCards.length !== state.robots.length) {
    info.innerHTML = '';
    for (const robot of state.robots) {
      const card = document.createElement('div');
      card.className = 'robot-card';
      card.dataset.robotId = robot.id;
      card.innerHTML =
        '<div class="robot-card-header">' +
          '<span class="robot-id">' + robot.id + '</span>' +
          '<span class="status-indicator"></span>' +
        '</div>' +
        '<div class="robot-data">' +
          '<span class="mono robot-pos"></span>' +
          '<span class="mono robot-heading"></span>' +
          '<span class="mono robot-distance"></span>' +
          '<span class="mono robot-collisions"></span>' +
        '</div>';
      info.appendChild(card);
    }
  }

  const cards = info.querySelectorAll('.robot-card');
  cards.forEach((card, i) => {
    if (i >= state.robots.length) return;
    const robot = state.robots[i];
    const stats = state.stats && state.stats[i] ? state.stats[i] : null;

    const indicator = card.querySelector('.status-indicator');
    indicator.className = 'status-indicator';
    if (robot.colliding) indicator.classList.add('colliding');
    else if (state.running && !state.paused) indicator.classList.add('running');
    else if (state.paused) indicator.classList.add('paused');

    card.querySelector('.robot-pos').textContent =
      '(' + robot.x.toFixed(1) + ', ' + robot.y.toFixed(1) + ')';
    card.querySelector('.robot-heading').textContent =
      '朝向: ' + Math.round(robot.heading) + '°';
    card.querySelector('.robot-distance').textContent =
      '距离: ' + (stats ? stats.distance.toFixed(1) : '0.0');
    card.querySelector('.robot-collisions').textContent =
      '碰撞: ' + (stats ? stats.collisionCount : 0);
  });
}

/**
 * bindKeyboard(callbacks): () => void
 */
export function bindKeyboard(callbacks) {
  const handler = (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      callbacks.onPlay();
    } else if (e.code === 'KeyR') {
      callbacks.onReset();
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}
