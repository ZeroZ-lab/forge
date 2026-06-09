/**
 * run-skills-benchmark.test.mjs — Unit tests for benchmark runner helpers.
 *
 * Covers:
 *   - globMatch (run-helpers)
 *   - isChangeUnitPath (run-helpers)
 *   - artifactPaths (run-helpers)
 *   - changeUnitPaths (run-helpers)
 *   - goalCoveragePaths (run-helpers)
 *   - decisionIds (run-helpers)
 *   - docSyncTargets (run-helpers)
 *   - evidenceText (run-helpers)
 *   - checkRun — all 9 oracle check types (run-helpers)
 *   - truncateList (benchmark-helpers)
 *   - markdownTableCell (benchmark-helpers)
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { truncateList, markdownTableCell } from '../scripts/lib/benchmark-helpers.mjs';
import {
  globMatch,
  isChangeUnitPath,
  artifactPaths,
  changeUnitPaths,
  goalCoveragePaths,
  decisionIds,
  docSyncTargets,
  evidenceText,
  checkRun,
} from '../scripts/lib/run-helpers.mjs';

// ---------------------------------------------------------------------------
// globMatch
// ---------------------------------------------------------------------------

test('globMatch: exact match without wildcard', () => {
  assert.ok(globMatch('docs/goal.md', 'docs/goal.md'));
  assert.ok(!globMatch('docs/goal.md', 'docs/other.md'));
});

test('globMatch: single wildcard at end', () => {
  assert.ok(globMatch('src/*.ts', 'src/index.ts'));
  assert.ok(!globMatch('src/*.ts', 'lib/index.ts'));
});

test('globMatch: single wildcard at start', () => {
  assert.ok(globMatch('*.md', 'README.md'));
  assert.ok(!globMatch('*.md', 'README.txt'));
});

test('globMatch: wildcard in middle', () => {
  assert.ok(globMatch('docs/*/goal.md', 'docs/features/goal.md'));
  assert.ok(!globMatch('docs/*/goal.md', 'docs/goal.md'));
});

test('globMatch: multiple wildcards', () => {
  assert.ok(globMatch('*/*.ts', 'src/index.ts'));
  assert.ok(!globMatch('*/*.ts', 'src/index.js'));
});

test('globMatch: wildcard matches empty segment', () => {
  // "*" matches zero or more characters
  assert.ok(globMatch('docs/change-units/CU-*.md', 'docs/change-units/CU-.md'));
});

test('globMatch: regex special characters are escaped', () => {
  assert.ok(globMatch('docs/v1.0/goal.md', 'docs/v1.0/goal.md'));
  assert.ok(!globMatch('docs/v1.0/goal.md', 'docs/v1X0/goal.md'));
});

test('globMatch: wildcard matches deeply nested path', () => {
  assert.ok(globMatch('src/**/*.ts', 'src/foo/bar/baz.ts'));
});

// ---------------------------------------------------------------------------
// isChangeUnitPath
// ---------------------------------------------------------------------------

test('isChangeUnitPath: valid CU path', () => {
  assert.ok(isChangeUnitPath('docs/change-units/CU-2025-01-15-add-auth.md'));
});

test('isChangeUnitPath: valid CU path with complex slug', () => {
  assert.ok(isChangeUnitPath('docs/change-units/CU-2025-01-15-refactor_api_layer.md'));
});

test('isChangeUnitPath: rejects non-CU path', () => {
  assert.ok(!isChangeUnitPath('docs/features/auth/goal.md'));
});

test('isChangeUnitPath: rejects CU path without .md extension', () => {
  assert.ok(!isChangeUnitPath('docs/change-units/CU-2025-01-15-add-auth.txt'));
});

test('isChangeUnitPath: rejects path with subdirectory inside CU dir', () => {
  assert.ok(!isChangeUnitPath('docs/change-units/sub/CU-2025-01-15-add-auth.md'));
});

test('isChangeUnitPath: rejects non-string input', () => {
  assert.ok(!isChangeUnitPath(null));
  assert.ok(!isChangeUnitPath(undefined));
  assert.ok(!isChangeUnitPath(42));
});

