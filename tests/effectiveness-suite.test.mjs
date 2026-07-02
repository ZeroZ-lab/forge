import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadEffectivenessContract } from '../scripts/lib/effectiveness-contract.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { manifest, coveredScenarios } = loadEffectivenessContract(root);

test('effectiveness suite contract covers the five held-out scenarios', () => {
  assert.equal(manifest.name, 'forge-effectiveness-suite');
  assert.equal(manifest.cases.length, manifest.minimum_cases);
  assert.equal(manifest.required_repeats, 2);
  assert.deepEqual([...coveredScenarios].sort(), [
    'bugfix',
    'delegation',
    'frontend-buy-vs-build',
    'learn-boundary',
    'small-feature',
  ]);
});

test('effectiveness suite is positioned separately from compliance suite', () => {
  const readme = fs.readFileSync(path.join(root, 'evals', 'effectiveness-suite', 'README.md'), 'utf8');
  assert.match(readme, /separate from `evals\/skills-suite`/);
  assert.match(readme, /does not claim real-world effectiveness/);
  assert.match(readme, /at least two repeats/i);
});

test('effectiveness fixtures stay answer-free and review-oriented', () => {
  for (const testCase of manifest.cases) {
    const fixture = fs.readFileSync(path.join(root, testCase.fixture), 'utf8');
    assert.doesNotMatch(fixture, /oracle|score|expected_skills|triggered_skills/i, `${testCase.id} must not leak scoring internals`);
    assert.match(fixture, /Review focus:/, `${testCase.id} should include human review focus`);
  }
});
