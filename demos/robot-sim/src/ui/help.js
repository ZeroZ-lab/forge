// help.js — Help overlay (no external imports)

const HELP_STYLES = `
.help-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  z-index: 1000;
  display: none;
  align-items: center;
  justify-content: center;
}
.help-overlay.visible { display: flex; }
.help-panel {
  background: var(--bg-secondary, #111827);
  border: 1px solid var(--bg-tertiary, #1a2035);
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  color: var(--text-primary, #e2e8f0);
  font-family: Inter, system-ui, sans-serif;
}
.help-panel h2 { margin: 0 0 16px; font-size: 16px; }
.help-panel table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
.help-panel td { padding: 4px 8px; font-size: 13px; border-bottom: 1px solid var(--bg-tertiary, #1a2035); }
.help-panel kbd {
  background: var(--bg-tertiary, #1a2035);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
}
`;

const HELP_CONTENT = `
<h2>快捷键</h2>
<table>
  <tr><td><kbd>Space</kbd></td><td>播放 / 暂停</td></tr>
  <tr><td><kbd>R</kbd></td><td>重置</td></tr>
  <tr><td><kbd>W</kbd> / <kbd>↑</kbd></td><td>前进</td></tr>
  <tr><td><kbd>S</kbd> / <kbd>↓</kbd></td><td>后退</td></tr>
  <tr><td><kbd>A</kbd> / <kbd>←</kbd></td><td>左转</td></tr>
  <tr><td><kbd>D</kbd> / <kbd>→</kbd></td><td>右转</td></tr>
  <tr><td><kbd>H</kbd></td><td>帮助面板</td></tr>
  <tr><td><kbd>Esc</kbd></td><td>关闭帮助</td></tr>
  <tr><td>滚轮</td><td>缩放视口</td></tr>
  <tr><td>中键拖拽</td><td>平移视口</td></tr>
</table>
<h2>功能</h2>
<table>
  <tr><td>点击 Canvas</td><td>设置航点</td></tr>
  <tr><td>点击缩略图</td><td>跳转相机位置</td></tr>
  <tr><td>🤖 自动驾驶</td><td>激光雷达避障</td></tr>
  <tr><td>⏺ 录制 / ⏮ 回放</td><td>轨迹录制回放</td></tr>
  <tr><td>📥 导出</td><td>导出仿真数据为 JSON</td></tr>
</table>
`;

let overlay = null;

/**
 * createHelpOverlay(): HTMLElement
 */
export function createHelpOverlay() {
  // Inject styles
  const style = document.createElement('style');
  style.textContent = HELP_STYLES;
  document.head.appendChild(style);

  // Create overlay
  overlay = document.createElement('div');
  overlay.className = 'help-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) toggleHelp();
  });

  const panel = document.createElement('div');
  panel.className = 'help-panel';
  panel.innerHTML = HELP_CONTENT;
  overlay.appendChild(panel);

  document.body.appendChild(overlay);
  return overlay;
}

/**
 * toggleHelp(): void
 */
export function toggleHelp() {
  if (!overlay) return;
  overlay.classList.toggle('visible');
}