test('isChangeUnitPath: rejects empty string', () => {
  assert.ok(!isChangeUnitPath(''));
});

// ---------------------------------------------------------------------------
// artifactPaths
// ---------------------------------------------------------------------------

test('artifactPaths: extracts string artifacts', () => {
  const run = { artifacts: ['src/index.ts', 'tests/index.test.ts'] };
  assert.deepEqual(artifactPaths(run), new Set(['src/index.ts', 'tests/index.test.ts']));
});

test('artifactPaths: extracts path from object artifacts', () => {
  const run = { artifacts: [{ path: 'src/index.ts' }, { path: 'src/main.ts' }] };
  assert.deepEqual(artifactPaths(run), new Set(['src/index.ts', 'src/main.ts']));
});

test('artifactPaths: mixed string and object artifacts', () => {
  const run = { artifacts: ['src/a.ts', { path: 'src/b.ts' }] };
  assert.deepEqual(artifactPaths(run), new Set(['src/a.ts', 'src/b.ts']));
});

test('artifactPaths: filters out null/undefined paths', () => {
  const run = { artifacts: ['src/a.ts', null, { path: null }, { path: 'src/b.ts' }] };
  assert.deepEqual(artifactPaths(run), new Set(['src/a.ts', 'src/b.ts']));
});

test('artifactPaths: missing artifacts returns empty set', () => {
  assert.deepEqual(artifactPaths({}), new Set());
  assert.deepEqual(artifactPaths({ artifacts: undefined }), new Set());
  assert.deepEqual(artifactPaths({ artifacts: null }), new Set());
});

test('artifactPaths: empty array returns empty set', () => {
  assert.deepEqual(artifactPaths({ artifacts: [] }), new Set());
});

// ---------------------------------------------------------------------------
// changeUnitPaths
// ---------------------------------------------------------------------------

test('changeUnitPaths: extracts valid CU paths from strings', () => {
  const run = { change_units: ['docs/change-units/CU-2025-01-15-auth.md'] };
  assert.deepEqual(changeUnitPaths(run), new Set(['docs/change-units/CU-2025-01-15-auth.md']));
});

test('changeUnitPaths: extracts valid CU paths from objects', () => {
  const run = { change_units: [{ path: 'docs/change-units/CU-2025-01-15-auth.md' }] };
  assert.deepEqual(changeUnitPaths(run), new Set(['docs/change-units/CU-2025-01-15-auth.md']));
});

test('changeUnitPaths: filters out non-CU paths', () => {
  const run = { change_units: ['docs/change-units/CU-2025-01-15-auth.md', 'docs/features/goal.md'] };
  assert.deepEqual(changeUnitPaths(run), new Set(['docs/change-units/CU-2025-01-15-auth.md']));
});

test('changeUnitPaths: missing change_units returns empty set', () => {
  assert.deepEqual(changeUnitPaths({}), new Set());
  assert.deepEqual(changeUnitPaths({ change_units: null }), new Set());
});

test('changeUnitPaths: filters out null paths from objects', () => {
  const run = { change_units: [{ path: null }, { path: 'docs/change-units/CU-2025-01-15-auth.md' }] };
  assert.deepEqual(changeUnitPaths(run), new Set(['docs/change-units/CU-2025-01-15-auth.md']));
});

// ---------------------------------------------------------------------------
// goalCoveragePaths
// ---------------------------------------------------------------------------

test('goalCoveragePaths: extracts source paths', () => {
  const run = { goal_coverage_entries: [{ source: 'docs/features/auth/goal.md', covers: [] }] };
  assert.deepEqual(goalCoveragePaths(run), new Set(['docs/features/auth/goal.md']));
});

test('goalCoveragePaths: extracts covers paths', () => {
  const run = { goal_coverage_entries: [{ source: 'docs/features/auth/goal.md', covers: ['src/auth.ts', 'tests/auth.test.ts'] }] };
  assert.deepEqual(goalCoveragePaths(run), new Set(['docs/features/auth/goal.md', 'src/auth.ts', 'tests/auth.test.ts']));
});

