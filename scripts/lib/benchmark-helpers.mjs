/**
 * benchmark-helpers.mjs — Presentation helpers for benchmark summary reports.
 *
 * Extracted from run-skills-benchmark.mjs for testability.
 * Zero external dependencies. Pure Node.js built-ins.
 */

/**
 * Truncate an array into a short display string.
 * @param {Array<string>|null|undefined} items - Items to display.
 * @param {number} [limit=4] - Maximum items before truncation.
 * @returns {string} Display string.
 */
export function truncateList(items, limit = 4) {
  if (!items || items.length === 0) return '-';
  const visible = items.slice(0, limit);
  const suffix = items.length > limit ? `, +${items.length - limit} more` : '';
  return `${visible.join(', ')}${suffix}`;
}

/**
 * Escape a value for safe use inside a Markdown table cell.
 * @param {*} value - Value to escape.
 * @returns {string} Escaped string.
 */
export function markdownTableCell(value) {
  return String(value).replaceAll('\n', '<br>').replaceAll('|', '\\|');
}
