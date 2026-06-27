import assert from 'node:assert/strict';
import test from 'node:test';

import { markdownTableCell, sanitizeNoForgeFixture, truncateList } from '../scripts/lib/benchmark-helpers.mjs';
import { forgePromptForCase, promptForCase } from '../scripts/lib/benchmark-prompts.mjs';
import {
  createCaseRun,
  createRunReport,
  evaluateOracleChecks,
  formatCaseRunContract,
  inspectRun,
  inspectRunReport,
} from '../scripts/lib/run-report.mjs';

const allChecksCase = {
  id: 'all-checks',
  expected_artifacts: ['src/', 'docs/change-units/CU-*.md'],
  oracle_checks: [
    { type: 'skill_triggered', skill: 'codegen' },
    { type: 'artifact_reported', path: 'src/' },
    { type: 'artifact_absent', path: 'docs/project.md' },
    { type: 'change_unit_reported', path: 'docs/change-units/CU-*.md' },
    { type: 'goal_covers', path: 'src/index.ts' },
    { type: 'command_reported', command: 'npm test' },
    { type: 'decision_gate_reported', decision: 'FD1' },
    { type: 'goal_verified', target: 'goal.md' },
    { type: 'transcript_contains', text: 'tests passed' },
    { type: 'forbidden_behavior_absent', behavior: 'skip_tests' },
  ],
};

function passingRun() {
  return createCaseRun('all-checks', 'pass', {
    triggered_skills: ['forge-codegen'],
    artifacts: [{ path: 'src/index.ts' }],
    change_units: [{ path: 'docs/change-units/CU-20260625-architecture.md' }],
    goal_verification: [{ target: 'docs/features/x/goal.md', status: 'completed' }],
    goal_coverage_entries: [{ source: 'docs/features/x/goal.md', covers: ['src/index.ts'] }],
    commands_run: ['npm test'],
    decisions: [{ id: 'FD1' }],
    evidence: ['tests passed'],
    notes: 'verified through the report interface',
  });
}

test('run report constructors own the v2 result shape', () => {
  const run = createCaseRun('example', 'blocked', { evidence: ['usage limit'] });
  const report = createRunReport({ runId: 'run-1', runner: 'test', startedAt: '2026-06-25T00:00:00.000Z', cases: [run] });

  assert.deepEqual(run.change_units, []);
  assert.deepEqual(run.goal_coverage_entries, []);
  assert.equal(report.version, 2);
  assert.equal(report.suite, 'forge');
  assert.deepEqual(report.cases, [run]);
  assert.match(formatCaseRunContract('example'), /"case_id": "example"/);
  assert.match(formatCaseRunContract('example'), /"goal_coverage_entries"/);
});

test('inspectRun hides dual field shapes and path matching rules', () => {
  const view = inspectRun(passingRun());

  assert.deepEqual(view.triggeredSkills, ['codegen']);
  assert.deepEqual(view.artifacts, ['src/index.ts']);
  assert.deepEqual(view.changeUnits, ['docs/change-units/CU-20260625-architecture.md']);
  assert.deepEqual(view.decisions, ['FD1']);
  assert.ok(view.matchesArtifact('src/'));
  assert.ok(view.matchesArtifact('docs/change-units/CU-*.md'));
  assert.ok(!view.matchesArtifact('docs/project.md'));
  assert.match(view.evidence, /verified through the report interface/);
});

test('evaluateOracleChecks evaluates every supported check through one interface', () => {
  const results = evaluateOracleChecks(allChecksCase, passingRun());

  assert.equal(results.length, 10);
  assert.ok(results.every((result) => result.passed));

  const failed = evaluateOracleChecks(allChecksCase, {
    ...passingRun(),
    commands_run: [],
  });
  assert.equal(failed.find((result) => result.check.type === 'command_reported').passed, false);
});

test('inspectRunReport validates report shape, expected artifacts, skills, and oracle outcomes', () => {
  const manifest = { cases: [allChecksCase] };
  const registry = { skills: [{ name: 'codegen' }] };
  const report = createRunReport({ runId: 'valid', runner: 'test', cases: [passingRun()] });
  const valid = inspectRunReport(report, { manifest, registry });

  assert.deepEqual(valid.issues, []);
  assert.equal(valid.caseEvaluations.length, 1);
  assert.ok(valid.caseEvaluations[0].oracleResults.every((result) => result.passed));

  const invalid = inspectRunReport(
    createRunReport({
      runId: 'invalid',
      runner: 'test',
      cases: [{ ...passingRun(), artifacts: [], triggered_skills: ['forge-unknown'] }],
    }),
    { manifest, registry },
  );
  assert.ok(invalid.issues.some((issue) => issue.includes('unknown triggered skill unknown')));
  assert.ok(invalid.issues.some((issue) => issue.includes('expected artifact not reported src/')));
  assert.ok(invalid.issues.some((issue) => issue.includes('failed oracle')));

  const malformed = inspectRunReport(
    createRunReport({
      runId: 'malformed',
      runner: 'test',
      cases: [{ ...passingRun(), artifacts: 'src/index.ts' }],
    }),
    { manifest, registry },
  );
  assert.ok(malformed.issues.some((issue) => issue.includes('artifacts must be')));
});