test('goalCoveragePaths: multiple entries', () => {
  const run = {
    goal_coverage_entries: [
      { source: 'docs/features/a/goal.md', covers: ['src/a.ts'] },
      { source: 'docs/features/b/goal.md', covers: ['src/b.ts'] },
    ],
  };
  assert.deepEqual(goalCoveragePaths(run), new Set(['docs/features/a/goal.md', 'src/a.ts', 'docs/features/b/goal.md', 'src/b.ts']));
});

test('goalCoveragePaths: missing field returns empty set', () => {
  assert.deepEqual(goalCoveragePaths({}), new Set());
  assert.deepEqual(goalCoveragePaths({ goal_coverage_entries: null }), new Set());
  assert.deepEqual(goalCoveragePaths({ goal_coverage_entries: [] }), new Set());
});

test('goalCoveragePaths: entry with missing source still extracts covers', () => {
  const run = { goal_coverage_entries: [{ covers: ['src/a.ts'] }] };
  assert.deepEqual(goalCoveragePaths(run), new Set(['src/a.ts']));
});

// ---------------------------------------------------------------------------
// decisionIds
// ---------------------------------------------------------------------------

test('decisionIds: extracts string decision IDs', () => {
  const run = { decisions: ['FD1', 'FD2'] };
  assert.deepEqual(decisionIds(run), new Set(['FD1', 'FD2']));
});

test('decisionIds: extracts id from object decisions', () => {
  const run = { decisions: [{ id: 'FD1' }, { id: 'FD2' }] };
  assert.deepEqual(decisionIds(run), new Set(['FD1', 'FD2']));
});

test('decisionIds: mixed string and object decisions', () => {
  const run = { decisions: ['FD1', { id: 'FD2' }] };
  assert.deepEqual(decisionIds(run), new Set(['FD1', 'FD2']));
});

test('decisionIds: filters out null/undefined ids', () => {
  const run = { decisions: ['FD1', null, { id: null }, { id: 'FD2' }] };
  assert.deepEqual(decisionIds(run), new Set(['FD1', 'FD2']));
});

test('decisionIds: missing decisions returns empty set', () => {
  assert.deepEqual(decisionIds({}), new Set());
  assert.deepEqual(decisionIds({ decisions: undefined }), new Set());
});

// ---------------------------------------------------------------------------
// docSyncTargets
// ---------------------------------------------------------------------------

test('docSyncTargets: extracts completed targets', () => {
  const run = { goal_verification: [{ target: 'docs/goal.md', status: 'completed' }] };
  assert.deepEqual(docSyncTargets(run), new Set(['docs/goal.md']));
});

test('docSyncTargets: ignores non-completed status', () => {
  const run = { goal_verification: [{ target: 'docs/goal.md', status: 'partial' }] };
  assert.deepEqual(docSyncTargets(run), new Set());
});

test('docSyncTargets: mixed statuses', () => {
  const run = {
    goal_verification: [
      { target: 'docs/goal.md', status: 'completed' },
      { target: 'docs/notes/api.md', status: 'partial' },
      { target: 'docs/PRD.md', status: 'completed' },
    ],
  };
  assert.deepEqual(docSyncTargets(run), new Set(['docs/goal.md', 'docs/PRD.md']));
});

test('docSyncTargets: filters out entries with missing target', () => {
  const run = { goal_verification: [{ status: 'completed' }, { target: 'docs/goal.md', status: 'completed' }] };
  assert.deepEqual(docSyncTargets(run), new Set(['docs/goal.md']));
});

test('docSyncTargets: missing field returns empty set', () => {
  assert.deepEqual(docSyncTargets({}), new Set());
  assert.deepEqual(docSyncTargets({ goal_verification: null }), new Set());
});

// ---------------------------------------------------------------------------
// evidenceText
// ---------------------------------------------------------------------------

test('evidenceText: concatenates evidence array and notes', () => {
  const run = { evidence: ['step 1 passed', 'step 2 passed'], notes: 'all good' };
  assert.equal(evidenceText(run), 'step 1 passed\nstep 2 passed\nall good');
});

