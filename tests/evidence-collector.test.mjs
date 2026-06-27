import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadBenchmarkContract } from '../scripts/lib/benchmark-contract.mjs';
import { loadRegistry } from '../scripts/lib/registry.mjs';
import {
  commandWasRun,
  evidencePathMatch,
  fileChangeRecorded,
  loadIndependentEvidence,
  resolveWorkspacePath,
  skillWasRead,
  transcriptContains,
  workspaceHasArtifact,
} from '../scripts/lib/evidence-collector.mjs';
import { evaluateOracleChecks } from '../scripts/lib/run-report.mjs';

const root = path.resolve(import.meta.dirname, '..');

/** Build a synthetic runDir with an events.jsonl + workspace tree. */
function buildRunDir(events = [], files = {}) {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-evidence-'));
  const caseId = 'test-case';
  const eventsPath = path.join(runDir, `${caseId}.events.jsonl`);
  fs.writeFileSync(eventsPath, events.map((e) => JSON.stringify(e)).join('\n'));
  const workspaceDir = path.join(runDir, 'workspaces', caseId);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(workspaceDir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return { runDir, caseId, eventsPath, workspaceDir };
}

function cmdEvent(command, exitCode = 0, status = 'completed', output = '') {
  return {
    type: 'item.completed',
    item: { id: `item_${Math.random()}`, type: 'command_execution', command, exit_code: exitCode, status, aggregated_output: output },
  };
}

function fileChangeEvent(file, kind = 'add') {
  return {
    type: 'item.completed',
    item: { id: `item_${Math.random()}`, type: 'file_change', changes: [{ path: file, kind }], status: 'completed' },
  };
}

function messageEvent(text) {
  return {
    type: 'item.completed',
    item: { id: `item_${Math.random()}`, type: 'agent_message', text },
  };
}

function turnCompleted(usage) {
  return { type: 'turn.completed', usage };
}

test('loadIndependentEvidence extracts commands with exit codes', () => {
  const { runDir, caseId } = buildRunDir([
    cmdEvent("/bin/zsh -lc 'pwd && ls'", 0),
    cmdEvent('/bin/zsh -lc "rg --files"', 1, 'failed'),
  ]);
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    assert.equal(ev.commands.length, 2);
    assert.equal(ev.commands[0].exitCode, 0);
    assert.equal(ev.commands[1].exitCode, 1);
    assert.equal(ev.commands[1].status, 'failed');
    assert.equal(ev.available, true);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('loadIndependentEvidence extracts file changes', () => {
  const { runDir, caseId } = buildRunDir([
    fileChangeEvent('/abs/docs/project.md', 'add'),
    fileChangeEvent('/abs/docs/change-units/CU-1.md', 'add'),
    fileChangeEvent('/abs/docs/change-units/CU-1.md', 'update'),
  ]);
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    assert.equal(ev.filesChanged.length, 3);
    assert.equal(ev.filesChanged[0].kind, 'add');
    assert.equal(ev.filesChanged[2].kind, 'update');
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('loadIndependentEvidence extracts skills read via SKILL.md command', () => {
  const { runDir, caseId } = buildRunDir([
    cmdEvent("/bin/zsh -lc \"sed -n '1,260p' /Users/x/.codex/plugins/cache/forge/skills/codegen/SKILL.md\"", 0, 'completed', '---\nname: codegen\n'),
    cmdEvent("/bin/zsh -lc \"pwd && sed -n '1,240p' /Users/x/.codex/plugins/cache/forge/skills/review/SKILL.md && git status --short\"", 0, 'completed', '/tmp/run\n---\nname: review\n'),
    cmdEvent('/bin/zsh -lc "cat /Users/x/skills/detail/SKILL.md"', 0, 'completed', '---\nname: detail\n'),
    cmdEvent('/bin/zsh -lc "cat /Users/x/skills/missing/SKILL.md"', 1, 'failed'),
  ]);
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    // exit_code 1 read must NOT count; echo/path-only cheats must NOT count
    assert.deepEqual(ev.skillsRead.sort(), ['codegen', 'detail', 'review']);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('loadIndependentEvidence walks the workspace tree', () => {
  const { runDir, caseId } = buildRunDir([], {
    'docs/features/task-archive/goal.md': '# goal',
    'src/archive.js': 'export const x = 1;',
    'tests/archive.test.js': "import 'node:test';",
  });
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    assert.ok(ev.workspaceFiles.length >= 3);
    assert.ok(ev.workspaceFiles.some((f) => f.includes('goal.md')));
    assert.ok(ev.workspaceFiles.some((f) => f.startsWith('src/')));
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('loadIndependentEvidence reports available=false for empty runDir', () => {
  const { runDir, caseId } = buildRunDir([], {});
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    assert.equal(ev.available, false);
    assert.equal(ev.commands.length, 0);
    assert.equal(ev.workspaceFiles.length, 0);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('loadIndependentEvidence handles missing events file gracefully', () => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-evidence-empty-'));
  try {
    const ev = loadIndependentEvidence(runDir, 'no-such-case');
    assert.equal(ev.available, false);
    assert.equal(ev.commands.length, 0);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('loadIndependentEvidence sums token usage across turns', () => {
  const { runDir, caseId } = buildRunDir([
    turnCompleted({ input_tokens: 100, output_tokens: 50, reasoning_output_tokens: 10 }),
    turnCompleted({ input_tokens: 200, output_tokens: 30, reasoning_output_tokens: 0 }),
  ]);
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    assert.equal(ev.tokenUsage.input_tokens, 300);
    assert.equal(ev.tokenUsage.output_tokens, 80);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('commandWasRun matches fragment, rejects wrappers, requires an effect', () => {
  const { runDir, caseId } = buildRunDir([
    cmdEvent('node --test tests/', 0, 'completed', 'ok - 3 tests\n'), // real: output + exit 0
    cmdEvent('npm run build', null), // null exit, no output, no file_change
    cmdEvent('node --test scripts/clean.js', 0), // exit 0 but no output, no file_change -> no effect
  ]);
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    // real command with stdout + exit 0 counts
    assert.equal(commandWasRun(ev, 'node --test tests/'), true);
    assert.equal(commandWasRun(ev, 'node --test tests/', { requireExitCode: true }), true);
    // null exit + no output + no file_change -> no observable effect
    assert.equal(commandWasRun(ev, 'npm run build'), false);
    assert.equal(commandWasRun(ev, 'npm run build', { requireExitCode: true }), false);
    // exit 0 but no output and no file_change -> no observable effect
    assert.equal(commandWasRun(ev, 'node --test scripts/clean.js'), false);
    assert.equal(commandWasRun(ev, 'nonexistent'), false);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('commandWasRun rejects echo/cat/printf/heredoc wrappers (echo-cheat)', () => {
  // echo-cheat: every matching command merely prints the fragment instead of
  // executing it. commandWasRun('echo "node --test"') must NOT be true.
  const { runDir, caseId } = buildRunDir([
    cmdEvent('echo "node --test"', 0, 'completed', 'node --test\n'),
    cmdEvent("printf '%s\\n' 'node --test'", 0, 'completed', 'node --test\n'),
    cmdEvent('cat <<EOF\nnode --test\nEOF', 0, 'completed', 'node --test\n'),
    cmdEvent('node -e \'console.log("node --test")\'', 0, 'completed', 'node --test\n'),
  ]);
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    assert.equal(commandWasRun(ev, 'node --test'), false);
    assert.equal(commandWasRun(ev, 'node --test', { requireExitCode: true }), false);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('commandWasRun counts a no-stdout command when the run touched files', () => {
  // a real command that produces no stdout but the run changed files on disk
  // still counts (effect = file_change), and a wrapper still does not.
  const { runDir, caseId } = buildRunDir([
    cmdEvent('node scripts/seed.js', 0), // exit 0, no stdout
    fileChangeEvent('/abs/src/seeded.js', 'add'),
    cmdEvent('echo "node scripts/seed.js"', 0, 'completed', 'node scripts/seed.js\n'),
  ]);
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    assert.equal(commandWasRun(ev, 'node scripts/seed.js'), true); // effect via file_change
    // echo wrapper still rejected even though file_change exists
    assert.equal(commandWasRun(ev, 'echo "node scripts/seed.js"'), false);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('workspaceHasArtifact matches exact, glob, prefix, and basename', () => {
  const { runDir, caseId } = buildRunDir([], {
    'docs/change-units/CU-20260601-x.md': 'x',
    'src/archive.js': 'x',
  });
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    assert.equal(workspaceHasArtifact(ev, 'src/'), true); // prefix
    assert.equal(workspaceHasArtifact(ev, 'docs/change-units/CU-*.md'), true); // glob
    assert.equal(workspaceHasArtifact(ev, 'archive.js'), true); // basename
    assert.equal(workspaceHasArtifact(ev, 'docs/project.md'), false); // absent
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('fileChangeRecorded matches events stream file paths', () => {
  const { runDir, caseId } = buildRunDir([fileChangeEvent('/abs/runDir/workspaces/test-case/docs/project.md', 'add')]);
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    assert.equal(fileChangeRecorded(ev, 'project.md'), true);
    assert.equal(fileChangeRecorded(ev, 'src/x.js'), false);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('skillWasRead reflects exit-code-0 reads only', () => {
  const { runDir, caseId } = buildRunDir([
    cmdEvent('/bin/zsh -lc "cat /x/skills/review/SKILL.md"', 0, 'completed', '---\nname: review\n'),
    cmdEvent('/bin/zsh -lc "cat /x/skills/failed/SKILL.md"', 1, 'failed'),
  ]);
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    assert.equal(skillWasRead(ev, 'review'), true);
    assert.equal(skillWasRead(ev, 'failed'), false);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('skillWasRead rejects echo/path-only skill cheats but counts real reads', () => {
  // echo-cheat against skill_triggered: `echo skills/codegen/SKILL.md` prints
  // the path string and never reads the body. It must NOT count as reading the
  // skill. find only locates the path; a failed cat does not count. A real cat
  // that retrieved the body (non-empty output) + exit 0 still counts.
  const { runDir, caseId } = buildRunDir([
    cmdEvent('echo skills/codegen/SKILL.md', 0, 'completed', 'skills/codegen/SKILL.md\n'),
    cmdEvent("find . -path '*/skills/codegen/SKILL.md' -print", 0, 'completed', './skills/codegen/SKILL.md\n'),
    cmdEvent('/bin/zsh -lc "cat /x/skills/codegen/SKILL.md"', 1, 'failed', ''),
    cmdEvent('/bin/zsh -lc "cat /x/skills/review/SKILL.md"', 0, 'completed', '---\nname: review\n'),
  ]);
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    assert.equal(skillWasRead(ev, 'codegen'), false); // echo/find/failed cheats rejected
    assert.equal(ev.skillsRead.includes('codegen'), false);
    assert.equal(skillWasRead(ev, 'review'), true); // real cat read counts
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('skillWasRead counts a file_change touching the SKILL.md path', () => {
  // a file_change on the standard skill path is a real read event
  // (covers staged-disk evidence where a read is represented as a touch)
  const { runDir, caseId } = buildRunDir([
    fileChangeEvent('/abs/plugins/forge/skills/codegen/SKILL.md', 'update'),
  ]);
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    assert.equal(skillWasRead(ev, 'codegen'), true);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('transcriptContains rejects a phrase echoed in a non-reasoning message', () => {
  // the phrase appears ONLY in a structured JSON echo (mid-task stuffing),
  // not in free-form reasoning -> must NOT count (answer-echo defense).
  const { runDir, caseId } = buildRunDir([
    messageEvent('{"status":"pass","note":"tests passed"}'),
  ]);
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    assert.equal(transcriptContains(ev, 'tests passed'), false);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('transcriptContains matches phrases in free-form reasoning, not the final report', () => {
  const { runDir, caseId } = buildRunDir([
    messageEvent('I will verify that tests passed before reporting.'), // free-form reasoning
    messageEvent('{"case_id":"x","status":"pass","evidence":["tests passed"]}'), // final report
  ]);
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    // reasoning message matches; final structured report does not
    assert.equal(transcriptContains(ev, 'tests passed'), true);
    // a phrase that exists only in the final report must not match
    assert.equal(transcriptContains(ev, 'case_id'), false);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('resolveWorkspacePath prefers workspace then repo root', () => {
  const { runDir, caseId } = buildRunDir([], { 'src/x.js': 'x' });
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    const resolved = resolveWorkspacePath(ev, 'src/x.js', root);
    assert.ok(resolved && resolved.includes('src'));
    const missing = resolveWorkspacePath(ev, 'nope/missing.js', root);
    assert.equal(missing, null);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('evidencePathMatch glob, prefix, basename edge cases', () => {
  assert.equal(evidencePathMatch('docs/change-units/CU-*.md', 'docs/change-units/CU-20260601-x.md'), true);
  assert.equal(evidencePathMatch('docs/change-units/CU-*.md', 'docs/change-units/NOTCU.md'), false);
  assert.equal(evidencePathMatch('src/', 'src/deep/file.js'), true);
  assert.equal(evidencePathMatch('src/', 'tests/x.js'), false);
  assert.equal(evidencePathMatch('goal.md', 'docs/features/x/goal.md'), true);
});

test('forbidden_files_absent catches the real ambiguous-idea-alignment false pass', () => {
  // This is the smoking gun: the 2026-06-05 run created forbidden parallel-history
  // files (status.md, timeline.md, CODE_MAP.yml, ...) but self-reported pass.
  // The independent evidence + forbidden_files_absent oracle must turn it red.
  const sampleRunDir = path.join(root, '.eval-runs/skills-suite/2026-06-05T03-39-19-428Z');
  if (!fs.existsSync(sampleRunDir)) return; // skip if sample absent in checkout

  const ev = loadIndependentEvidence(sampleRunDir, 'ambiguous-idea-alignment');
  // the forbidden files the agent actually created
  const forbiddenCreated = ['docs/status.md', 'docs/timeline.md', 'docs/CODE_MAP.yml', 'docs/CURRENT_STATE.md', 'docs/REBUILD_GUIDE.md', 'docs/idea-brief.md'];
  const observedForbidden = forbiddenCreated.filter((f) =>
    ev.filesChanged.some(({ path: p }) => p.endsWith(f.split('/').pop())) || ev.workspaceFiles.includes(f),
  );
  assert.ok(
    observedForbidden.length >= 3,
    `independent evidence must observe the forbidden files; saw ${observedForbidden.join(', ')}`,
  );

  // simulate the oracle: each forbidden file that IS present must make the check fail
  for (const forbidden of forbiddenCreated) {
    const present = fileChangeRecorded(ev, forbidden) || workspaceHasArtifact(ev, forbidden);
    if (observedForbidden.includes(forbidden)) {
      assert.equal(present, true, `${forbidden} should be observable in independent evidence`);
    }
  }
});

test('forbidden_files_absent oracle turns red for the real false-pass run with evidence', () => {
  // End-to-end: feed the real run's evidence into evaluateOracleChecks and confirm
  // the forbidden_files_absent checks fail (the self-reported pass becomes a fail).
  const sampleRunDir = path.join(root, '.eval-runs/skills-suite/2026-06-05T03-39-19-428Z');
  if (!fs.existsSync(sampleRunDir)) return;

  const registry = loadRegistry(root);
  const { manifest } = loadBenchmarkContract(root, registry);
  const testCase = manifest.cases.find((c) => c.id === 'ambiguous-idea-alignment');

  const ev = loadIndependentEvidence(sampleRunDir, testCase.id);
  // the run's self-report (claims pass, omits the forbidden files)
  const selfReport = {
    status: 'pass',
    triggered_skills: ['forge-brainstorm', 'forge-business-alignment'],
    artifacts: ['docs/project.md', 'docs/change-units/CU-20260605-ambiguous-idea-alignment.md', 'goal.md'],
    change_units: ['docs/change-units/CU-20260605-ambiguous-idea-alignment.md'],
    goal_verification: [{ target: 'goal.md', status: 'completed' }],
    commands_run: [],
    evidence: [],
    forbidden_behaviors: [],
  };

  const results = evaluateOracleChecks(testCase, selfReport, ev);
  const forbiddenResults = results.filter((r) => r.check.type === 'forbidden_files_absent');
  const failedForbidden = forbiddenResults.filter((r) => !r.passed);

  // With independent evidence, at least one forbidden file must be caught red.
  assert.ok(
    failedForbidden.length >= 1,
    `independent evidence must catch the forbidden files; got ${failedForbidden.length} failures`,
  );
  // and those failures must be tagged independent (not self-report)
  assert.ok(failedForbidden.every((r) => r.source === 'independent'));
});

test('semantic oracle branches use disk and event evidence, not self-report', () => {
  const { runDir, caseId } = buildRunDir(
    [
      cmdEvent('node --test', 0, 'completed', 'ok - semantic oracle\n'),
      messageEvent('I selected decision gate FD1 after checking the goal.'),
      messageEvent('{"case_id":"semantic","status":"pass"}'),
    ],
    {
      'goal.md': '# Goal\n\nCovers src/index.ts and requires verification.\n',
      'src/index.ts': 'export const ok = true;\n',
      'docs/change-units/CU-semantic.md': '# CU\n\n## Decisions\n\n- FD1: keep the tested seam.\n',
    },
  );
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    const testCase = {
      id: 'semantic',
      oracle_checks: [
        { type: 'goal_covers', path: 'src/index.ts' },
        { type: 'goal_verified', target: 'goal.md' },
        { type: 'decision_gate_reported', decision: 'FD1' },
      ],
    };
    const run = {
      triggered_skills: [],
      artifacts: [],
      change_units: [],
      goal_verification: [],
      goal_coverage_entries: [],
      commands_run: [],
      decisions: [],
      forbidden_behaviors: [],
      evidence: [],
    };
    const results = evaluateOracleChecks(testCase, run, ev);

    assert.ok(results.every((result) => result.source === 'independent'));
    assert.ok(results.every((result) => result.passed));
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('semantic goal coverage rejects an empty goal document', () => {
  const { runDir, caseId } = buildRunDir([messageEvent('inspecting empty goal')], { 'goal.md': '# Goal\n' });
  try {
    const ev = loadIndependentEvidence(runDir, caseId);
    const [result] = evaluateOracleChecks(
      { id: 'empty-goal', oracle_checks: [{ type: 'goal_covers', path: 'src/index.ts' }] },
      { goal_coverage_entries: [{ source: 'goal.md', covers: ['src/index.ts'] }] },
      ev,
    );

    assert.equal(result.source, 'independent');
    assert.equal(result.passed, false);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});

test('loadIndependentEvidence parses a real repo run sample when present', () => {
  const sampleRunDir = path.join(root, '.eval-runs/skills-suite/2026-06-05T03-39-19-428Z');
  if (!fs.existsSync(sampleRunDir)) {
    // sample not present in this checkout — skip gracefully
    return;
  }
  const ev = loadIndependentEvidence(sampleRunDir, 'ambiguous-idea-alignment');
  assert.ok(ev.available, 'real sample should be available');
  assert.ok(ev.commands.length > 0, 'real sample should have commands');
  assert.ok(ev.filesChanged.length > 0, 'real sample should have file changes');
  // the false-pass case created forbidden files; the independent evidence must see them
  assert.ok(
    ev.filesChanged.some(({ path: p }) => p.includes('CODE_MAP.yml') || p.includes('status.md') || p.includes('timeline.md')),
    'independent evidence must observe the forbidden files the self-report missed',
  );
});

test('transcriptContains matches Unicode arrows against an ASCII -> phrase', () => {
  // Oracle phrases use ASCII `->` (e.g. "detail -> codegen -> review") but the
  // published skills and AGENTS.md reason with Unicode `→`. Normalization must
  // bridge the two so a compliant Forge arm that read the skills still matches.
  const evidence = {
    available: true,
    messages: [
      { text: 'For this small feature I will run detail → codegen → review.', isFinalReport: false },
    ],
  };
  assert.equal(transcriptContains(evidence, 'detail -> codegen -> review'), true);
  assert.equal(
    transcriptContains(
      { available: true, messages: [{ text: 'use detail -> codegen -> review now', isFinalReport: false }] },
      'detail -> codegen -> review',
    ),
    true,
  );
  assert.equal(
    transcriptContains(
      { available: true, messages: [{ text: 'unrelated reasoning', isFinalReport: false }] },
      'detail -> codegen -> review',
    ),
    false,
  );
  assert.equal(transcriptContains({ available: false, messages: [] }, 'detail -> codegen -> review'), null);
});

test('transcriptContains matches verification signals across fixture languages', () => {
  const evidence = {
    available: true,
    messages: [
      { text: 'Implementation is in place. I am running the narrow runtime verification now.', isFinalReport: false },
      { text: 'Verification passed with node:test coverage for the acceptance criteria.', isFinalReport: false },
    ],
  };

  assert.equal(transcriptContains(evidence, '运行验证'), true);
  assert.equal(
    transcriptContains(
      { available: true, messages: [{ text: '验证回执是 node --test exit 0。', isFinalReport: false }] },
      '运行验证',
    ),
    true,
  );
  assert.equal(
    transcriptContains(
      { available: true, messages: [{ text: '{"evidence":["runtime verification"]}', isFinalReport: false }] },
      '运行验证',
    ),
    false,
  );
  assert.equal(
    transcriptContains(
      { available: true, messages: [{ text: 'runtime verification', isFinalReport: true }] },
      '运行验证',
    ),
    false,
  );
});
