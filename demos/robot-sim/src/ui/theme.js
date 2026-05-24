// theme.js — Dark/light theme switching with localStorage persistence

/**
 * Initialize theme from localStorage (defaults to 'dark')
 */
export function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

/**
 * Toggle between dark and light themes
 * @returns {string} The new theme name
 */
export function toggleTheme() {
  const current = getCurrentTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  return next;
}

/**
 * Get the currently active theme name
 * @returns {string}
 */
export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}
