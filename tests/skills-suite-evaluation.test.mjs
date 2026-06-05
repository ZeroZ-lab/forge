import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const manifest = JSON.parse(fs.readFileSync('evals/skills-suite/manifest.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('registry.yaml', 'utf8'));

function reportEvidenceFor(testCase) {
  const commands = new Set();
  const decisions = new Set();
  const changeUnits = new Set();
  const docSync = new Set();
  const codeMapEntries = [];
  const evidence = new Set(testCase.required_evidence);
  const sourceDoc =
    testCase.expected_artifacts.find((artifact) => artifact.startsWith('docs/') && artifact !== 'docs/CODE_MAP.yml' && artifact !== 'docs/CURRENT_STATE.md') ??
    'docs/synthetic-source.md';

  for (const check of testCase.oracle_checks) {
    if (check.type === 'command_reported') commands.add(check.command);
    if (check.type === 'decision_gate_reported') decisions.add(check.decision);
    if (check.type === 'change_unit_reported') changeUnits.add(check.path.replace('*', 'synthetic'));
    if (check.type === 'doc_sync_completed') docSync.add(check.target);
    if (check.type === 'code_map_covers') {
      codeMapEntries.push({ source: check.path.startsWith('docs/') ? check.path : sourceDoc, projects_to: [check.path] });
    }
    if (check.type === 'evidence_contains') evidence.add(check.text);
  }

  return {
    change_units: [...changeUnits],
    doc_sync: [...docSync].map((target) => ({ target, status: 'completed' })),
    code_map_entries: codeMapEntries,
    commands_run: [...commands],
    decisions: [...decisions],
    evidence: [...evidence],
  };
}

test('skills-suite benchmark covers every registered skill', () => {
  const expected = new Set(registry.skills.map((skill) => skill.name));
  const covered = new Set(manifest.cases.flatMap((testCase) => testCase.expected_skills));

  assert.deepEqual([...covered].sort(), [...expected].sort());
});

test('skills-suite doc sync targets are visible as expected artifacts', () => {
  for (const testCase of manifest.cases) {
    for (const check of testCase.oracle_checks) {
      if (check.type === 'doc_sync_completed') {
        assert.ok(
          testCase.expected_artifacts.includes(check.target),
          `${testCase.id} syncs ${check.target} but does not list it as an expected artifact`,
        );
      }
    }
  }
});

test('skills-suite evaluator runs without external dependencies', () => {
  const output = execFileSync(process.execPath, ['scripts/evaluate-skills.mjs'], { encoding: 'utf8' });

  assert.match(output, /benchmark contract passed/);
  assert.match(output, /behavioral effectiveness is not claimed/);
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
  fs.unlinkSync(reportPath);
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
  const blockedCase = manifest.cases.find((candidate) => candidate.id === 'codegen-projection');

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
        doc_sync: [],
        code_map_entries: [],
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

test('skills-suite evaluator rejects missing CODE_MAP coverage', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-missing-code-map-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'codegen-projection');
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
        code_map_entries: [],
        forbidden_behaviors: [],
      },
    ],
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const result = spawnSync(process.execPath, ['scripts/evaluate-skills.mjs', '--allow-partial', '--report', reportPath], {
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /code_map_covers/);
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
        artifacts: ['docs/idea-brief.md'],
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

test('skills-suite evaluator rejects string CODE_MAP entries', () => {
  const reportPath = path.join(os.tmpdir(), `forge-skills-string-code-map-${process.pid}.json`);
  const testCase = manifest.cases.find((candidate) => candidate.id === 'codegen-projection');
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
        code_map_entries: ['src/'],
        forbidden_behaviors: [],
      },
    ],
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const result = spawnSync(process.execPath, ['scripts/evaluate-skills.mjs', '--allow-partial', '--report', reportPath], {
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /code_map_entries must be/);
  fs.unlinkSync(reportPath);
});

test('skills-suite evaluator rejects string doc sync entries', () => {
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
        doc_sync: ['docs/CURRENT_STATE.md'],
        forbidden_behaviors: [],
      },
    ],
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const result = spawnSync(process.execPath, ['scripts/evaluate-skills.mjs', '--allow-partial', '--report', reportPath], {
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /doc_sync must be/);
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
        artifacts: ['docs/idea-brief.md'],
        ...reportEvidenceFor(testCase),
        change_units: ['docs/project.md', 'docs/CURRENT_STATE.md', 'docs/change-units/CU-synthetic.md'],
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
