/**
 * run-helpers.mjs — Shared helpers for processing benchmark report data models.
 *
 * These functions operate on the run objects produced by the skills-suite
 * benchmark runner and consumed by both the runner and the evaluator.
 *
 * Zero external dependencies. Pure Node.js built-ins.
 */

// ---------------------------------------------------------------------------
// Data-model helpers (8 exact duplicates extracted)
// ---------------------------------------------------------------------------

/**
 * Extract artifact paths from a run object.
 * @param {object} run - A benchmark case run.
 * @returns {Set<string>} Artifact paths.
 */
export function artifactPaths(run) {
  return new Set(
    (run.artifacts ?? []).map((artifact) => (typeof artifact === 'string' ? artifact : artifact?.path)).filter(Boolean),
  );
}

/**
 * Extract Change Unit paths from a run object.
 * Only paths matching the docs/change-units/CU-*.md pattern are included.
 * @param {object} run - A benchmark case run.
 * @returns {Set<string>} Change Unit paths.
 */
export function changeUnitPaths(run) {
  return new Set(
    (run.change_units ?? [])
      .map((changeUnit) => (typeof changeUnit === 'string' ? changeUnit : changeUnit?.path))
      .filter(isChangeUnitPath),
  );
}

/**
 * Simple glob match supporting only the `*` wildcard.
 * @param {string} pattern - Pattern with optional `*` wildcards.
 * @param {string} value - Value to test against the pattern.
 * @returns {boolean} Whether the value matches the pattern.
 */
export function globMatch(pattern, value) {
  if (!pattern.includes('*')) return value === pattern;
  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`).test(value);
}

/**
 * Normalize skill names reported by different prompt generations.
 * Manifests use bare ids (detail); some runner prompts produce forge-detail.
 *
 * @param {string} value - Reported skill name.
 * @returns {string} Normalized skill name.
 */
export function normalizeSkillName(value) {
  return typeof value === 'string' && value.startsWith('forge-') ? value.slice('forge-'.length) : value;
}

/**
 * Match expected artifact or goal paths against concrete reported paths.
 *
 * Supports exact/glob patterns, directory expectations (`src/` matches
 * `src/foo.ts`), and basename expectations (`goal.md` matches
 * `docs/features/x/goal.md`).
 *
 * @param {string} expected - Expected path or glob.
 * @param {string} actual - Actual reported path.
 * @returns {boolean} Whether the actual path satisfies the expectation.
 */
export function pathMatch(expected, actual) {
  if (typeof expected !== 'string' || typeof actual !== 'string') return false;
  if (globMatch(expected, actual)) return true;
  if (expected.endsWith('/')) return actual.startsWith(expected);
  if (!expected.includes('/')) return actual.split('/').at(-1) === expected;
  return false;
}

/**
 * Extract decision IDs from a run object.
 * @param {object} run - A benchmark case run.
 * @returns {Set<string>} Decision IDs.
 */
export function decisionIds(run) {
  return new Set(
    (run.decisions ?? []).map((decision) => (typeof decision === 'string' ? decision : decision?.id)).filter(Boolean),
  );
}

/**
 * Extract doc-sync targets from a run object (goal_verification entries with status 'completed').
 * @param {object} run - A benchmark case run.
 * @returns {Set<string>} Completed sync targets.
 */
export function docSyncTargets(run) {
  return new Set(
    (run.goal_verification ?? [])
      .filter((item) => item?.status === 'completed')
      .map((item) => item?.target)
      .filter(Boolean),
  );
}

/**
 * Extract goal coverage paths from a run object.
 * Includes both source and covers paths from goal_coverage_entries.
 * @param {object} run - A benchmark case run.
 * @returns {Set<string>} Goal coverage paths.
 */
export function goalCoveragePaths(run) {
  const paths = new Set();
  for (const entry of run.goal_coverage_entries ?? []) {
    if (entry?.source) paths.add(entry.source);
    for (const coveredPath of entry?.covers ?? []) paths.add(coveredPath);
  }
  return paths;
}

/**
 * Check whether a path matches the Change Unit path pattern.
 * @param {string} value - Path to check.
 * @returns {boolean} Whether the path is a Change Unit path.
 */
export function isChangeUnitPath(value) {
  return typeof value === 'string' && /^docs\/change-units\/CU-[^/]+\.md$/.test(value);
}

/**
 * Concatenate evidence text from a run object.
 * @param {object} run - A benchmark case run.
 * @returns {string} Combined evidence text.
 */
export function evidenceText(run) {
  return [...(run.evidence ?? []), run.notes ?? ''].join('\n');
}

// ---------------------------------------------------------------------------
// checkRun (near-duplicate unified)
// ---------------------------------------------------------------------------

/**
 * Run oracle checks against a benchmark case run.
 *
 * @param {object} testCase - Benchmark test case with oracle_checks array.
 * @param {object} run - Benchmark case run result.
 * @returns {Array<{passed: boolean, check: object}>} Check results.
 */
export function checkRun(testCase, run) {
  const triggeredSkills = new Set((run.triggered_skills ?? []).map(normalizeSkillName));
  const artifacts = artifactPaths(run);
  const changeUnits = changeUnitPaths(run);
  const commands = new Set(run.commands_run ?? []);
  const decisions = decisionIds(run);
  const docSync = docSyncTargets(run);
  const goalCoverage = goalCoveragePaths(run);
  const forbiddenBehaviors = new Set(run.forbidden_behaviors ?? []);
  const evidence = evidenceText(run);

  return testCase.oracle_checks.map((check) => {
    let passed = false;
    if (check.type === 'skill_triggered') passed = triggeredSkills.has(check.skill);
    if (check.type === 'artifact_reported') passed = [...artifacts].some((artifactPath) => pathMatch(check.path, artifactPath));
    if (check.type === 'artifact_absent') passed = ![...artifacts].some((artifactPath) => pathMatch(check.path, artifactPath));
    if (check.type === 'change_unit_reported') {
      passed = [...changeUnits].some((changeUnitPath) => globMatch(check.path, changeUnitPath));
    }
    if (check.type === 'goal_covers') {
      passed = [...goalCoverage].some((coveredPath) => pathMatch(check.path, coveredPath));
    }
    if (check.type === 'command_reported') passed = commands.has(check.command);
    if (check.type === 'decision_gate_reported') passed = decisions.has(check.decision);
    if (check.type === 'goal_verified') passed = [...docSync].some((target) => pathMatch(check.target, target));
    if (check.type === 'evidence_contains') passed = evidence.includes(check.text);
    if (check.type === 'forbidden_behavior_absent') passed = !forbiddenBehaviors.has(check.behavior);
    return { passed, check };
  });
}
