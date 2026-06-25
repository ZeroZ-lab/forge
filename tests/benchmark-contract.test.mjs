import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadBenchmarkContract } from '../scripts/lib/benchmark-contract.mjs';
import { loadRegistry } from '../scripts/lib/registry.mjs';

const root = path.resolve(import.meta.dirname, '..');

function validCase(id) {
  return {
    id,
    title: id,
    fixture: `evals/skills-suite/fixtures/${id}.md`,
    expected_skills: ['codegen'],
    expected_artifacts: [],
    required_evidence: [],
    forbidden_behaviors: [],
    oracle_checks: [{ type: 'skill_triggered', skill: 'codegen' }],
  };
}

function writeContractRoot(mutator) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-contract-'));
  const evalDir = path.join(tempRoot, 'evals', 'skills-suite');
  const fixtureDir = path.join(evalDir, 'fixtures');
  fs.mkdirSync(fixtureDir, { recursive: true });
  const cases = Array.from({ length: 10 }, (_, index) => validCase(`case-${index}`));
  for (const testCase of cases) fs.writeFileSync(path.join(tempRoot, testCase.fixture), '# fixture\n');
  const manifest = {
    version: 2,
    name: 'forge-skills-suite-benchmark',
    minimum_cases: 10,
    report_schema: 'evals/skills-suite/report.schema.json',
    scoring_model: {
      version: 1,
      grade_thresholds: { A: 90, F: 0 },
      axes: [{ id: 'routing', label: 'Routing', weight: 1 }],
    },
    cases,
  };
  mutator?.(manifest);
  fs.writeFileSync(path.join(evalDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(evalDir, 'report.schema.json'), '{}\n');
  return tempRoot;
}

test('loadBenchmarkContract is the shared manifest validation interface', () => {
  const registry = loadRegistry(root);
  const { manifest, coveredSkills } = loadBenchmarkContract(root, registry);

  assert.equal(manifest.cases.length, manifest.minimum_cases);
  assert.deepEqual(
    [...coveredSkills].sort(),
    registry.skills.map((skill) => skill.name).sort(),
  );
});

test('loadBenchmarkContract reports fixture and oracle contract errors together', () => {
  const tempRoot = writeContractRoot((manifest) => {
    manifest.cases[0].fixture = 'missing.md';
    manifest.cases[1].oracle_checks = [{ type: 'unknown_check' }];
  });

  assert.throws(
    () => loadBenchmarkContract(tempRoot, { skills: [{ name: 'codegen' }] }),
    (error) => {
      assert.ok(error.issues.some((issue) => issue.includes('fixture is missing')));
      assert.ok(error.issues.some((issue) => issue.includes('unknown oracle check type')));
      return true;
    },
  );
  fs.rmSync(tempRoot, { recursive: true, force: true });
});
