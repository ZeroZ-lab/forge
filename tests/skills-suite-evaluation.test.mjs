import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadBenchmarkContract } from '../scripts/lib/benchmark-contract.mjs';
import { loadRegistry } from '../scripts/lib/registry.mjs';

const root = path.resolve(import.meta.dirname, '..');
const registry = loadRegistry(root);
const { manifest } = loadBenchmarkContract(root, registry);

function reportEvidenceFor(testCase) {
  const commands = new Set();
  const decisions = new Set();
  const changeUnits = new Set();
  const docSync = new Set();
  const goalCoverageEntries = [];
  const evidence = new Set(testCase.required_evidence);
  const sourceDoc =
    testCase.expected_artifacts.find((artifact) => artifact.startsWith('docs/') && artifact !== 'docs/goal.md') ??
    'docs/synthetic-source.md';

  for (const check of testCase.oracle_checks) {
    if (check.type === 'command_reported') commands.add(check.command);
    if (check.type === 'decision_gate_reported') decisions.add(check.decision);
    if (check.type === 'change_unit_reported') changeUnits.add(check.path.replace('*', 'synthetic'));
    if (check.type === 'goal_verified') docSync.add(check.target);
    if (check.type === 'goal_covers') {
      goalCoverageEntries.push({ source: check.path.startsWith('docs/') ? check.path : sourceDoc, covers: [check.path] });
    }
    if (check.type === 'evidence_contains') evidence.add(check.text);
  }

  return {
    change_units: [...changeUnits],
    goal_verification: [...docSync].map((target) => ({ target, status: 'completed' })),
    goal_coverage_entries: goalCoverageEntries,
    commands_run: [...commands],
    decisions: [...decisions],
    evidence: [...evidence],
  };
}

test('skills-suite includes a default-chain small feature value scenario', () => {
  const testCase = manifest.cases.find((candidate) => candidate.id === 'default-chain-small-feature');

  assert.ok(testCase, 'default-chain-small-feature case is required');
  assert.deepEqual(testCase.expected_skills, ['detail', 'codegen', 'review']);
  assert.equal(testCase.fixture, 'evals/skills-suite/fixtures/default-chain-small-feature.md');
  assert.ok(testCase.expected_artifacts.includes('docs/features/task-archive/goal.md'));
  assert.ok(testCase.expected_artifacts.includes('src/'));
  assert.ok(testCase.expected_artifacts.includes('tests/'));
  assert.ok(
    testCase.oracle_checks.some((check) => check.type === 'command_reported' && check.command === 'node --test'),
  );
  assert.ok(
    testCase.oracle_checks.some((check) => check.type === 'artifact_absent' && check.path === 'docs/project.md'),
  );
  assert.ok(
    testCase.oracle_checks.some(
      (check) => check.type === 'evidence_contains' && check.text === 'detail -> codegen -> review',
    ),
  );
});

test('skills-suite covers all bugfix feedback-loop failure modes', () => {
  const expectedCases = [
    'bugfix-regression-change-unit',
    'bugfix-flaky-reproduction-rate',
    'bugfix-unreproducible-blocked',
    'bugfix-correct-test-seam',
  ];

  for (const caseId of expectedCases) {
    const testCase = manifest.cases.find((candidate) => candidate.id === caseId);
    assert.ok(testCase, `${caseId} case is required`);
    assert.ok(testCase.expected_skills.includes('codegen'));
    assert.ok(
      testCase.oracle_checks.some(
        (check) =>
          check.type === 'evidence_contains' &&
          ['red-capable', 'red-capable command unavailable'].includes(check.text),
      ),
      `${caseId} must prove a red-capable loop or its explicit absence`,
    );
  }
});

test('guide benchmark is advisory and non-mutating', () => {
  const testCase = manifest.cases.find((candidate) => candidate.id === 'guide-shortest-chain');

  assert.ok(testCase, 'guide-shortest-chain case is required');
  assert.deepEqual(testCase.expected_skills, ['guide']);
  assert.deepEqual(testCase.expected_artifacts, []);
  assert.ok(
    testCase.oracle_checks.some(
      (check) => check.type === 'artifact_absent' && check.path === 'docs/change-units/CU-*.md',
    ),
  );
  assert.ok(
    !testCase.oracle_checks.some((check) => check.type === 'change_unit_reported'),
    'advisory guide must not require a Change Unit',
  );
});