test('inspectRunReport supports partial reports and skipped blocked cases', () => {
  const manifest = {
    cases: [
      allChecksCase,
      { ...allChecksCase, id: 'blocked-case', oracle_checks: [] },
    ],
  };
  const registry = { skills: [{ name: 'codegen' }] };
  const report = createRunReport({
    runId: 'partial',
    runner: 'test',
    cases: [
      passingRun(),
      createCaseRun('blocked-case', 'blocked', { evidence: ['usage limit'] }),
    ],
  });
  const result = inspectRunReport(report, { manifest, registry, allowPartial: true, skipBlocked: true });

  assert.deepEqual(result.issues, []);
  assert.equal(result.blockedSkipped, 1);
  assert.equal(result.caseEvaluations.length, 1);
});

test('inspectRunReport supports repeated samples for the same case_id', () => {
  const manifest = { cases: [allChecksCase] };
  const registry = { skills: [{ name: 'codegen' }] };
  const report = createRunReport({
    runId: 'repeated',
    runner: 'test',
    cases: [
      { ...passingRun(), repeat_index: 0, evidence_id: 'all-checks.r0' },
      { ...passingRun(), repeat_index: 1, evidence_id: 'all-checks.r1' },
    ],
  });
  const result = inspectRunReport(report, { manifest, registry });

  assert.deepEqual(result.issues, []);
  assert.equal(result.caseEvaluations.length, 2);
  assert.deepEqual(
    result.caseEvaluations.map(({ run }) => run.evidence_id),
    ['all-checks.r0', 'all-checks.r1'],
  );
});

test('inspectRunReport accepts schema-optional decisions and forbidden behaviors', () => {
  const run = passingRun();
  delete run.decisions;
  delete run.forbidden_behaviors;
  const result = inspectRunReport(
    createRunReport({ runId: 'optional-fields', runner: 'test', cases: [run] }),
    { manifest: { cases: [allChecksCase] }, registry: { skills: [{ name: 'codegen' }] } },
  );

  assert.ok(!result.issues.some((issue) => issue.includes('decisions must')));
  assert.ok(!result.issues.some((issue) => issue.includes('forbidden_behaviors must')));
});

test('benchmark summary formatting remains escaped and compact', () => {
  assert.equal(truncateList(['a', 'b', 'c'], 2), 'a, b, +1 more');
  assert.equal(truncateList([]), '-');
  assert.equal(markdownTableCell('a|b\nc'), 'a\\|b<br>c');
});

test('no-Forge fixture sanitizer removes Forge scoring instructions', () => {
  const fixture = [
    '# Fixture: 默认主链小功能迭代',
    '',
    '> 给 task-management 增加 "archive completed tasks" 功能。',
    '',
    '- 使用默认主链 `detail -> codegen -> review`。',
    '- 如果需要最小代码骨架，可以自行创建 `src/` 和 `tests/`。',
    '',
    '验收标准：',
    '',
    '- AC-1：done task before cutoff is archived.',
    '',
    '实现要求：',
    '',
    '- 创建 `docs/features/task-archive/goal.md`。',
    '- 创建最小实现文件和 `node:test` 回归测试。',
    '- 创建 `docs/change-units/CU-*.md`。',
    '- triggered_skills 必须包含 detail、codegen、review。',
    '- Preserve product skill trigger schedules for user-created automations.',
    '',
    'Expected behavior:',
    '',
    '- Produce a feature goal before implementation.',
    '- Generate executable code and tests from the goal.',
    '- Trigger only the default chain skills.',
  ].join('\n');
  const sanitized = sanitizeNoForgeFixture(fixture);

  assert.match(sanitized, /archive completed tasks/);
  assert.match(sanitized, /AC-1/);
  assert.match(sanitized, /node:test/);
  assert.doesNotMatch(sanitized, /默认主链/);
  assert.doesNotMatch(sanitized, /detail -> codegen -> review/);
  assert.doesNotMatch(sanitized, /docs\/features/);
  assert.doesNotMatch(sanitized, /docs\/change-units/);
  assert.doesNotMatch(sanitized, /triggered_skills/);
  assert.doesNotMatch(sanitized, /Trigger only the default chain skills/);
  assert.doesNotMatch(sanitized, /feature goal before implementation/);
  assert.doesNotMatch(sanitized, /from the goal/);
  assert.doesNotMatch(sanitized, /Expected behavior/);
  assert.match(sanitized, /Preserve product skill trigger schedules/);
  assert.match(sanitized, /实现要求/);
});

