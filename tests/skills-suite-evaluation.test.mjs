import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadBenchmarkContract } from '../scripts/lib/benchmark-contract.mjs';
import { loadRegistry } from '../scripts/lib/registry.mjs';
import { inspectRunReport } from '../scripts/lib/run-report.mjs';

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
    if (check.type === 'evidence_contains' || check.type === 'transcript_contains') evidence.add(check.text);
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
      (check) => check.type === 'transcript_contains' && check.text === 'detail -> codegen -> review',
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
          check.type === 'transcript_contains' &&
          ['red-capable', 'red-capable command unavailable'].includes(check.text),
      ),
      `${caseId} must prove a red-capable loop or its explicit absence`,
    );
  }
});

test('unreproducible bugfix case measures safe stop without goal-doc progress theater', () => {
  const testCase = manifest.cases.find((candidate) => candidate.id === 'bugfix-unreproducible-blocked');
  const checks = testCase.oracle_checks;

  assert.deepEqual(testCase.expected_artifacts, ['docs/change-units/CU-*.md']);
  assert.ok(checks.some((check) => check.type === 'change_unit_reported' && check.path === 'docs/change-units/CU-*.md'));
  assert.ok(checks.some((check) => check.type === 'artifact_absent' && check.path === 'goal.md'));
  for (const text of [
    'red-capable command unavailable',
    'attempted feedback loops',
    'requested production evidence',
    '未验证风险',
    'safe stop',
  ]) {
    assert.ok(
      checks.some((check) => check.type === 'transcript_contains' && check.text === text),
      `${text} must be transcript-measurable`,
    );
  }
});

test('project bootstrap verifies the project document instead of a synthetic goal doc', () => {
  const testCase = manifest.cases.find((candidate) => candidate.id === 'project-bootstrap');
  const checks = testCase.oracle_checks;

  assert.ok(testCase.expected_artifacts.includes('docs/project.md'));
  assert.ok(testCase.expected_artifacts.includes('DESIGN.md'));
  assert.ok(!testCase.expected_artifacts.includes('goal.md'));
  assert.ok(checks.some((check) => check.type === 'command_reported' && check.command === 'test -f docs/project.md'));
  assert.ok(checks.some((check) => check.type === 'goal_verified' && check.target === 'docs/project.md'));
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
        (check) => check.type === 'transcript_contains' && check.text === text,
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
    ['scripts/measure-char-footprint.mjs', '--max-default-chain-chars=4500', '--max-total-chars=56000'],
    { encoding: 'utf8' },
  );
  const json = JSON.parse(
    execFileSync(process.execPath, ['scripts/measure-char-footprint.mjs', '--json'], { encoding: 'utf8' }),
  );

  assert.match(output, /Default chain \(detail -> codegen -> review\)/);
  assert.ok(json.default_chain_total.chars <= 4500);
  assert.ok(json.total.chars <= 56000);
  assert.deepEqual(json.default_chain, ['detail', 'codegen', 'review']);
});