test('evidenceText: works with empty evidence', () => {
  const run = { notes: 'only notes' };
  assert.equal(evidenceText(run), 'only notes');
});

test('evidenceText: works with no notes', () => {
  const run = { evidence: ['e1'] };
  assert.equal(evidenceText(run), 'e1\n');
});

test('evidenceText: missing fields produce empty string', () => {
  assert.equal(evidenceText({}), '');
});

// ---------------------------------------------------------------------------
// checkRun — skill_triggered
// ---------------------------------------------------------------------------

test('checkRun: skill_triggered passes when skill present', () => {
  const testCase = { oracle_checks: [{ type: 'skill_triggered', skill: 'forge-codegen' }] };
  const run = { triggered_skills: ['forge-codegen', 'forge-review'] };
  const results = checkRun(testCase, run);
  assert.equal(results.length, 1);
  assert.ok(results[0].passed);
});

test('checkRun: skill_triggered fails when skill absent', () => {
  const testCase = { oracle_checks: [{ type: 'skill_triggered', skill: 'forge-codegen' }] };
  const run = { triggered_skills: ['forge-review'] };
  const results = checkRun(testCase, run);
  assert.ok(!results[0].passed);
});

// ---------------------------------------------------------------------------
// checkRun — artifact_reported
// ---------------------------------------------------------------------------

test('checkRun: artifact_reported with exact path', () => {
  const testCase = { oracle_checks: [{ type: 'artifact_reported', path: 'src/index.ts' }] };
  const run = { artifacts: ['src/index.ts'] };
  const results = checkRun(testCase, run);
  assert.ok(results[0].passed);
});

test('checkRun: artifact_reported with glob pattern', () => {
  const testCase = { oracle_checks: [{ type: 'artifact_reported', path: 'src/*.ts' }] };
  const run = { artifacts: ['src/index.ts'] };
  const results = checkRun(testCase, run);
  assert.ok(results[0].passed);
});

test('checkRun: artifact_reported fails when no artifact matches', () => {
  const testCase = { oracle_checks: [{ type: 'artifact_reported', path: 'src/*.ts' }] };
  const run = { artifacts: ['lib/index.ts'] };
  const results = checkRun(testCase, run);
  assert.ok(!results[0].passed);
});

// ---------------------------------------------------------------------------
// checkRun — change_unit_reported
// ---------------------------------------------------------------------------

test('checkRun: change_unit_reported passes with matching CU path', () => {
  const testCase = { oracle_checks: [{ type: 'change_unit_reported', path: 'docs/change-units/CU-*.md' }] };
  const run = { change_units: ['docs/change-units/CU-2025-01-15-auth.md'] };
  const results = checkRun(testCase, run);
  assert.ok(results[0].passed);
});

test('checkRun: change_unit_reported fails when no CU matches', () => {
  const testCase = { oracle_checks: [{ type: 'change_unit_reported', path: 'docs/change-units/CU-*.md' }] };
  const run = { change_units: ['docs/features/goal.md'] };
  const results = checkRun(testCase, run);
  assert.ok(!results[0].passed);
});

// ---------------------------------------------------------------------------
// checkRun — goal_covers
// ---------------------------------------------------------------------------

test('checkRun: goal_covers passes when coverage path matches', () => {
  const testCase = { oracle_checks: [{ type: 'goal_covers', path: 'src/auth.ts' }] };
  const run = { goal_coverage_entries: [{ source: 'docs/goal.md', covers: ['src/auth.ts'] }] };
  const results = checkRun(testCase, run);
  assert.ok(results[0].passed);
});

test('checkRun: goal_covers matches source path', () => {
  const testCase = { oracle_checks: [{ type: 'goal_covers', path: 'docs/*/goal.md' }] };
  const run = { goal_coverage_entries: [{ source: 'docs/features/goal.md', covers: [] }] };
  const results = checkRun(testCase, run);
  assert.ok(results[0].passed);
});

test('checkRun: goal_covers fails when no match', () => {
  const testCase = { oracle_checks: [{ type: 'goal_covers', path: 'src/auth.ts' }] };
  const run = { goal_coverage_entries: [{ source: 'docs/goal.md', covers: ['src/user.ts'] }] };
  const results = checkRun(testCase, run);
  assert.ok(!results[0].passed);
});

