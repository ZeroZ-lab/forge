// theme.js — Dark/light theme toggle (no external imports)

const DARK = {
  '--bg-primary': '#0a0e17',
  '--bg-secondary': '#111827',
  '--bg-tertiary': '#1a2035',
  '--text-primary': '#e2e8f0',
  '--text-secondary': '#94a3b8',
  '--text-muted': '#64748b',
};

const LIGHT = {
  '--bg-primary': '#f8fafc',
  '--bg-secondary': '#e2e8f0',
  '--bg-tertiary': '#cbd5e1',
  '--text-primary': '#0f172a',
  '--text-secondary': '#334155',
  '--text-muted': '#94a3b8',
};

let currentTheme = 'dark';

/**
 * applyTheme(): void (internal)
 */
function applyTheme() {
  const vars = currentTheme === 'dark' ? DARK : LIGHT;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

/**
 * initTheme(): void
 */
export function initTheme() {
  const saved = localStorage.getItem('theme');
  currentTheme = saved === 'light' ? 'light' : 'dark';
  applyTheme();
}

/**
 * toggleTheme(): string
 */
export function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', currentTheme);
  applyTheme();
  return currentTheme;
}

/**
 * getCurrentTheme(): string
 */
export function getCurrentTheme() {
  return currentTheme;
}