test('skills-suite evaluator verifies change units on disk with --verify-disk', () => {
  const testCase = manifest.cases.find((candidate) => candidate.id === 'bugfix-unreproducible-blocked');
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-verify-disk-'));
  const reportPath = path.join(runDir, 'report.json');
  const workspaceDir = path.join(runDir, 'workspaces', testCase.id);
  const cuPath = 'docs/change-units/CU-verify-disk-workspace.md';
  fs.mkdirSync(path.join(workspaceDir, 'docs/change-units'), { recursive: true });
  fs.writeFileSync(
    path.join(runDir, `${testCase.id}.events.jsonl`),
    `${JSON.stringify({
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command: 'node --test',
        exit_code: 0,
        status: 'completed',
        aggregated_output: 'ok - verify disk test\n',
      },
    })}\n`,
  );
  fs.writeFileSync(
    path.join(workspaceDir, cuPath),
    [
      '# CU-verify-disk-workspace',
      '',
      '## Type',
      '',
      '- bugfix',
      '',
      '## Verification',
      '',
      '```sh',
      'node --test',
      '```',
      '',
      'Ran the red-capable loop; command unavailable, so stopped safely.',
      '',
      '## Rollback',
      '',
      'n/a',
      '',
    ].join('\n'),
  );
  fs.writeFileSync(path.join(workspaceDir, 'goal.md'), '# Goal\n');

  const buildRun = (changeUnitPath) => ({
    case_id: testCase.id,
    status: 'pass',
    triggered_skills: testCase.expected_skills,
    artifacts: testCase.expected_artifacts,
    ...reportEvidenceFor(testCase),
    change_units: [changeUnitPath],
    forbidden_behaviors: [],
  });

  // rejects a change unit that is reported but not on disk (no workspace, CU absent at repo root)
  const missingReportPath = path.join(os.tmpdir(), `forge-skills-verify-disk-missing-${process.pid}.json`);
  fs.writeFileSync(
    missingReportPath,
    JSON.stringify(
      { version: 2, suite: 'forge', run_id: 'verify-disk-missing', cases: [buildRun('docs/change-units/CU-does-not-exist-99999.md')] },
      null,
      2,
    ),
  );
  const missing = spawnSync(
    process.execPath,
    ['scripts/evaluate-skills.mjs', '--allow-partial', '--verify-disk', '--trust-self-report', '--report', missingReportPath],
    { encoding: 'utf8' },
  );
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /change unit not found on disk/);

  // accepts a change unit that exists in the run's workspace directory (regression for workspace resolution)
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      { version: 2, suite: 'forge', run_id: 'verify-disk-workspace', cases: [buildRun(cuPath)] },
      null,
      2,
    ),
  );
  const present = spawnSync(
    process.execPath,
    ['scripts/evaluate-skills.mjs', '--allow-partial', '--verify-disk', '--trust-self-report', '--report', reportPath],
    { encoding: 'utf8' },
  );
  assert.equal(present.status, 0, present.stderr);
  assert.match(present.stdout, /on-disk verified/);

  fs.rmSync(runDir, { recursive: true, force: true });
  fs.unlinkSync(missingReportPath);
});

test('skills-suite evaluator --verify-disk requires a Verification section with command evidence', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-verify-content-${process.pid}.json`);
  const tempCuAbs = path.join(root, 'docs/change-units', 'CU-zzz-verify-disk-no-evidence.md');
  const testCase = manifest.cases.find((candidate) => candidate.id === 'default-chain-small-feature');
  const buildRun = (cuPath) => ({
    case_id: testCase.id,
    status: 'pass',
    triggered_skills: testCase.expected_skills,
    artifacts: testCase.expected_artifacts,
    ...reportEvidenceFor(testCase),
    change_units: [cuPath],
    forbidden_behaviors: [],
  });
  fs.writeFileSync(tempCuAbs, '# CU-zzz-verify-disk-no-evidence\n\n## Type\n\n- Test fixture: exists but has no Verification section\n');
  try {
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        { version: 2, suite: 'forge', run_id: 'verify-content-missing', cases: [buildRun('docs/change-units/CU-zzz-verify-disk-no-evidence.md')] },
        null,
        2,
      ),
    );
    const missing = spawnSync(
      process.execPath,
      ['scripts/evaluate-skills.mjs', '--allow-partial', '--verify-disk', '--trust-self-report', '--report', reportPath],
      { encoding: 'utf8' },
    );
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /Verification section/);
  } finally {
    fs.unlinkSync(tempCuAbs);
    if (fs.existsSync(reportPath)) fs.unlinkSync(reportPath);
  }
});

test('skills-suite evaluator --verify-disk rejects echoed verification commands', () => {
  const testCase = manifest.cases.find((candidate) => candidate.id === 'bugfix-unreproducible-blocked');
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-verify-disk-echo-'));
  const reportPath = path.join(runDir, 'report.json');
  const workspaceDir = path.join(runDir, 'workspaces', testCase.id);
  const cuPath = 'docs/change-units/CU-verify-disk-echo.md';
  fs.mkdirSync(path.join(workspaceDir, 'docs/change-units'), { recursive: true });
  fs.writeFileSync(path.join(workspaceDir, 'goal.md'), '# Goal\n');
  fs.writeFileSync(
    path.join(workspaceDir, cuPath),
    [
      '# CU-verify-disk-echo',
      '',
      '## Verification',
      '',
      '```sh',
      'node --test',
      '```',
      '',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(runDir, `${testCase.id}.events.jsonl`),
    `${JSON.stringify({
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command: 'echo "node --test"',
        exit_code: 0,
        status: 'completed',
        aggregated_output: 'node --test\n',
      },
    })}\n`,
  );
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        version: 2,
        suite: 'forge',
        run_id: 'verify-disk-echo',
        cases: [
          {
            case_id: testCase.id,
            status: 'pass',
            triggered_skills: testCase.expected_skills,
            artifacts: testCase.expected_artifacts,
            ...reportEvidenceFor(testCase),
            change_units: [cuPath],
            forbidden_behaviors: [],
          },
        ],
      },
      null,
      2,
    ),
  );
  const result = spawnSync(
    process.execPath,
    ['scripts/evaluate-skills.mjs', '--allow-partial', '--verify-disk', '--trust-self-report', '--report', reportPath],
    { encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Verification command was not executed successfully/);
  fs.rmSync(runDir, { recursive: true, force: true });
});