test('guide routing matrix covers project, bugfix, and cross-module paths', () => {
  const testCase = manifest.cases.find((candidate) => candidate.id === 'guide-routing-matrix');

  assert.ok(testCase, 'guide-routing-matrix case is required');
  for (const text of [
    'L3',
    'init',
    'bugfix protocol',
    'L2',
    'detail(stage) -> plan(stage) -> codegen(stage) -> review(stage)',
  ]) {
    assert.ok(
      testCase.oracle_checks.some(
        (check) => check.type === 'evidence_contains' && check.text === text,
      ),
      `guide-routing-matrix must require ${text}`,
    );
  }
});

test('skills-suite evaluator runs without external dependencies', () => {
  const output = execFileSync(process.execPath, ['scripts/evaluate-skills.mjs'], { encoding: 'utf8' });

  assert.match(output, /benchmark contract passed/);
  assert.match(output, /behavioral effectiveness is not claimed/);
});

test('token footprint metric enforces the default runtime chain budget', () => {
  const output = execFileSync(
    process.execPath,
    ['scripts/measure-char-footprint.mjs', '--max-default-chain-chars=9000', '--max-total-chars=56000'],
    { encoding: 'utf8' },
  );
  const json = JSON.parse(
    execFileSync(process.execPath, ['scripts/measure-char-footprint.mjs', '--json'], { encoding: 'utf8' }),
  );

  assert.match(output, /Default chain \(detail -> codegen -> review\)/);
  assert.ok(json.default_chain_total.chars <= 9000);
  assert.ok(json.total.chars <= 56000);
  assert.deepEqual(json.default_chain, ['detail', 'codegen', 'review']);
});

test('skills-suite evaluator verifies change units on disk with --verify-disk', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-verify-disk-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'default-chain-small-feature');
  const baseRun = (cuPath) => ({
    case_id: testCase.id,
    status: 'pass',
    triggered_skills: testCase.expected_skills,
    artifacts: testCase.expected_artifacts,
    ...reportEvidenceFor(testCase),
    change_units: [cuPath],
    forbidden_behaviors: [],
  });

  // rejects a change unit that is reported but not on disk
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      { version: 2, suite: 'forge', run_id: 'verify-disk-missing', cases: [baseRun('docs/change-units/CU-does-not-exist-99999.md')] },
      null,
      2,
    ),
  );
  const missing = spawnSync(
    process.execPath,
    ['scripts/evaluate-skills.mjs', '--allow-partial', '--verify-disk', '--report', reportPath],
    { encoding: 'utf8' },
  );
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /change unit not found on disk/);

  // accepts a change unit that actually exists on disk
  const realCu = fs.readdirSync(path.join(root, 'docs/change-units')).find((file) => file.endsWith('.md'));
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      { version: 2, suite: 'forge', run_id: 'verify-disk-present', cases: [baseRun(`docs/change-units/${realCu}`)] },
      null,
      2,
    ),
  );
  const present = spawnSync(
    process.execPath,
    ['scripts/evaluate-skills.mjs', '--allow-partial', '--verify-disk', '--report', reportPath],
    { encoding: 'utf8' },
  );
  assert.equal(present.status, 0);
  assert.match(present.stdout, /on-disk verified/);

  fs.unlinkSync(reportPath);
});

