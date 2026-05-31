import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const manifest = JSON.parse(fs.readFileSync('evals/skills-suite/manifest.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('registry.yaml', 'utf8'));

test('skills-suite benchmark covers every registered skill', () => {
  const expected = new Set(registry.skills.map((skill) => skill.name));
  const covered = new Set(manifest.cases.flatMap((testCase) => testCase.expected_skills));

  assert.deepEqual([...covered].sort(), [...expected].sort());
});

test('skills-suite evaluator runs without external dependencies', () => {
  const output = execFileSync(process.execPath, ['scripts/evaluate-skills.mjs'], { encoding: 'utf8' });

  assert.match(output, /benchmark contract passed/);
  assert.match(output, /behavioral effectiveness is not claimed/);
});

test('skills-suite evaluator scores a complete report', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-report-${process.pid}.json`);
  const cases = manifest.cases.map((testCase) => {
    const commands = new Set();
    const decisions = new Set();
    const evidence = new Set(testCase.required_evidence);

    for (const check of testCase.oracle_checks) {
      if (check.type === 'command_reported') commands.add(check.command);
      if (check.type === 'decision_gate_reported') decisions.add(check.decision);
      if (check.type === 'evidence_contains') evidence.add(check.text);
    }

    return {
      case_id: testCase.id,
      status: 'pass',
      triggered_skills: testCase.expected_skills,
      artifacts: testCase.expected_artifacts,
      commands_run: [...commands],
      decisions: [...decisions],
      forbidden_behaviors: [],
      evidence: [...evidence],
      notes: 'synthetic evaluator smoke report; not behavior evidence',
    };
  });

  fs.writeFileSync(
    reportPath,
    JSON.stringify({ version: 1, suite: 'forge', run_id: 'synthetic-smoke', cases }, null, 2),
  );

  const output = execFileSync(process.execPath, ['scripts/evaluate-skills.mjs', '--report', reportPath], {
    encoding: 'utf8',
  });

  assert.match(output, /report passed/);
  fs.unlinkSync(reportPath);
});

test('skills-suite evaluator supports partial reports and artifact globs', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-partial-report-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'thinking-red-team');
  const report = {
    version: 1,
    suite: 'forge',
    run_id: 'partial-smoke',
    cases: [
      {
        case_id: testCase.id,
        status: 'pass',
        triggered_skills: testCase.expected_skills,
        artifacts: ['docs/thinking/2026-05-31-tagging-red-team.md'],
        commands_run: [],
        decisions: ['thinking_writeback_target'],
        forbidden_behaviors: [],
        evidence: ['假设清单'],
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
  assert.match(output, /5\/5 oracle checks/);
  fs.unlinkSync(reportPath);
});

test('skills-suite evaluator can skip externally blocked cases', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-blocked-report-${process.pid}.json`);
  const passedCase = manifest.cases[0];
  const blockedCase = manifest.cases.find((candidate) => candidate.id === 'codegen-projection');
  const commands = new Set();
  const decisions = new Set();
  const evidence = new Set(passedCase.required_evidence);

  for (const check of passedCase.oracle_checks) {
    if (check.type === 'command_reported') commands.add(check.command);
    if (check.type === 'decision_gate_reported') decisions.add(check.decision);
    if (check.type === 'evidence_contains') evidence.add(check.text);
  }

  const report = {
    version: 1,
    suite: 'forge',
    run_id: 'blocked-smoke',
    cases: [
      {
        case_id: passedCase.id,
        status: 'pass',
        triggered_skills: passedCase.expected_skills,
        artifacts: passedCase.expected_artifacts,
        commands_run: [...commands],
        decisions: [...decisions],
        forbidden_behaviors: [],
        evidence: [...evidence],
      },
      {
        case_id: blockedCase.id,
        status: 'blocked',
        triggered_skills: [],
        artifacts: [],
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
