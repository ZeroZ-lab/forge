import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadBenchmarkContract } from '../scripts/lib/benchmark-contract.mjs';
import { loadRegistry } from '../scripts/lib/registry.mjs';

const root = path.resolve(import.meta.dirname, '..');
const registry = loadRegistry(root);
const { manifest } = loadBenchmarkContract(root, registry);

const suiteReadmePath = path.join(root, 'evals', 'skills-suite', 'README.md');
const suiteReadme = fs.readFileSync(suiteReadmePath, 'utf8');

// Derive per-level counts from the manifest by tallying each case.level.
// Nothing is hardcoded — the levels and counts come straight from the contract.
function levelCountsFromManifest() {
  const counts = {};
  for (const testCase of manifest.cases) {
    const level = testCase.level;
    counts[level] = (counts[level] ?? 0) + 1;
  }
  return counts;
}

// Derive the README's stated per-level distribution by parsing the
// "<N> cases (<level> <n> / <level> <n> ...)" phrase. The level order is not
// assumed; the parsed map is compared against the manifest-derived map, so a
// per-level reshuffle that keeps the same total still fails this test.
function levelCountsFromReadme() {
  const block = suiteReadme.match(/(\d+)\s+cases\s*\(([^)]+)\)/);
  assert.ok(block, 'evals/skills-suite/README.md must state "<N> cases (<level distribution>)"');
  const counts = {};
  for (const match of block[2].matchAll(/([a-z]+)\s+(\d+)/gi)) {
    counts[match[1].toLowerCase()] = Number(match[2]);
  }
  return { counts, total: Number(block[1]) };
}

test('eval-suite README per-level distribution matches the manifest (derived, not hardcoded)', () => {
  const fromManifest = levelCountsFromManifest();
  const { counts: fromReadme, total: readmeTotal } = levelCountsFromReadme();

  // The set of levels must agree — no missing or extra level on either side.
  assert.deepEqual(
    Object.keys(fromManifest).sort(),
    Object.keys(fromReadme).sort(),
    'README and manifest must enumerate the same set of levels',
  );

  // Each level's count must agree — a per-level reshuffle (same total) must fail.
  for (const level of Object.keys(fromManifest).sort()) {
    assert.equal(
      fromManifest[level],
      fromReadme[level],
      `level "${level}": manifest has ${fromManifest[level]} but README states ${fromReadme[level]}`,
    );
  }

  // Total must be internally consistent: sum of per-level counts == cases.length
  // == minimum_cases, and the README's stated total must equal the manifest total.
  const manifestTotal = manifest.cases.length;
  const sumFromLevels = Object.values(fromManifest).reduce((sum, value) => sum + value, 0);
  assert.equal(sumFromLevels, manifestTotal, 'sum of per-level counts must equal manifest.cases.length');
  assert.equal(manifestTotal, manifest.minimum_cases, 'manifest.cases.length must equal minimum_cases');
  assert.equal(readmeTotal, manifestTotal, 'README stated total must equal manifest.cases.length');
});

test('eval-suite README discloses the 3 skip-frontend cases that share one dimension', () => {
  const skipFrontendIds = ['init-skip-frontend', 'detail-backend-only', 'design-skip-no-frontend'];

  // The README must name all three overlapping cases.
  for (const id of skipFrontendIds) {
    assert.ok(
      suiteReadme.includes(id),
      `evals/skills-suite/README.md must disclose the skip-frontend case ${id}`,
    );
  }

  // Each named case must exist in the manifest and actually gate a frontend /
  // interaction / fe-system skill (a forbidden_behavior_absent check on that
  // axis), proving they share the skip-frontend dimension rather than being
  // independent cases.
  for (const id of skipFrontendIds) {
    const testCase = manifest.cases.find((candidate) => candidate.id === id);
    assert.ok(testCase, `${id} must exist in the manifest`);
    const gatesFrontend = (testCase.oracle_checks ?? []).some(
      (check) =>
        check.type === 'forbidden_behavior_absent' &&
        /frontend|fe-system|interaction/i.test(check.behavior ?? ''),
    );
    assert.ok(
      gatesFrontend,
      `${id} must forbid a frontend/interaction/fe-system behavior to share the skip-frontend dimension`,
    );
  }

  // The README must explicitly retract non-independence for these cases.
  assert.match(suiteReadme, /not independent/i);
});

test('eval-suite manifest description does not overclaim "non-redundant"', () => {
  // The canonical contract description is read by loadBenchmarkContract. It
  // must not claim the suite is a set of non-redundant chains: only 3/21 are
  // chain-level and 3 skip-frontend cases share one dimension. It must state
  // the real level mix and disclose the overlap instead.
  const description = manifest.description ?? '';
  assert.doesNotMatch(description, /non-redundant/i, 'manifest description must not claim non-redundant chains');
  assert.match(description, /stage\/patch\/lens\/analysis/i, 'manifest description must state the real level mix');
  assert.match(description, /skip-frontend/i, 'manifest description must disclose the skip-frontend overlap');
});

// M2 docs-honesty guard: every doc that makes a 2.0x comparison-gate claim
// must carry the "n=1, not suite-level" caveat (the 2.0x threshold is currently
// calibrated from 2 selected n=1 cases, not a suite-level result), and the
// "100% uplift" marketing packaging must be gone. A future edit that drops the
// caveat or revives the packaging fails here.
const GATE_CLAIM_RE = /2\.0x|\d+x baseline|score[- ]ratio|uplift gate|comparison gate|比较门/i;
const HONESTY_DOCS = [
  ['README.md', path.join(root, 'README.md')],
  ['docs/skill-suite-evaluation.md', path.join(root, 'docs', 'skill-suite-evaluation.md')],
  ['evals/skills-suite/README.md', suiteReadmePath],
];

for (const [label, filePath] of HONESTY_DOCS) {
  test(`${label}: 2.0x comparison-gate claim carries the n=1 not-suite-level caveat`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.doesNotMatch(
      content,
      /100% uplift/i,
      `${label} must not use the "100% uplift" marketing packaging`,
    );
    if (GATE_CLAIM_RE.test(content)) {
      assert.match(
        content,
        /n=1/,
        `${label} mentions the 2.0x comparison gate but lacks the n=1 not-suite-level caveat`,
      );
    }
  });
}