test('skills-suite evaluator scores a complete report', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-report-${process.pid}.json`);
  const cases = manifest.cases.map((testCase) => {
    return {
      case_id: testCase.id,
      status: 'pass',
      triggered_skills: testCase.expected_skills,
      artifacts: testCase.expected_artifacts,
      ...reportEvidenceFor(testCase),
      forbidden_behaviors: [],
      notes: 'synthetic evaluator smoke report; not behavior evidence',
    };
  });

  fs.writeFileSync(
    reportPath,
    JSON.stringify({ version: 2, suite: 'forge', run_id: 'synthetic-smoke', cases }, null, 2),
  );

  const output = execFileSync(process.execPath, ['scripts/evaluate-skills.mjs', '--report', reportPath], {
    encoding: 'utf8',
  });

  assert.match(output, /report passed/);
  assert.match(output, /Score: 100\/100 \(A\)/);
  fs.unlinkSync(reportPath);
});

test('skills-suite evaluator writes a machine-readable score report', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-score-source-${process.pid}.json`);
  const scorePath = path.join(os.tmpdir(), `forge-skills-score-output-${process.pid}.json`);
  const cases = manifest.cases.map((testCase) => {
    return {
      case_id: testCase.id,
      status: 'pass',
      triggered_skills: testCase.expected_skills,
      artifacts: testCase.expected_artifacts,
      ...reportEvidenceFor(testCase),
      forbidden_behaviors: [],
      metrics: {
        user_interventions: 0,
        turns: 4,
        changed_files: 4,
      },
      notes: 'synthetic evaluator score report; not behavior evidence',
    };
  });

  fs.writeFileSync(
    reportPath,
    JSON.stringify({ version: 2, suite: 'forge', run_id: 'synthetic-score', cases }, null, 2),
  );

  const output = execFileSync(
    process.execPath,
    ['scripts/evaluate-skills.mjs', '--report', reportPath, '--score-out', scorePath],
    { encoding: 'utf8' },
  );
  const score = JSON.parse(fs.readFileSync(scorePath, 'utf8'));

  assert.match(output, /Score report written/);
  assert.equal(score.score, 100);
  assert.equal(score.grade, 'A');
  assert.equal(score.axes.goal_verification, 100);
  assert.equal(score.cases.length, manifest.cases.length);
  fs.unlinkSync(reportPath);
  fs.unlinkSync(scorePath);
});

test('skills-suite evaluator supports partial reports and artifact globs', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-partial-report-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'thinking-red-team');
  const report = {
    version: 2,
    suite: 'forge',
    run_id: 'partial-smoke',
    cases: [
      {
        case_id: testCase.id,
        status: 'pass',
        triggered_skills: testCase.expected_skills,
        artifacts: [...testCase.expected_artifacts, 'docs/thinking/2026-05-31-tagging-red-team.md'],
        ...reportEvidenceFor(testCase),
        forbidden_behaviors: [],
      },
    ],
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const output = execFileSync(
    process.execPath,
    ['scripts/evaluate-skills.mjs', '--allow-partial', '--report', reportPath],
    { encoding: 'utf8' },
  );

  assert.match(output, /1 cases/);
  assert.match(output, new RegExp(`${testCase.oracle_checks.length}/${testCase.oracle_checks.length} oracle checks`));
  fs.unlinkSync(reportPath);
});