// ---------------------------------------------------------------------------
// checkRun — command_reported
// ---------------------------------------------------------------------------

test('checkRun: command_reported passes when command present', () => {
  const testCase = { oracle_checks: [{ type: 'command_reported', command: 'npm test' }] };
  const run = { commands_run: ['npm test', 'npm run build'] };
  const results = checkRun(testCase, run);
  assert.ok(results[0].passed);
});

test('checkRun: command_reported fails when command absent', () => {
  const testCase = { oracle_checks: [{ type: 'command_reported', command: 'npm test' }] };
  const run = { commands_run: ['npm run build'] };
  const results = checkRun(testCase, run);
  assert.ok(!results[0].passed);
});

// ---------------------------------------------------------------------------
// checkRun — decision_gate_reported
// ---------------------------------------------------------------------------

test('checkRun: decision_gate_reported passes when decision present', () => {
  const testCase = { oracle_checks: [{ type: 'decision_gate_reported', decision: 'FD1' }] };
  const run = { decisions: ['FD1', 'FD2'] };
  const results = checkRun(testCase, run);
  assert.ok(results[0].passed);
});

test('checkRun: decision_gate_reported fails when decision absent', () => {
  const testCase = { oracle_checks: [{ type: 'decision_gate_reported', decision: 'FD1' }] };
  const run = { decisions: ['FD2'] };
  const results = checkRun(testCase, run);
  assert.ok(!results[0].passed);
});

// ---------------------------------------------------------------------------
// checkRun — goal_verified
// ---------------------------------------------------------------------------

test('checkRun: goal_verified passes when target completed', () => {
  const testCase = { oracle_checks: [{ type: 'goal_verified', target: 'docs/goal.md' }] };
  const run = { goal_verification: [{ target: 'docs/goal.md', status: 'completed' }] };
  const results = checkRun(testCase, run);
  assert.ok(results[0].passed);
});

test('checkRun: goal_verified fails when target not completed', () => {
  const testCase = { oracle_checks: [{ type: 'goal_verified', target: 'docs/goal.md' }] };
  const run = { goal_verification: [{ target: 'docs/goal.md', status: 'partial' }] };
  const results = checkRun(testCase, run);
  assert.ok(!results[0].passed);
});

// ---------------------------------------------------------------------------
// checkRun — evidence_contains
// ---------------------------------------------------------------------------

test('checkRun: evidence_contains passes when text in evidence', () => {
  const testCase = { oracle_checks: [{ type: 'evidence_contains', text: 'test passed' }] };
  const run = { evidence: ['all test passed successfully'], notes: '' };
  const results = checkRun(testCase, run);
  assert.ok(results[0].passed);
});

test('checkRun: evidence_contains searches notes as well', () => {
  const testCase = { oracle_checks: [{ type: 'evidence_contains', text: 'see log' }] };
  const run = { evidence: [], notes: 'see log for details' };
  const results = checkRun(testCase, run);
  assert.ok(results[0].passed);
});

test('checkRun: evidence_contains fails when text not found', () => {
  const testCase = { oracle_checks: [{ type: 'evidence_contains', text: 'test passed' }] };
  const run = { evidence: ['build succeeded'], notes: '' };
  const results = checkRun(testCase, run);
  assert.ok(!results[0].passed);
});

// ---------------------------------------------------------------------------
// checkRun — forbidden_behavior_absent
// ---------------------------------------------------------------------------

test('checkRun: forbidden_behavior_absent passes when behavior not present', () => {
  const testCase = { oracle_checks: [{ type: 'forbidden_behavior_absent', behavior: 'skip_tests' }] };
  const run = { forbidden_behaviors: [] };
  const results = checkRun(testCase, run);
  assert.ok(results[0].passed);
});

test('checkRun: forbidden_behavior_absent fails when behavior present', () => {
  const testCase = { oracle_checks: [{ type: 'forbidden_behavior_absent', behavior: 'skip_tests' }] };
  const run = { forbidden_behaviors: ['skip_tests'] };
  const results = checkRun(testCase, run);
  assert.ok(!results[0].passed);
});