test('evaluateOracleChecks without evidence falls back to self-report source', () => {
  const results = evaluateOracleChecks(allChecksCase, passingRun());
  // every result has a source label; none can claim independent without evidence
  assert.ok(results.every((result) => typeof result.source === 'string'));
  assert.ok(results.every((result) => result.source !== 'independent'));
  // command_reported and skill_triggered still pass via self-report fallback
  const commandResult = results.find((r) => r.check.type === 'command_reported');
  assert.equal(commandResult.passed, true);
  assert.equal(commandResult.source, 'self-report');
  // transcript_contains without evidence falls back to self-report
  const transcriptResult = results.find((r) => r.check.type === 'transcript_contains');
  assert.equal(transcriptResult.source, 'self-report');
});

test('evaluateOracleChecks prefers independent evidence over self-report', () => {
  // self-report claims codegen was triggered and node --test was run,
  // but independent evidence shows neither happened
  const contradictingEvidence = {
    available: true,
    commands: [{ command: 'ls', exitCode: 0, status: 'completed' }],
    filesChanged: [],
    skillsRead: [],
    workspaceFiles: [],
  };
  const results = evaluateOracleChecks(allChecksCase, passingRun(), contradictingEvidence);

  const skillResult = results.find((r) => r.check.type === 'skill_triggered');
  assert.equal(skillResult.source, 'independent');
  assert.equal(skillResult.passed, false); // independent says codegen was never read

  const commandResult = results.find((r) => r.check.type === 'command_reported');
  assert.equal(commandResult.source, 'independent');
  assert.equal(commandResult.passed, false); // independent says npm test never ran
});

test('evaluateOracleChecks independent evidence confirms a real run', () => {
  const corroboratingEvidence = {
    available: true,
    commands: [
      { command: '/bin/zsh -lc "npm test"', exitCode: 0, status: 'completed' },
      { command: '/bin/zsh -lc "cat /x/skills/codegen/SKILL.md"', exitCode: 0, status: 'completed' },
    ],
    filesChanged: [{ path: 'src/index.ts', kind: 'add' }],
    skillsRead: ['codegen'],
    workspaceFiles: ['src/index.ts'],
  };
  const results = evaluateOracleChecks(allChecksCase, passingRun(), corroboratingEvidence);

  const skillResult = results.find((r) => r.check.type === 'skill_triggered');
  assert.equal(skillResult.source, 'independent');
  assert.equal(skillResult.passed, true);

  const commandResult = results.find((r) => r.check.type === 'command_reported');
  assert.equal(commandResult.source, 'independent');
  assert.equal(commandResult.passed, true);

  const artifactResult = results.find((r) => r.check.type === 'artifact_reported');
  assert.equal(artifactResult.source, 'independent');
  assert.equal(artifactResult.passed, true);
});

test('evaluateOracleChecks trustSelfReport escape hatch ignores evidence', () => {
  const contradictingEvidence = {
    available: true,
    commands: [],
    skillsRead: [],
    workspaceFiles: [],
    filesChanged: [],
  };
  const results = evaluateOracleChecks(allChecksCase, passingRun(), contradictingEvidence, {
    trustSelfReport: true,
  });
  const skillResult = results.find((r) => r.check.type === 'skill_triggered');
  // escape hatch forces self-report even when evidence contradicts
  assert.equal(skillResult.source, 'self-report');
  assert.equal(skillResult.passed, true);
});