test('skills-suite evaluator can skip externally blocked cases', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-blocked-report-${process.pid}.json`);
  const passedCase = manifest.cases[0];
  const blockedCase = manifest.cases.find((candidate) => candidate.id === 'codegen-implementation');

  const report = {
    version: 2,
    suite: 'forge',
    run_id: 'blocked-smoke',
    cases: [
      {
        case_id: passedCase.id,
        status: 'pass',
        triggered_skills: passedCase.expected_skills,
        artifacts: passedCase.expected_artifacts,
        ...reportEvidenceFor(passedCase),
        forbidden_behaviors: [],
      },
      {
        case_id: blockedCase.id,
        status: 'blocked',
        triggered_skills: [],
        artifacts: [],
        change_units: [],
        goal_verification: [],
        goal_coverage_entries: [],
        commands_run: [],
        decisions: [],
        forbidden_behaviors: [],
        evidence: ['usage limit'],
      },
    ],
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const output = execFileSync(
    process.execPath,
    ['scripts/evaluate-skills.mjs', '--allow-partial', '--skip-blocked', '--report', reportPath],
    { encoding: 'utf8' },
  );

  assert.match(output, /blocked skipped/);
  fs.unlinkSync(reportPath);
});

test('skills-suite evaluator rejects current docs without a Change Unit', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-missing-cu-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'project-bootstrap');
  const report = {
    version: 2,
    suite: 'forge',
    run_id: 'missing-cu-smoke',
    cases: [
      {
        case_id: testCase.id,
        status: 'pass',
        triggered_skills: testCase.expected_skills,
        artifacts: testCase.expected_artifacts,
        ...reportEvidenceFor(testCase),
        change_units: [],
        forbidden_behaviors: [],
      },
    ],
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const result = spawnSync(process.execPath, ['scripts/evaluate-skills.mjs', '--allow-partial', '--report', reportPath], {
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /current\/rebuild docs changed without a Change Unit|change_unit_reported/);
  fs.unlinkSync(reportPath);
});

test('skills-suite evaluator rejects missing goal_map coverage', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-missing-code-map-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'codegen-implementation');
  const report = {
    version: 2,
    suite: 'forge',
    run_id: 'missing-code-map-smoke',
    cases: [
      {
        case_id: testCase.id,
        status: 'pass',
        triggered_skills: testCase.expected_skills,
        artifacts: testCase.expected_artifacts,
        ...reportEvidenceFor(testCase),
        goal_coverage_entries: [],
        forbidden_behaviors: [],
      },
    ],
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const result = spawnSync(process.execPath, ['scripts/evaluate-skills.mjs', '--allow-partial', '--report', reportPath], {
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /goal_covers/);
  fs.unlinkSync(reportPath);
});

test('skills-suite evaluator rejects missing expected artifacts', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-missing-artifact-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'ambiguous-idea-alignment');
  const report = {
    version: 2,
    suite: 'forge',
    run_id: 'missing-artifact-smoke',
    cases: [
      {
        case_id: testCase.id,
        status: 'pass',
        triggered_skills: testCase.expected_skills,
        artifacts: ['goal.md'],
        ...reportEvidenceFor(testCase),
        change_units: ['docs/change-units/CU-synthetic.md'],
        forbidden_behaviors: [],
      },
    ],
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const result = spawnSync(process.execPath, ['scripts/evaluate-skills.mjs', '--allow-partial', '--report', reportPath], {
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected artifact not reported docs\/project.md/);
  fs.unlinkSync(reportPath);
});

test('skills-suite evaluator rejects string goal_map entries', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-string-code-map-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'codegen-implementation');
  const report = {
    version: 2,
    suite: 'forge',
    run_id: 'string-code-map-smoke',
    cases: [
      {
        case_id: testCase.id,
        status: 'pass',
        triggered_skills: testCase.expected_skills,
        artifacts: testCase.expected_artifacts,
        ...reportEvidenceFor(testCase),
        goal_coverage_entries: ['src/'],
        forbidden_behaviors: [],
      },
    ],
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const result = spawnSync(process.execPath, ['scripts/evaluate-skills.mjs', '--allow-partial', '--report', reportPath], {
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /goal_coverage_entries must be/);
  fs.unlinkSync(reportPath);
});

test('skills-suite evaluator rejects string goal verification entries', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-string-doc-sync-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'ambiguous-idea-alignment');
  const report = {
    version: 2,
    suite: 'forge',
    run_id: 'string-doc-sync-smoke',
    cases: [
      {
        case_id: testCase.id,
        status: 'pass',
        triggered_skills: testCase.expected_skills,
        artifacts: testCase.expected_artifacts,
        ...reportEvidenceFor(testCase),
        goal_verification: ['docs/goal.md'],
        forbidden_behaviors: [],
      },
    ],
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const result = spawnSync(process.execPath, ['scripts/evaluate-skills.mjs', '--allow-partial', '--report', reportPath], {
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /goal_verification must be/);
  fs.unlinkSync(reportPath);
});

test('skills-suite evaluator rejects non-CU paths in change_units', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-invalid-change-unit-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'ambiguous-idea-alignment');
  const report = {
    version: 2,
    suite: 'forge',
    run_id: 'invalid-change-unit-smoke',
    cases: [
      {
        case_id: testCase.id,
        status: 'pass',
        triggered_skills: testCase.expected_skills,
        artifacts: ['docs/project.md'],
        ...reportEvidenceFor(testCase),
        change_units: ['docs/project.md', 'docs/goal.md', 'docs/change-units/CU-synthetic.md'],
        forbidden_behaviors: [],
      },
    ],
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const result = spawnSync(process.execPath, ['scripts/evaluate-skills.mjs', '--allow-partial', '--report', reportPath], {
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /change_units must point to docs\/change-units\/CU-\*\.md/);
  fs.unlinkSync(reportPath);
});

test('skills-suite evaluator rejects invalid runtime metrics', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-invalid-metrics-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'thinking-red-team');
  const report = {
    version: 2,
    suite: 'forge',
    run_id: 'invalid-metrics-smoke',
    cases: [
      {
        case_id: testCase.id,
        status: 'pass',
        triggered_skills: testCase.expected_skills,
        artifacts: testCase.expected_artifacts,
        ...reportEvidenceFor(testCase),
        forbidden_behaviors: [],
        metrics: {
          user_interventions: -1,
        },
      },
    ],
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const result = spawnSync(process.execPath, ['scripts/evaluate-skills.mjs', '--allow-partial', '--report', reportPath], {
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /metrics must contain only non-negative numeric runtime metrics/);
  fs.unlinkSync(reportPath);
});
