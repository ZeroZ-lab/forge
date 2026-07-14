import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadEffectivenessContract } from '../scripts/lib/effectiveness-contract.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { manifest, kernelContract, coveredScenarios } = loadEffectivenessContract(root);

function withMutatedContract(mutate, check) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-effectiveness-contract-'));
  const source = path.join(root, 'evals', 'effectiveness-suite');
  const target = path.join(fixtureRoot, 'evals', 'effectiveness-suite');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
  const manifestPath = path.join(target, 'manifest.json');
  const fixtureManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  mutate(fixtureManifest);
  fs.writeFileSync(manifestPath, `${JSON.stringify(fixtureManifest, null, 2)}\n`);
  try {
    check(fixtureRoot);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

test('effectiveness suite contract covers the six held-out scenarios', () => {
  assert.equal(manifest.version, 2);
  assert.equal(manifest.name, 'forge-effectiveness-suite');
  assert.equal(manifest.cases.length, manifest.minimum_cases);
  assert.equal(manifest.required_repeats, 2);
  assert.deepEqual([...coveredScenarios].sort(), [
    'bugfix',
    'delegation',
    'direct-action',
    'frontend-buy-vs-build',
    'learn-boundary',
    'small-feature',
  ]);
});

test('kernel contract constrains state and evidence without choosing the model action path', () => {
  assert.equal(kernelContract.version, 1);
  assert.deepEqual(kernelContract.kernel_owns, [
    'objective',
    'permissions',
    'scope',
    'authoritative_facts',
    'evidence',
    'task_state',
    'completion_conditions',
  ]);
  assert.deepEqual(kernelContract.kernel_must_not_control, [
    'lifecycle_stage',
    'skill_selection',
    'implementation_strategy',
    'model_internal_reasoning',
  ]);
  assert.deepEqual(kernelContract.legal_action_paths, [
    'direct_action',
    'optional_skill',
    'skip_skill',
    'reject_irrelevant_capability',
  ]);
  assert.deepEqual(kernelContract.success_basis, [
    'verified_outcome',
    'safety',
    'valid_evidence',
  ]);
  assert.deepEqual(kernelContract.forbidden_success_proxies, [
    'fixed_skill_hit_rate',
    'fixed_stage_completion',
    'model_name_capability_order',
  ]);
  assert.deepEqual(kernelContract.non_interference, {
    comparison_unit: 'paired_same_model',
    arms: ['forge', 'no-forge'],
    controlled_dimensions: ['model', 'fixture', 'workspace_revision', 'budget', 'verifier'],
    model_capability_ordering: 'none',
    judged_by: ['verified_outcome', 'safety', 'valid_evidence'],
  });
});

test('effectiveness contract rejects structured fixed skill and stage routing proxies', () => {
  for (const mutate of [
    (contract) => { contract.cases[0].required_skills = ['codegen']; },
    (contract) => { contract.cases[0].required_stages = ['detail']; },
    (contract) => { contract.cases[0].skill_hit_rate = 1; },
    (contract) => { contract.cases[0].oracle_checks = [{ type: 'skill_triggered', skill: 'codegen' }]; },
  ]) {
    withMutatedContract(mutate, (fixtureRoot) => {
      assert.throws(
        () => loadEffectivenessContract(fixtureRoot),
        (error) => error.issues?.some((issue) => /path-dependent.*(?:success|result) condition/.test(issue)),
      );
    });
  }
});

test('kernel contract rejects action control and model-name capability ordering', () => {
  for (const mutate of [
    (contract) => { contract.version = 1; },
    (contract) => { contract.metrics.push('fixed_skill_hit_rate'); },
    (contract) => { contract.scoring_model = { success: 'codegen hit' }; },
    (contract) => { contract.kernel_contract.required_skill = 'codegen'; },
    (contract) => { contract.kernel_contract.non_interference.required_skill = 'codegen'; },
    (contract) => contract.kernel_contract.legal_action_paths.splice(0, 1),
    (contract) => { contract.kernel_contract.kernel_must_not_control = []; },
    (contract) => { contract.kernel_contract.non_interference.model_capability_ordering = 'by-name'; },
  ]) {
    withMutatedContract(mutate, (fixtureRoot) => {
      assert.throws(
        () => loadEffectivenessContract(fixtureRoot),
        (error) => error.issues?.some((issue) => /manifest\.version|manifest\.metrics|unsupported field|kernel_contract/.test(issue)),
      );
    });
  }
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

  const directCase = manifest.cases.find((testCase) => testCase.scenario === 'direct-action');
  const directFixture = fs.readFileSync(path.join(root, directCase.fixture), 'utf8');
  assert.doesNotMatch(
    directFixture,
    /\b(?:expected_skills|triggered_skills|forge:[a-z0-9-]+|Skill hit rate)\b/i,
  );
});