test('skills-suite evaluator rejects an answer-echo report lacking independent evidence', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-report-${process.pid}.json`);
  const cases = manifest.cases.map((testCase) => {
    return {
      case_id: testCase.id,
      status: 'pass',
      triggered_skills: testCase.expected_skills,
      artifacts: testCase.expected_artifacts,
      ...reportEvidenceFor(testCase),
      forbidden_behaviors: [],
      notes: 'answer-echo report: echoes oracle answers, no events.jsonl, no workspace',
    };
  });

  fs.writeFileSync(
    reportPath,
    JSON.stringify({ version: 2, suite: 'forge', run_id: 'answer-echo', cases }, null, 2),
  );

  // Master gate: a hand-written answer-echo report that echoes every oracle
  // answer via self-report, with NO independent evidence (no events.jsonl,
  // no workspace), under default trust (no --trust-self-report) MUST fail the
  // hard gate. A self-report pass is NOT behavioral evidence. execFileSync
  // throws on the non-zero exit.
  let caught;
  try {
    execFileSync(process.execPath, ['scripts/evaluate-skills.mjs', '--report', reportPath], {
      encoding: 'utf8',
    });
  } catch (error) {
    caught = error;
  }
  assert.ok(
    caught,
    'evaluate-skills.mjs must exit non-zero for an answer-echo report with no independent evidence',
  );
  assert.match(caught.stderr, /failed/);
  assert.doesNotMatch(caught.stderr, /report passed/);
  fs.unlinkSync(reportPath);
});

test('inspectRunReport flags no-evidence self-report passes under requireIndependent (mixed bypass closed)', () => {
  // Regression for the mixed-bypass: a case that passes purely via self-report
  // with NO events.jsonl used to slip through the per-case requireIndependent
  // check — the `evidence?.available &&` guard skipped no-evidence cases, so
  // one real case (with evidence) could cover N self-report-only echo cases.
  // The guard is removed; a no-evidence self-report pass must now be flagged.
  const testCase = manifest.cases[0];
  const run = {
    case_id: testCase.id,
    status: 'pass',
    triggered_skills: testCase.expected_skills,
    artifacts: testCase.expected_artifacts,
    ...reportEvidenceFor(testCase),
    forbidden_behaviors: [],
    notes: 'echo case: self-report only, no events.jsonl',
  };
  const inspection = inspectRunReport(
    { version: 2, suite: 'forge', run_id: 'mixed-bypass', cases: [run] },
    { manifest, registry, requireIndependent: true, strictOutcomes: true, loadEvidence: () => null },
  );
  const lacksEvidence = inspection.issues.filter((i) => /lacks independent evidence/.test(i));
  assert.ok(
    lacksEvidence.length > 0,
    'a no-evidence self-report pass must be flagged under requireIndependent (mixed bypass closed)',
  );
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
    ['scripts/evaluate-skills.mjs', '--trust-self-report', '--report', reportPath, '--score-out', scorePath],
    { encoding: 'utf8' },
  );
  const score = JSON.parse(fs.readFileSync(scorePath, 'utf8'));

  assert.match(output, /Score report written/);
  assert.equal(score.score, 100);
  assert.equal(score.grade, 'A');
  assert.equal(score.axes.goal_verification, 100);
  assert.equal(score.cases.length, manifest.cases.length);
  // per-check source provenance is persisted; a trusted synthetic report is
  // 100% self-report (independent_ratio 0) — honest about its evidence basis.
  assert.equal(score.evidence_sources.independent, 0);
  assert.equal(score.evidence_sources['self-report'], score.oracle_checks.total);
  assert.equal(score.independent_ratio, 0);
  fs.unlinkSync(reportPath);
  fs.unlinkSync(scorePath);
});

test('skills-suite evaluator compares Forge against a no-Forge baseline', () => {
  const forgeReportPath = path.join(os.tmpdir(), `forge-skills-compare-forge-${process.pid}.json`);
  const baselineReportPath = path.join(os.tmpdir(), `forge-skills-compare-baseline-${process.pid}.json`);
  const comparePath = path.join(os.tmpdir(), `forge-skills-compare-output-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'default-chain-small-feature');
  const forgeRun = {
    case_id: testCase.id,
    status: 'pass',
    triggered_skills: testCase.expected_skills,
    artifacts: testCase.expected_artifacts,
    ...reportEvidenceFor(testCase),
    forbidden_behaviors: [],
  };
  const baselineRun = {
    case_id: testCase.id,
    status: 'pass',
    triggered_skills: [],
    artifacts: ['src/'],
    change_units: [],
    goal_verification: [],
    goal_coverage_entries: [],
    commands_run: [],
    decisions: [],
    forbidden_behaviors: [],
    evidence: ['no-Forge baseline smoke report'],
  };

  const repeat = (run, index) => ({
    ...run,
    repeat_index: index,
    evidence_id: `${run.case_id}.r${index}`,
  });

  fs.writeFileSync(
    forgeReportPath,
    JSON.stringify(
      { version: 2, suite: 'forge', run_id: 'forge-compare-smoke', cases: [repeat(forgeRun, 0), repeat(forgeRun, 1)] },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    baselineReportPath,
    JSON.stringify(
      { version: 2, suite: 'forge', run_id: 'no-forge-compare-smoke', cases: [repeat(baselineRun, 0), repeat(baselineRun, 1)] },
      null,
      2,
    ),
  );

  const output = execFileSync(
    process.execPath,
    [
      'scripts/evaluate-skills.mjs',
      '--allow-partial',
      '--trust-self-report',
      '--report',
      forgeReportPath,
      '--baseline-report',
      baselineReportPath,
      '--compare-out',
      comparePath,
    ],
    { encoding: 'utf8' },
  );
  const comparison = JSON.parse(fs.readFileSync(comparePath, 'utf8'));

  assert.match(output, /Forge vs no-Forge \(fair-comparison\)/);
  assert.equal(comparison.statistical_gate.passed, true);
  assert.ok(comparison.uplift.score_ratio >= 2);
  assert.equal(comparison.uplift.score_ratio_passed, true);
  assert.equal(comparison.uplift.pass_rate_not_worse, true);
  assert.match(
    output,
    new RegExp(`Forge vs no-Forge \\(fair-comparison\\): ${comparison.forge.score}/100 vs ${comparison.baseline.score}/100`),
  );
  // fair comparison model must be declared and exclude schema-only axes
  assert.match(comparison.scoring_model, /fair-comparison/);
  assert.match(comparison.scoring_model, /scope_control/);
  assert.doesNotMatch(comparison.scoring_model, /routing/);
  // the Forge-schema decisions axis (self-report-only) must be removed
  assert.doesNotMatch(comparison.scoring_model, /decisions/);

  fs.unlinkSync(forgeReportPath);
  fs.unlinkSync(baselineReportPath);
  fs.unlinkSync(comparePath);
});

