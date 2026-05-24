// help.js — Floating help overlay showing keyboard shortcuts

let overlay = null;

/**
 * Create the help overlay DOM element (hidden by default)
 * @returns {HTMLElement}
 */
export function createHelpOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'help-overlay';
  overlay.style.display = 'none';

  overlay.innerHTML = `
    <div class="help-content">
      <h2>Keyboard Shortcuts</h2>
      <ul class="help-shortcuts">
        <li><span>Play / Pause</span><kbd>Space</kbd></li>
        <li><span>Reset</span><kbd>R</kbd></li>
        <li><span>Single Step</span><kbd>S</kbd></li>
        <li><span>Toggle Help</span><kbd>H</kbd></li>
        <li><span>Close Overlay</span><kbd>Esc</kbd></li>
      </ul>
      <h2 style="margin-top: 16px">Mouse</h2>
      <ul class="help-shortcuts">
        <li><span>Set Waypoint</span><kbd>Click Canvas</kbd></li>
      </ul>
      <button class="help-close">Close (Esc)</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close on button click
  overlay.querySelector('.help-close').addEventListener('click', () => {
    toggleHelp();
  });

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) toggleHelp();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') {
      toggleHelp();
    }
  });

  return overlay;
}

/**
 * Toggle the help overlay visibility
 */
export function toggleHelp() {
  if (!overlay) return;
  const isVisible = overlay.style.display !== 'none';
  overlay.style.display = isVisible ? 'none' : 'flex';
}
