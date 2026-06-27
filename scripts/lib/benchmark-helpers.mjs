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

export function sanitizeNoForgeFixture(fixture) {
  const forgeSpecificPatterns = [
    /\bForge\b/i,
    /默认主链/,
    /detail\s*->\s*codegen\s*->\s*review/,
    /Change Unit/i,
    /docs\/features\/[^`\s]+\/goal\.md/i,
    /\bfeature goal\b/i,
    /goal before implementation/i,
    /from the goal/i,
    /against the goal/i,
    /goal verification/i,
    /goal_verification/i,
    /goal coverage/i,
    /goal_coverage_entries/i,
    /triggered_skills/i,
    /expected_skills/i,
    /Trigger only .*default chain skills/i,
    /trigger .*Forge .*skills?/i,
    /docs\/change-units/i,
    /docs\/project\.md/,
  ];
  let inExpectedBehaviorBlock = false;
  const lines = fixture.split(/\r?\n/).filter((line) => {
    if (/^Expected behavior:\s*$/i.test(line.trim())) {
      inExpectedBehaviorBlock = true;
      return false;
    }
    if (inExpectedBehaviorBlock) return false;
    return !forgeSpecificPatterns.some((pattern) => pattern.test(line));
  });
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