test('forgePromptForCase is blind: no per-case oracle answers leak into the Forge arm prompt', () => {
  // A case fully populated with oracle answers — the very shape that used to be
  // JSON.stringify'd verbatim into the prompt (run-skills-benchmark.mjs:171-179).
  const oracleTestCase = {
    id: 'default-chain-small-feature',
    title: '默认主链小功能迭代',
    expected_skills: ['detail', 'codegen', 'review'],
    expected_artifacts: ['docs/features/task-archive/goal.md', 'src/', 'tests/', 'docs/change-units/CU-*.md'],
    required_evidence: ['default chain', 'feature goal', 'verification command', '运行验证'],
    forbidden_behaviors: [
      'escalated_clear_feature_to_define',
      'generated_plan_for_small_feature',
      'claimed_complete_without_runtime_evidence',
    ],
    oracle_checks: [
      { type: 'skill_triggered', skill: 'detail' },
      { type: 'skill_triggered', skill: 'codegen' },
      { type: 'skill_triggered', skill: 'review' },
      { type: 'decision_gate_reported', decision: 'business_go_no_go' },
      { type: 'decision_gate_reported', decision: 'test_seam' },
      { type: 'command_reported', command: 'node --test' },
      { type: 'transcript_contains', text: 'detail -> codegen -> review' },
      { type: 'transcript_contains', text: '运行验证' },
    ],
  };
  const fixture = [
    '# Fixture: 默认主链小功能迭代',
    '',
    '> 给 task-management 增加 "archive completed tasks" 功能。',
    '',
    '验收标准：',
    '',
    '- AC-1：done task before cutoff is archived.',
  ].join('\n');
  const publishedSkills = ['detail', 'codegen', 'review', 'guide', 'think', 'business-alignment'];
  const prompt = forgePromptForCase(oracleTestCase, fixture, publishedSkills);

  // The Forge arm must NOT see the per-case oracle answers. These tokens only
  // existed in the old serialized oracle block; they must be absent now.
  assert.doesNotMatch(prompt, /oracle_checks/);
  assert.doesNotMatch(prompt, /expected_skills/);
  assert.doesNotMatch(prompt, /expected_artifacts/);
  assert.doesNotMatch(prompt, /required_evidence/);
  assert.doesNotMatch(prompt, /business_go_no_go/);
  assert.doesNotMatch(prompt, /test_seam/);
  // The coached exact chain / exact command must not be handed to the agent.
  assert.doesNotMatch(prompt, /detail -> codegen -> review/);
  // Note: "forbidden_behaviors" is intentionally NOT asserted absent here — it is
  // a legitimate report-schema field name the agent must fill. Blinding removes the
  // expected ANSWERS (the behaviors array above), not the schema shape, and the
  // fixture de-coaching removes the per-case coaching text separately.

  // The Forge arm still receives what it needs: the fixture task text, the
  // acceptance criteria, the published skill registry NAMES (not per-case answers),
  // and the answer-free report schema.
  assert.match(prompt, /archive completed tasks/);
  assert.match(prompt, /验收标准/);
  assert.match(prompt, /AC-1/);
  assert.match(prompt, /已发布 Forge skill 名称/);
  assert.match(prompt, /business-alignment/); // a registry name, not an answer
  assert.match(prompt, /guide/); // a registry name, not an answer
  assert.match(prompt, /非 JSON progress evidence line/);
  assert.match(prompt, /安全停止、拒绝猜测或报告阻塞结论，最终 status 仍填 "pass"/);
  assert.match(prompt, /status 只能是 completed、pending 或 blocked，不能使用 skipped/);
  assert.match(prompt, /最后一条消息只输出一个 JSON object/);
  assert.match(prompt, /"case_id": "default-chain-small-feature"/); // report schema
  assert.equal(prompt.includes('oracle_checks'), false);
});

test('benchmark prompts reserve blocked status for run-level blockers', () => {
  const testCase = { id: 'x', title: 'x' };
  const fixture = '> investigate safely.';

  assert.match(
    promptForCase(testCase, fixture, 'forge', ['codegen']),
    /只有 Codex 用量限制、工具缺失、权限或环境故障导致 benchmark 本身无法继续时，才填 "blocked"/,
  );
  assert.match(
    promptForCase(testCase, fixture, 'no-forge'),
    /安全停止、拒绝猜测或报告阻塞结论，最终 status 仍填 "pass"/,
  );
  assert.match(promptForCase(testCase, fixture, 'no-forge'), /没有目标文档同步时填 \[\]/);
});

test('promptForCase passes the published registry only to the forge arm', () => {
  const testCase = { id: 'x', title: 'x', expected_skills: ['detail'], oracle_checks: [] };
  const fixture = '> do work.';
  const published = ['detail', 'codegen', 'review'];
  const forgePrompt = promptForCase(testCase, fixture, 'forge', published);
  const noForgePrompt = promptForCase(testCase, fixture, 'no-forge', published);

  // Forge arm sees the published skill names; the no-forge arm does not (it is
  // told to keep triggered_skills empty and never sees the registry list).
  assert.match(forgePrompt, /已发布 Forge skill 名称/);
  assert.match(forgePrompt, /detail, codegen, review/);
  assert.doesNotMatch(noForgePrompt, /已发布 Forge skill 名称/);
  assert.doesNotMatch(noForgePrompt, /oracle_checks/);
});