// ---------------------------------------------------------------------------
// checkRun — multiple checks at once
// ---------------------------------------------------------------------------

test('checkRun: multiple oracle checks on one run', () => {
  const testCase = {
    oracle_checks: [
      { type: 'skill_triggered', skill: 'forge-codegen' },
      { type: 'artifact_reported', path: 'src/*.ts' },
      { type: 'command_reported', command: 'npm test' },
      { type: 'forbidden_behavior_absent', behavior: 'skip_tests' },
    ],
  };
  const run = {
    triggered_skills: ['forge-codegen'],
    artifacts: ['src/index.ts'],
    commands_run: ['npm test'],
    forbidden_behaviors: [],
  };
  const results = checkRun(testCase, run);
  assert.equal(results.length, 4);
  assert.ok(results[0].passed);
  assert.ok(results[1].passed);
  assert.ok(results[2].passed);
  assert.ok(results[3].passed);
});

test('checkRun: returns check object alongside passed flag', () => {
  const check = { type: 'skill_triggered', skill: 'forge-codegen' };
  const testCase = { oracle_checks: [check] };
  const run = { triggered_skills: ['forge-codegen'] };
  const results = checkRun(testCase, run);
  assert.equal(results.length, 1);
  assert.ok(results[0].passed);
  assert.deepEqual(results[0].check, check);
});

// ---------------------------------------------------------------------------
// truncateList
// ---------------------------------------------------------------------------

test('truncateList: returns dash for null', () => {
  assert.equal(truncateList(null), '-');
});

test('truncateList: returns dash for undefined', () => {
  assert.equal(truncateList(undefined), '-');
});

test('truncateList: returns dash for empty array', () => {
  assert.equal(truncateList([]), '-');
});

test('truncateList: lists items within limit', () => {
  assert.equal(truncateList(['a', 'b', 'c']), 'a, b, c');
});

test('truncateList: truncates with default limit 4', () => {
  assert.equal(truncateList(['a', 'b', 'c', 'd', 'e']), 'a, b, c, d, +1 more');
});

test('truncateList: respects custom limit', () => {
  assert.equal(truncateList(['a', 'b', 'c'], 2), 'a, b, +1 more');
});

test('truncateList: exactly at limit shows no suffix', () => {
  assert.equal(truncateList(['a', 'b', 'c', 'd'], 4), 'a, b, c, d');
});

test('truncateList: limit of 1', () => {
  assert.equal(truncateList(['a', 'b'], 1), 'a, +1 more');
});

test('truncateList: many items over limit', () => {
  assert.equal(truncateList(['a', 'b', 'c', 'd', 'e', 'f'], 2), 'a, b, +4 more');
});

// ---------------------------------------------------------------------------
// markdownTableCell
// ---------------------------------------------------------------------------

test('markdownTableCell: passes through normal string', () => {
  assert.equal(markdownTableCell('hello'), 'hello');
});

test('markdownTableCell: escapes pipe character', () => {
  assert.equal(markdownTableCell('a|b'), 'a\\|b');
});

test('markdownTableCell: replaces newline with br', () => {
  assert.equal(markdownTableCell('line1\nline2'), 'line1<br>line2');
});

test('markdownTableCell: handles both pipes and newlines', () => {
  assert.equal(markdownTableCell('a|b\nc|d'), 'a\\|b<br>c\\|d');
});

test('markdownTableCell: converts number to string', () => {
  assert.equal(markdownTableCell(42), '42');
});

test('markdownTableCell: handles empty string', () => {
  assert.equal(markdownTableCell(''), '');
});

test('markdownTableCell: multiple pipes', () => {
  assert.equal(markdownTableCell('a|b|c'), 'a\\|b\\|c');
});

test('markdownTableCell: multiple newlines', () => {
  assert.equal(markdownTableCell('a\nb\nc'), 'a<br>b<br>c');
});

test('markdownTableCell: boolean coerced to string', () => {
  assert.equal(markdownTableCell(true), 'true');
});