test('skills-suite evaluator fails when Forge does not clear the 100 percent comparison gate', () => {
  const forgeReportPath = path.join(os.tmpdir(), `forge-skills-compare-fail-forge-${process.pid}.json`);
  const baselineReportPath = path.join(os.tmpdir(), `forge-skills-compare-fail-baseline-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'thinking-red-team');
  const run = {
    case_id: testCase.id,
    status: 'pass',
    triggered_skills: testCase.expected_skills,
    artifacts: testCase.expected_artifacts,
    ...reportEvidenceFor(testCase),
    forbidden_behaviors: [],
  };

  fs.writeFileSync(
    forgeReportPath,
    JSON.stringify({ version: 2, suite: 'forge', run_id: 'forge-no-uplift', cases: [run] }, null, 2),
  );
  fs.writeFileSync(
    baselineReportPath,
    JSON.stringify({ version: 2, suite: 'forge', run_id: 'baseline-no-uplift', cases: [run] }, null, 2),
  );

  const result = spawnSync(
    process.execPath,
    [
      'scripts/evaluate-skills.mjs',
      '--allow-partial',
      '--trust-self-report',
      '--report',
      forgeReportPath,
      '--baseline-report',
      baselineReportPath,
    ],
    { encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /below required 2x baseline/);

  fs.unlinkSync(forgeReportPath);
  fs.unlinkSync(baselineReportPath);
});

test('skills-suite evaluator rejects a zero-baseline comparison as not comparable (no Infinity auto-pass)', () => {
  const forgeReportPath = path.join(os.tmpdir(), `forge-skills-zero-base-forge-${process.pid}.json`);
  const baselineReportPath = path.join(os.tmpdir(), `forge-skills-zero-base-baseline-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'default-chain-small-feature');
  // Forge arm: full self-report answers (trusted) -> fair score 100.
  const forgeRun = {
    case_id: testCase.id,
    status: 'pass',
    triggered_skills: testCase.expected_skills,
    artifacts: testCase.expected_artifacts,
    ...reportEvidenceFor(testCase),
    forbidden_behaviors: [],
  };
  // Baseline arm: fails EVERY fair axis (artifacts absent, no verification,
  // every forbidden behavior present + forbidden artifact present) -> fair 0.
  const forbiddenBehaviors = testCase.oracle_checks
    .filter((check) => check.type === 'forbidden_behavior_absent')
    .map((check) => check.behavior);
  const baselineRun = {
    case_id: testCase.id,
    status: 'pass',
    triggered_skills: [],
    artifacts: ['docs/project.md'],
    change_units: [],
    goal_verification: [],
    goal_coverage_entries: [],
    commands_run: [],
    decisions: [],
    forbidden_behaviors: forbiddenBehaviors,
    evidence: [],
  };

  fs.writeFileSync(
    forgeReportPath,
    JSON.stringify({ version: 2, suite: 'forge', run_id: 'forge-zero-base', cases: [forgeRun] }, null, 2),
  );
  fs.writeFileSync(
    baselineReportPath,
    JSON.stringify({ version: 2, suite: 'forge', run_id: 'baseline-zero-base', cases: [baselineRun] }, null, 2),
  );

  // A zero baseline must NOT mint an Infinity ratio that auto-passes the 2.0x
  // gate. scoreRatio returns null and the gate hard-fails with "not
  // comparable, cannot auto-pass".
  const result = spawnSync(
    process.execPath,
    [
      'scripts/evaluate-skills.mjs',
      '--allow-partial',
      '--trust-self-report',
      '--report',
      forgeReportPath,
      '--baseline-report',
      baselineReportPath,
    ],
    { encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not comparable, cannot auto-pass/);
  // scoreRatio must return null (not Infinity) for a zero baseline.
  assert.doesNotMatch(result.stderr, /Infinity/);

  fs.unlinkSync(forgeReportPath);
  fs.unlinkSync(baselineReportPath);
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
    ['scripts/evaluate-skills.mjs', '--allow-partial', '--trust-self-report', '--report', reportPath],
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
    ['scripts/evaluate-skills.mjs', '--allow-partial', '--skip-blocked', '--trust-self-report', '--report', reportPath],
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
