import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  EffectivenessRunnerError,
  runIsolatedEffectivenessAttempt,
} from '../scripts/lib/effectiveness-runner.mjs';
import { parseEffectivenessReport } from '../scripts/lib/effectiveness-report.mjs';

const root = path.resolve(import.meta.dirname, '..');
const samplePath = path.join(
  root,
  'evals',
  'effectiveness-suite',
  'report-samples',
  'v1-valid-direct-action.json',
);
const experimentPlan = {
  arms: {
    'no-forge': {
      definition_digest: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      capability_policy: {
        id: 'no-forge',
        digest: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        exposed: [],
      },
    },
    'kernel-only': {
      definition_digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      capability_policy: {
        id: 'kernel-only',
        digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        exposed: [{ kind: 'other', id: 'forge:kernel', version: '1' }],
      },
    },
    'adaptive-full': {
      definition_digest: 'sha256:2222222222222222222222222222222222222222222222222222222222222222',
      capability_policy: {
        id: 'adaptive-full',
        digest: 'sha256:8888888888888888888888888888888888888888888888888888888888888888',
        exposed: [{ kind: 'skill', id: 'forge:detail', version: '0.52.0' }],
      },
    },
    'legacy-chain': {
      definition_digest: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      capability_policy: {
        id: 'legacy-chain',
        digest: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        exposed: [{ kind: 'other', id: 'forge:legacy-chain', version: '0.52.0' }],
      },
    },
  },
};

function git(cwd, args, options = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    ...options,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}

function writeFile(rootDir, relativePath, content) {
  const filePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function createSource(t, files = {}) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-effectiveness-runner-test-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  const sourceDir = path.join(tempRoot, 'source');
  const evidenceRoot = path.join(tempRoot, 'evidence');
  fs.mkdirSync(sourceDir, { recursive: true });
  const defaults = {
    'package.json': '{"name":"fixture","version":"1.0.0"}\n',
    'keep.txt': 'before\n',
    'delete.txt': 'delete me\n',
  };
  for (const [relativePath, content] of Object.entries({ ...defaults, ...files })) {
    writeFile(sourceDir, relativePath, content);
  }
  git(sourceDir, ['init', '-q']);
  git(sourceDir, ['config', 'user.name', 'Forge Test']);
  git(sourceDir, ['config', 'user.email', 'forge@example.invalid']);
  git(sourceDir, ['add', '-A']);
  git(sourceDir, ['commit', '-qm', 'fixture baseline']);
  return { tempRoot, sourceDir, evidenceRoot };
}

function sourceState(sourceDir) {
  return {
    head: git(sourceDir, ['rev-parse', 'HEAD']).trim(),
    status: git(sourceDir, ['status', '--porcelain=v1', '--untracked-files=all']),
    refs: git(sourceDir, ['for-each-ref', '--format=%(refname) %(objectname)']),
    index: git(sourceDir, ['ls-files', '--stage']),
  };
}

function baseReportInput({
  armId = 'adaptive-full',
  repeatIndex = 0,
  taskState = null,
  terminal = false,
} = {}) {
  const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
  const experiment = structuredClone(sample.experiment);
  experiment.reproduction.repeat_index = repeatIndex;
  experiment.comparison_group_id = `direct-read-package-version.model-fixture-model.${repeatIndex}`;
  experiment.arm = { id: armId };
  delete experiment.workspace;
  delete experiment.capability_policy;
  const turns = structuredClone(sample.costs[1]);
  turns.acquisition.kind = 'tool';
  turns.acquisition.source_ref = 'launcher:model-events';

  if (terminal) {
    return {
      experiment,
      events: [],
      evidence: [],
      final_result: {
        submission_status: 'no_output',
        artifact_refs: [],
        verifier_result_refs: [],
      },
      costs: [turns],
    };
  }

  const finalResult = structuredClone(sample.final_result);
  if (taskState) finalResult.model_claim.state = taskState;
  finalResult.verifier_result_refs = [];
  return {
    experiment,
    events: structuredClone(sample.events.filter((event) => event.actor !== 'verifier')),
    evidence: structuredClone(
      sample.evidence.filter((item) => item.source_kind !== 'independent_verifier'),
    ),
    final_result: finalResult,
    costs: [turns],
  };
}

function attemptSpec({
  armId = 'adaptive-full',
  sourceDir,
  evidenceRoot,
  attemptId,
  script,
  args = [],
  env = {},
  repeatIndex = 0,
  limits = {},
  taskState = null,
  terminal = false,
}) {
  return {
    contractRoot: root,
    experimentPlan,
    armId,
    attemptId,
    source: {
      dir: sourceDir,
      ref: 'fixture://direct-read-package-version',
    },
    evidenceRoot,
    command: {
      file: process.execPath,
      args: ['-e', script, ...(args.length > 0 ? ['--', ...args] : [])],
      env,
      label: 'fixture model process',
      definitionDigest: digest(script),
    },
    limits: {
      timeoutMs: 3_000,
      maxStdoutBytes: 64 * 1024,
      maxStderrBytes: 64 * 1024,
      maxCapturedWorkspaceBytes: 8 * 1024 * 1024,
      maxCapturedWorkspaceEntries: 1_000,
      maxDiffBytes: 2 * 1024 * 1024,
      gitOperationTimeoutMs: 5_000,
      killGraceMs: 50,
      ...limits,
    },
    buildReportInput() {
      return baseReportInput({ armId, repeatIndex, taskState, terminal });
    },
  };
}

function evidenceFile(result, reference) {
  return path.join(result.evidenceDir, reference);
}

test('isolated attempt captures revision, complete delta, command facts, and leaves source untouched', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t, { 'space name.txt': 'old\n' });
  const before = sourceState(sourceDir);
  const script = [
    "const fs = require('node:fs');",
    "fs.writeFileSync('keep.txt', 'after\\n');",
    "fs.rmSync('delete.txt');",
    "fs.mkdirSync('nested', { recursive: true });",
    "fs.writeFileSync('nested/new artifact.txt', 'new\\n');",
    "fs.writeFileSync('space name.txt', 'changed\\n');",
    "process.stdout.write('model output\\n');",
    "process.stderr.write('diagnostic\\n');",
  ].join('');

  const result = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'direct.adaptive-full.0',
    script,
    taskState: 'failed',
  }));

  assert.equal(result.receipt.contract, 'forge-effectiveness-run-receipt');
  assert.equal(result.receipt.schema_version, 1);
  assert.equal(result.receipt.experiment_arm.id, 'adaptive-full');
  assert.equal(
    result.receipt.experiment_arm.definition_digest,
    experimentPlan.arms['adaptive-full'].definition_digest,
  );
  assert.equal(result.receipt.source.base_revision, before.head);
  assert.match(result.receipt.source.snapshot_digest, /^sha256:/);
  assert.notEqual(
    result.receipt.workspace.final_snapshot_digest,
    result.receipt.source.snapshot_digest,
  );
  assert.equal(result.receipt.execution.termination, 'completed');
  assert.ok(result.receipt.execution.duration_ms >= result.receipt.command.duration_ms);
  assert.equal(result.receipt.command.exit_code, 0);
  assert.equal(result.receipt.command.signal, null);
  assert.equal(result.receipt.command.stdout.observed_bytes, Buffer.byteLength('model output\n'));
  assert.equal(result.receipt.command.stderr.observed_bytes, Buffer.byteLength('diagnostic\n'));
  assert.equal(result.receipt.source_guard.unchanged, true);
  assert.deepEqual(sourceState(sourceDir), before);

  const summary = JSON.parse(fs.readFileSync(evidenceFile(result, 'artifacts.json'), 'utf8'));
  assert.deepEqual(
    summary.changes.map(({ path: relativePath, change }) => [relativePath, change]),
    [
      ['delete.txt', 'deleted'],
      ['keep.txt', 'modified'],
      ['nested', 'added'],
      ['nested/new artifact.txt', 'added'],
      ['space name.txt', 'modified'],
    ],
  );
  const patch = fs.readFileSync(evidenceFile(result, 'diff.patch'), 'utf8');
  assert.match(patch, /delete\.txt/);
  assert.match(patch, /nested\/new artifact\.txt/);
  assert.match(patch, /space name\.txt/);
  const lifecycle = fs.readFileSync(evidenceFile(result, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  const lifecycleTimes = lifecycle.map((event) => Date.parse(event.observed_at));
  assert.ok(lifecycleTimes[0] <= lifecycleTimes[1]);
  assert.ok(lifecycleTimes[1] <= lifecycleTimes[2]);
  assert.ok(lifecycleTimes[2] <= Date.parse(result.receipt.execution.ended_at));
  for (const ref of ['events.jsonl', 'command.json', 'artifacts.json', 'diff.patch', 'attempt.json', 'receipt.json', 'report.json']) {
    assert.equal(fs.existsSync(evidenceFile(result, ref)), true, ref);
  }
  assert.equal(fs.existsSync(result.paths.workspaceDir), false);
  assert.equal(fs.existsSync(result.paths.runtimeDir), false);

  assert.equal(result.report.execution.termination, 'completed');
  assert.equal(result.report.final_result.model_claim.state, 'failed');
  assert.ok(
    result.report.evidence
      .filter((item) => item.producer_ref.startsWith('runner:'))
      .every((item) => item.source_kind === 'tool_output'),
  );
  const wallTime = result.report.costs.find((item) => item.metric === 'wall_time_ms');
  assert.equal(wallTime.value, result.receipt.execution.duration_ms);
  assert.equal(wallTime.acquisition.source_ref, 'attempt.json');
  assert.deepEqual(
    parseEffectivenessReport(result.report, { rootDir: root, experimentPlan }),
    result.report,
  );
});

test('sequential repeats use fresh workspaces and stable controlled fingerprints', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t);
  const script = "require('node:fs').writeFileSync('result.txt', 'deterministic\\n')";
  const first = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'repeat.adaptive-full.0',
    script,
    repeatIndex: 0,
  }));
  const second = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'repeat.adaptive-full.1',
    script,
    repeatIndex: 1,
  }));

  assert.notEqual(first.receipt.workspace.isolation_id, second.receipt.workspace.isolation_id);
  assert.equal(first.receipt.source.snapshot_digest, second.receipt.source.snapshot_digest);
  assert.equal(first.receipt.configuration_digest, second.receipt.configuration_digest);
  assert.equal(
    first.report.experiment.reproduction.request_fingerprint,
    first.receipt.configuration_digest,
  );
  assert.equal(
    second.report.experiment.reproduction.request_fingerprint,
    second.receipt.configuration_digest,
  );
  assert.equal(
    first.receipt.workspace.final_snapshot_digest,
    second.receipt.workspace.final_snapshot_digest,
  );
  assert.notEqual(first.evidenceDir, second.evidenceDir);
});

test('the caller-selected arm is bound before launch and cannot be relabeled by the adapter', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t);
  const script = "require('node:fs').writeFileSync('arm.txt', 'same-command\\n')";
  const forge = await runIsolatedEffectivenessAttempt(attemptSpec({
    armId: 'adaptive-full',
    sourceDir,
    evidenceRoot,
    attemptId: 'arm.adaptive-full',
    script,
  }));
  const noForge = await runIsolatedEffectivenessAttempt(attemptSpec({
    armId: 'no-forge',
    sourceDir,
    evidenceRoot,
    attemptId: 'arm.no-forge',
    script,
  }));

  assert.equal(forge.receipt.experiment_arm.id, 'adaptive-full');
  assert.equal(noForge.receipt.experiment_arm.id, 'no-forge');
  assert.equal(forge.report.experiment.arm.id, 'adaptive-full');
  assert.equal(noForge.report.experiment.arm.id, 'no-forge');
  assert.notEqual(forge.receipt.configuration_digest, noForge.receipt.configuration_digest);

  const relabeled = attemptSpec({
    armId: 'adaptive-full',
    sourceDir,
    evidenceRoot,
    attemptId: 'arm.relabeled',
    script: '',
  });
  relabeled.buildReportInput = () => baseReportInput({ armId: 'no-forge' });
  await assert.rejects(
    runIsolatedEffectivenessAttempt(relabeled),
    (error) =>
      error instanceof EffectivenessRunnerError &&
      error.code === 'report_rejected' &&
      error.receipt?.experiment_arm?.id === 'adaptive-full',
  );
});

test('B03-defaulted verifier refs may be omitted before the verifier stage', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t);
  const spec = attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'verifier.refs-omitted',
    script: '',
  });
  spec.buildReportInput = () => {
    const input = baseReportInput();
    delete input.final_result.verifier_result_refs;
    return input;
  };
  const result = await runIsolatedEffectivenessAttempt(spec);
  assert.deepEqual(result.report.final_result.verifier_result_refs, []);
});

test('fingerprint binds the pre-launch executable and effective inherited environment', async (t) => {
  const { tempRoot, sourceDir, evidenceRoot } = createSource(t);
  const launcher = path.join(tempRoot, 'self-updating-launcher');
  const replacement = path.join(tempRoot, 'replacement-launcher');
  const secondBody = [
    '#!/bin/sh',
    "printf 'second\\n' > launcher-result.txt",
    '',
  ].join('\n');
  const firstBody = [
    '#!/bin/sh',
    "printf 'first\\n' > launcher-result.txt",
    'cp "$REPLACEMENT_LAUNCHER" "$0"',
    '',
  ].join('\n');
  fs.writeFileSync(launcher, firstBody, { mode: 0o700 });
  fs.writeFileSync(replacement, secondBody, { mode: 0o700 });

  const makeSpec = (attemptId, repeatIndex) => ({
    ...attemptSpec({
      sourceDir,
      evidenceRoot,
      attemptId,
      script: '',
      repeatIndex,
    }),
    command: {
      file: launcher,
      args: [],
      env: { REPLACEMENT_LAUNCHER: replacement },
      label: 'self-updating launcher',
      definitionDigest: digest(fs.readFileSync(launcher)),
    },
  });
  const first = await runIsolatedEffectivenessAttempt(makeSpec('fingerprint.executable.0', 0));
  const second = await runIsolatedEffectivenessAttempt(makeSpec('fingerprint.executable.1', 1));
  assert.notEqual(first.receipt.configuration_digest, second.receipt.configuration_digest);
  assert.match(fs.readFileSync(evidenceFile(first, 'diff.patch'), 'utf8'), /first/);
  assert.match(fs.readFileSync(evidenceFile(second, 'diff.patch'), 'utf8'), /second/);

  const interpretedLauncher = path.join(tempRoot, 'interpreted-launcher.mjs');
  const interpretedSpec = (attemptId, repeatIndex, body) => {
    fs.writeFileSync(interpretedLauncher, body);
    const spec = attemptSpec({
      sourceDir,
      evidenceRoot,
      attemptId,
      script: '',
      repeatIndex,
    });
    spec.command = {
      file: process.execPath,
      args: [interpretedLauncher],
      env: {},
      label: 'interpreted launcher',
      definitionDigest: digest(body),
    };
    return spec;
  };
  const interpretedFirstBody =
    "import fs from 'node:fs'; fs.writeFileSync('interpreted.txt','first\\n');\n";
  const interpretedFirst = await runIsolatedEffectivenessAttempt(
    interpretedSpec('fingerprint.interpreted.0', 0, interpretedFirstBody),
  );
  const interpretedSecondBody =
    "import fs from 'node:fs'; fs.writeFileSync('interpreted.txt','second\\n');\n";
  const interpretedSecond = await runIsolatedEffectivenessAttempt(
    interpretedSpec('fingerprint.interpreted.1', 1, interpretedSecondBody),
  );
  assert.notEqual(
    interpretedFirst.receipt.configuration_digest,
    interpretedSecond.receipt.configuration_digest,
  );

  const originalTimezone = process.env.TZ;
  try {
    process.env.TZ = 'UTC';
    const utc = await runIsolatedEffectivenessAttempt(attemptSpec({
      sourceDir,
      evidenceRoot,
      attemptId: 'fingerprint.environment.0',
      script: "require('node:fs').writeFileSync('timezone.txt', process.env.TZ)",
      repeatIndex: 0,
    }));
    process.env.TZ = 'Pacific/Honolulu';
    const honolulu = await runIsolatedEffectivenessAttempt(attemptSpec({
      sourceDir,
      evidenceRoot,
      attemptId: 'fingerprint.environment.1',
      script: "require('node:fs').writeFileSync('timezone.txt', process.env.TZ)",
      repeatIndex: 1,
    }));
    assert.notEqual(utc.receipt.configuration_digest, honolulu.receipt.configuration_digest);
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }

  const secretA = attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'fingerprint.secret.0',
    script: '',
    env: { OPENAI_API_KEY: 'hunter2' },
    repeatIndex: 0,
  });
  const secretB = attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'fingerprint.secret.1',
    script: '',
    env: { OPENAI_API_KEY: 'different-low-entropy-secret' },
    repeatIndex: 1,
  });
  const originalTerm = process.env.TERM;
  let redactedA;
  let redactedB;
  try {
    process.env.TERM = 'prefix-hunter2-suffix';
    redactedA = await runIsolatedEffectivenessAttempt(secretA);
    process.env.TERM = 'prefix-different-low-entropy-secret-suffix';
    redactedB = await runIsolatedEffectivenessAttempt(secretB);
  } finally {
    if (originalTerm === undefined) delete process.env.TERM;
    else process.env.TERM = originalTerm;
  }
  assert.equal(redactedA.receipt.configuration_digest, redactedB.receipt.configuration_digest);

  const contextualA = attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'fingerprint.secret-context.0',
    script: '',
    args: ['--url=https://a.invalid/?token=token'],
    repeatIndex: 0,
  });
  contextualA.command.sensitiveValues = ['token'];
  const contextualB = attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'fingerprint.secret-context.1',
    script: '',
    args: ['--url=https://b.invalid/?token=token'],
    repeatIndex: 1,
  });
  contextualB.command.sensitiveValues = ['token'];
  const [contextA, contextB] = [
    await runIsolatedEffectivenessAttempt(contextualA),
    await runIsolatedEffectivenessAttempt(contextualB),
  ];
  assert.notEqual(contextA.receipt.configuration_digest, contextB.receipt.configuration_digest);
});

test('same attempt id in separate evidence stores still receives a unique isolation id', async (t) => {
  const { tempRoot, sourceDir, evidenceRoot } = createSource(t);
  const otherEvidenceRoot = path.join(tempRoot, 'other-evidence');
  const first = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'same.attempt',
    script: '',
  }));
  const second = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot: otherEvidenceRoot,
    attemptId: 'same.attempt',
    script: '',
  }));

  assert.notEqual(first.receipt.workspace.isolation_id, second.receipt.workspace.isolation_id);
  assert.equal(first.receipt.configuration_digest, second.receipt.configuration_digest);
});

test('concurrent attempts cannot observe or overwrite a sibling workspace', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t);
  const script = [
    "const fs = require('node:fs');",
    "const id = process.env.FIXTURE_MARKER;",
    "if (fs.existsSync('sibling.txt')) process.exit(17);",
    "fs.writeFileSync('sibling.txt', id);",
    "setTimeout(() => process.exit(0), 100);",
  ].join('');

  const [left, right] = await Promise.all([
    runIsolatedEffectivenessAttempt(attemptSpec({
      sourceDir,
      evidenceRoot,
      attemptId: 'parallel.left',
      script,
      env: { FIXTURE_MARKER: 'parallel.left' },
      repeatIndex: 0,
    })),
    runIsolatedEffectivenessAttempt(attemptSpec({
      sourceDir,
      evidenceRoot,
      attemptId: 'parallel.right',
      script,
      env: { FIXTURE_MARKER: 'parallel.right' },
      repeatIndex: 1,
    })),
  ]);

  assert.equal(left.receipt.execution.termination, 'completed');
  assert.equal(right.receipt.execution.termination, 'completed');
  assert.equal(left.receipt.command.exit_code, 0);
  assert.equal(right.receipt.command.exit_code, 0);
  assert.notEqual(left.evidenceDir, right.evidenceDir);
  const leftPatch = fs.readFileSync(evidenceFile(left, 'diff.patch'), 'utf8');
  const rightPatch = fs.readFileSync(evidenceFile(right, 'diff.patch'), 'utf8');
  assert.match(leftPatch, /parallel\.left/);
  assert.doesNotMatch(leftPatch, /parallel\.right/);
  assert.match(rightPatch, /parallel\.right/);
  assert.doesNotMatch(rightPatch, /parallel\.left/);
});

test('unsafe ids, dirty sources, external symlinks, and evidence collisions fail closed', async (t) => {
  const { tempRoot, sourceDir, evidenceRoot } = createSource(t);
  const basic = (attemptId) => attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId,
    script: '',
  });

  for (const unsafe of ['', '.', '..', '../escape', '/absolute', 'nested/run', 'nul\0byte']) {
    await assert.rejects(
      runIsolatedEffectivenessAttempt(basic(unsafe)),
      (error) => error instanceof EffectivenessRunnerError && error.code === 'invalid_attempt_id',
    );
  }

  const missingDefinition = basic('missing.definition');
  delete missingDefinition.command.definitionDigest;
  await assert.rejects(
    runIsolatedEffectivenessAttempt(missingDefinition),
    (error) => error instanceof EffectivenessRunnerError && error.code === 'invalid_spec',
  );

  const unknownArm = basic('unknown.arm');
  unknownArm.armId = 'future-arm';
  await assert.rejects(
    runIsolatedEffectivenessAttempt(unknownArm),
    (error) => error instanceof EffectivenessRunnerError && error.code === 'unknown_arm',
  );
  assert.equal(fs.existsSync(path.join(evidenceRoot, 'unknown.arm')), false);

  writeFile(sourceDir, 'untracked.txt', 'dirty\n');
  await assert.rejects(
    runIsolatedEffectivenessAttempt(basic('dirty.source')),
    (error) => error instanceof EffectivenessRunnerError && error.code === 'dirty_source',
  );
  fs.rmSync(path.join(sourceDir, 'untracked.txt'));

  const outside = path.join(tempRoot, 'outside.txt');
  fs.writeFileSync(outside, 'outside\n');
  fs.symlinkSync(outside, path.join(sourceDir, 'external-link'));
  git(sourceDir, ['add', 'external-link']);
  git(sourceDir, ['commit', '-qm', 'external symlink']);
  await assert.rejects(
    runIsolatedEffectivenessAttempt(basic('external.symlink')),
    (error) => {
      assert.ok(error instanceof EffectivenessRunnerError);
      assert.equal(error.code, 'external_symlink');
      return true;
    },
  );
  git(sourceDir, ['rm', '-q', 'external-link']);
  git(sourceDir, ['commit', '-qm', 'remove external symlink']);

  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.mkdirSync(path.join(evidenceRoot, 'collision'));
  await assert.rejects(
    runIsolatedEffectivenessAttempt(basic('collision')),
    (error) => error instanceof EffectivenessRunnerError && error.code === 'evidence_collision',
  );
});

test('evidence root validation follows symlink parents before creating directories', async (t) => {
  const { tempRoot, sourceDir } = createSource(t);
  const redirect = path.join(tempRoot, 'redirect');
  fs.symlinkSync(sourceDir, redirect);
  const escapedRoot = path.join(redirect, 'runner-evidence');

  await assert.rejects(
    runIsolatedEffectivenessAttempt(attemptSpec({
      sourceDir,
      evidenceRoot: escapedRoot,
      attemptId: 'symlink.parent',
      script: '',
    })),
    (error) => error instanceof EffectivenessRunnerError && error.code === 'overlapping_roots',
  );
  assert.equal(fs.existsSync(path.join(sourceDir, 'runner-evidence')), false);
  assert.equal(git(sourceDir, ['status', '--porcelain=v1', '--untracked-files=all']), '');
});

test('repo-local executables run from the clone and absolute source executables are rejected', async (t) => {
  const { tempRoot, sourceDir, evidenceRoot } = createSource(t, {
    'fixture-tool': "#!/bin/sh\nprintf 'clone tool\\n' > tool-result.txt\n",
  });
  fs.chmodSync(path.join(sourceDir, 'fixture-tool'), 0o700);
  git(sourceDir, ['add', 'fixture-tool']);
  git(sourceDir, ['commit', '-qm', 'make fixture tool executable']);
  const before = sourceState(sourceDir);

  const relative = attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'executable.relative',
    script: '',
  });
  relative.command = {
    file: './fixture-tool',
    args: [],
    env: {},
    label: 'fixture tool',
    definitionDigest: digest(fs.readFileSync(path.join(sourceDir, 'fixture-tool'))),
  };
  const result = await runIsolatedEffectivenessAttempt(relative);
  assert.equal(result.receipt.execution.termination, 'completed');
  assert.match(fs.readFileSync(evidenceFile(result, 'diff.patch'), 'utf8'), /clone tool/);
  assert.deepEqual(sourceState(sourceDir), before);

  const absolute = attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'executable.absolute-source',
    script: '',
  });
  absolute.command = {
    file: path.join(sourceDir, 'fixture-tool'),
    args: [],
    env: {},
    label: 'unsafe source tool',
    definitionDigest: digest(fs.readFileSync(path.join(sourceDir, 'fixture-tool'))),
  };
  await assert.rejects(
    runIsolatedEffectivenessAttempt(absolute),
    (error) =>
      error instanceof EffectivenessRunnerError && error.code === 'protected_path_exposure',
  );

  const externalLink = path.join(tempRoot, 'linked-source-tool');
  fs.symlinkSync(path.join(sourceDir, 'fixture-tool'), externalLink);
  const linked = attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'executable.source-symlink',
    script: '',
  });
  linked.command = {
    file: externalLink,
    args: [],
    env: {},
    label: 'linked source tool',
    definitionDigest: digest(fs.readFileSync(path.join(sourceDir, 'fixture-tool'))),
  };
  await assert.rejects(
    runIsolatedEffectivenessAttempt(linked),
    (error) =>
      error instanceof EffectivenessRunnerError && error.code === 'protected_path_exposure',
  );

  const originalPath = process.env.PATH;
  try {
    process.env.PATH = `${sourceDir}${path.delimiter}${originalPath ?? ''}`;
    await assert.rejects(
      runIsolatedEffectivenessAttempt(attemptSpec({
        sourceDir,
        evidenceRoot,
        attemptId: 'executable.inherited-path',
        script: '',
      })),
      (error) =>
        error instanceof EffectivenessRunnerError && error.code === 'protected_path_exposure',
    );
  } finally {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
  }
});

test('internal symlinks are accepted and symlink targets count toward capture limits', async (t) => {
  const internal = createSource(t);
  fs.symlinkSync('package.json', path.join(internal.sourceDir, 'zz-internal-link'));
  git(internal.sourceDir, ['add', 'zz-internal-link']);
  git(internal.sourceDir, ['commit', '-qm', 'internal symlink']);
  const accepted = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir: internal.sourceDir,
    evidenceRoot: internal.evidenceRoot,
    attemptId: 'symlink.internal',
    script: '',
  }));
  assert.equal(accepted.receipt.workspace.capture_complete, true);

  const limited = createSource(t);
  fs.symlinkSync(
    `${'./'.repeat(200)}missing`,
    path.join(limited.sourceDir, 'zzzz-link'),
  );
  git(limited.sourceDir, ['add', 'zzzz-link']);
  git(limited.sourceDir, ['commit', '-qm', 'large symlink target']);
  await assert.rejects(
    runIsolatedEffectivenessAttempt(attemptSpec({
      sourceDir: limited.sourceDir,
      evidenceRoot: limited.evidenceRoot,
      attemptId: 'symlink.limit',
      script: '',
      limits: { maxCapturedWorkspaceBytes: 300 },
    })),
    (error) => error instanceof EffectivenessRunnerError && error.code === 'workspace_limit',
  );
});

test('timeout and cancellation kill the process group before returning', async (t) => {
  const { tempRoot, sourceDir, evidenceRoot } = createSource(t);
  const heartbeat = path.join(tempRoot, 'heartbeat.log');
  const grandchild = [
    "const fs=require('node:fs');",
    "process.on('SIGTERM',()=>{});",
    "setInterval(()=>fs.appendFileSync(process.env.HEARTBEAT, 'x'), 15);",
  ].join('');
  const parent = [
    "const {spawn}=require('node:child_process');",
    `spawn(process.execPath,['-e',${JSON.stringify(grandchild)}],{stdio:'ignore',env:process.env});`,
    "setInterval(()=>{}, 1000);",
  ].join('');

  const timedOut = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'timeout.tree',
    script: parent,
    env: { HEARTBEAT: heartbeat },
    limits: { timeoutMs: 120, killGraceMs: 40 },
    terminal: true,
  }));
  assert.equal(timedOut.receipt.execution.termination, 'timeout');
  const sizeAfterTimeout = fs.existsSync(heartbeat) ? fs.statSync(heartbeat).size : 0;
  await new Promise((resolve) => setTimeout(resolve, 180));
  assert.equal(fs.existsSync(heartbeat) ? fs.statSync(heartbeat).size : 0, sizeAfterTimeout);
  assert.equal(timedOut.report.final_result.submission_status, 'no_output');

  const controller = new AbortController();
  const cancellation = runIsolatedEffectivenessAttempt({
    ...attemptSpec({
      sourceDir,
      evidenceRoot,
      attemptId: 'cancel.tree',
      script: "setInterval(()=>{}, 1000)",
      terminal: true,
    }),
    signal: controller.signal,
  });
  setTimeout(() => controller.abort(), 80);
  const cancelled = await cancellation;
  assert.equal(cancelled.receipt.execution.termination, 'cancelled');
  assert.equal(cancelled.report.execution.termination, 'cancelled');
});

test('normal process completion also terminates surviving process-group children', async (t) => {
  const { tempRoot, sourceDir, evidenceRoot } = createSource(t);
  const heartbeat = path.join(tempRoot, 'normal-exit-heartbeat.log');
  const grandchild = [
    "const fs=require('node:fs');",
    "process.on('SIGTERM',()=>process.exit(0));",
    "setInterval(()=>fs.appendFileSync(process.env.HEARTBEAT, 'x'), 15);",
  ].join('');
  const parent = [
    "const {spawn}=require('node:child_process');",
    `const child=spawn(process.execPath,['-e',${JSON.stringify(grandchild)}],{stdio:'ignore',env:process.env});`,
    'child.unref();',
  ].join('');

  const result = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'normal.exit.tree',
    script: parent,
    env: { HEARTBEAT: heartbeat },
  }));
  assert.equal(result.receipt.execution.termination, 'completed');
  const sizeAtReturn = fs.existsSync(heartbeat) ? fs.statSync(heartbeat).size : 0;
  await new Promise((resolve) => setTimeout(resolve, 180));
  assert.equal(fs.existsSync(heartbeat) ? fs.statSync(heartbeat).size : 0, sizeAtReturn);
});

test('workspace diff remains relative to the pinned base after the command commits', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t);
  const script = [
    "const fs=require('node:fs');",
    "const {spawnSync}=require('node:child_process');",
    "fs.writeFileSync('keep.txt','committed change\\n');",
    "spawnSync('git',['add','keep.txt'],{stdio:'inherit'});",
    "spawnSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','command commit'],{stdio:'inherit'});",
  ].join('');
  const result = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'command.commit',
    script,
  }));
  assert.equal(result.receipt.execution.termination, 'completed');
  assert.match(fs.readFileSync(evidenceFile(result, 'diff.patch'), 'utf8'), /committed change/);
});

test('workspace capture ignores mutable clone metadata and includes ignored artifacts', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t, {
    '.gitignore': 'ignored/\n',
  });
  const script = [
    "const fs=require('node:fs');",
    "fs.rmSync('.git',{recursive:true,force:true});",
    "fs.mkdirSync('ignored',{recursive:true});",
    "fs.writeFileSync('ignored/result.txt','ignored artifact\\n');",
    "fs.writeFileSync('visible.txt','visible artifact\\n');",
  ].join('');
  const result = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'git.metadata.and.ignored',
    script,
  }));
  assert.equal(result.receipt.workspace.capture_complete, true);
  const patch = fs.readFileSync(evidenceFile(result, 'diff.patch'), 'utf8');
  assert.match(patch, /ignored\/result\.txt/);
  assert.match(patch, /ignored artifact/);
  assert.match(patch, /visible\.txt/);
});

test('nested Git metadata is excluded while nested artifacts stay in the complete diff', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t);
  const script = [
    "const fs=require('node:fs');",
    "const {spawnSync}=require('node:child_process');",
    "fs.mkdirSync('nested-repo');",
    "spawnSync('git',['init','-q'],{cwd:'nested-repo'});",
    "fs.writeFileSync('nested-repo/result.txt','nested artifact\\n');",
    "spawnSync('git',['add','result.txt'],{cwd:'nested-repo'});",
    "spawnSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','nested'],{cwd:'nested-repo'});",
  ].join('');
  const result = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'git.nested',
    script,
  }));
  const patch = fs.readFileSync(evidenceFile(result, 'diff.patch'), 'utf8');
  assert.match(patch, /nested-repo\/result\.txt/);
  assert.match(patch, /nested artifact/);
  assert.doesNotMatch(patch, /Subproject commit/);
});

test('source Git replacement refs and executable fsmonitor config cannot change runner facts', async (t) => {
  const fsmonitorFixture = createSource(t);
  const marker = path.join(fsmonitorFixture.sourceDir, '.git', 'fsmonitor-ran');
  const hook = path.join(fsmonitorFixture.tempRoot, 'fsmonitor-hook');
  fs.writeFileSync(
    hook,
    `#!/bin/sh\ntouch ${JSON.stringify(marker)}\nprintf 'token\\n'\n`,
    { mode: 0o700 },
  );
  git(fsmonitorFixture.sourceDir, ['config', 'core.fsmonitor', hook]);
  await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir: fsmonitorFixture.sourceDir,
    evidenceRoot: fsmonitorFixture.evidenceRoot,
    attemptId: 'git.fsmonitor',
    script: '',
  }));
  assert.equal(fs.existsSync(marker), false);

  const replaceFixture = createSource(t);
  const beforeRevision = git(replaceFixture.sourceDir, ['rev-parse', 'HEAD']).trim();
  fs.writeFileSync(path.join(replaceFixture.sourceDir, 'keep.txt'), 'replacement view\n');
  git(replaceFixture.sourceDir, ['add', 'keep.txt']);
  git(replaceFixture.sourceDir, ['commit', '-qm', 'replacement commit']);
  const replacementRevision = git(replaceFixture.sourceDir, ['rev-parse', 'HEAD']).trim();
  git(replaceFixture.sourceDir, ['replace', beforeRevision, replacementRevision]);
  git(replaceFixture.sourceDir, ['reset', '--hard', beforeRevision]);
  assert.equal(git(replaceFixture.sourceDir, ['status', '--porcelain=v1']), '');
  await assert.rejects(
    runIsolatedEffectivenessAttempt(attemptSpec({
      sourceDir: replaceFixture.sourceDir,
      evidenceRoot: replaceFixture.evidenceRoot,
      attemptId: 'git.replace-ref',
      script: '',
    })),
    (error) => error instanceof EffectivenessRunnerError && error.code === 'dirty_source',
  );
});

test('artifact manifest records empty directories even though Git diff cannot', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t);
  const result = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'empty.directory',
    script: "require('node:fs').mkdirSync('empty-output')",
  }));
  const summary = JSON.parse(fs.readFileSync(evidenceFile(result, 'artifacts.json'), 'utf8'));
  assert.ok(summary.changes.some((change) =>
    change.path === 'empty-output' && change.change === 'added'));
  assert.equal(result.receipt.workspace.changed_artifacts, 1);
});

test('process, infrastructure, and resource-limit failures remain distinct from task claims', async (t) => {
  const { tempRoot, sourceDir, evidenceRoot } = createSource(t);
  const processFailure = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'process.error',
    script: 'process.exit(7)',
    terminal: true,
  }));
  assert.equal(processFailure.receipt.execution.termination, 'process_error');
  assert.equal(processFailure.receipt.command.exit_code, 7);

  const infrastructureFailure = await runIsolatedEffectivenessAttempt({
    ...attemptSpec({
      sourceDir,
      evidenceRoot,
      attemptId: 'infrastructure.error',
      script: '',
      terminal: true,
    }),
    command: {
      file: path.join(tempRoot, 'missing-executable'),
      args: [],
      env: {},
      definitionDigest: digest('missing fixture executable'),
    },
  });
  assert.equal(infrastructureFailure.receipt.execution.termination, 'infrastructure_error');
  assert.equal(infrastructureFailure.receipt.command.exit_code, null);
  assert.equal(infrastructureFailure.receipt.execution.detail, 'spawn_failed');

  const limited = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'output.limit',
    script: "process.stdout.write('x'.repeat(100000));setInterval(()=>{},1000)",
    limits: { maxStdoutBytes: 32, timeoutMs: 2_000 },
    terminal: true,
  }));
  assert.equal(limited.receipt.execution.termination, 'cancelled');
  assert.equal(limited.receipt.execution.detail, 'stdout_limit_exceeded');
  assert.equal(limited.receipt.command.stdout.retained_bytes, 32);
  assert.equal(limited.receipt.command.stdout.truncated, true);

  const outside = path.join(tempRoot, 'outside-after-run.txt');
  fs.writeFileSync(outside, 'outside\n');
  const captureFailure = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'capture.error',
    script: "require('node:fs').symlinkSync(process.env.OUTSIDE, 'escape-link')",
    env: { OUTSIDE: outside },
    terminal: true,
  }));
  assert.equal(captureFailure.receipt.command.exit_code, 0);
  assert.equal(captureFailure.receipt.execution.termination, 'infrastructure_error');
  assert.equal(captureFailure.receipt.execution.detail, 'external_symlink');
  assert.equal(captureFailure.receipt.workspace.capture_complete, false);
  assert.equal(captureFailure.receipt.artifacts.diff, null);
  assert.equal(captureFailure.report.experiment.workspace.final_snapshot_digest, undefined);
  const commandEvent = captureFailure.report.events.find((event) =>
    event.id.endsWith('.runner-command'));
  const workspaceEvent = captureFailure.report.events.find((event) =>
    event.id.endsWith('.runner-workspace'));
  assert.equal(commandEvent.status, 'succeeded');
  assert.equal(workspaceEvent.status, 'failed');

  for (const result of [processFailure, infrastructureFailure, limited, captureFailure]) {
    assert.deepEqual(
      parseEffectivenessReport(result.report, { rootDir: root, experimentPlan }),
      result.report,
    );
  }
});

test('post-launch source guard failure still produces an infrastructure receipt and report', async (t) => {
  const { tempRoot, sourceDir, evidenceRoot } = createSource(t);
  const started = path.join(tempRoot, 'command-started');
  const gitDir = path.join(sourceDir, '.git');
  const hiddenGitDir = path.join(sourceDir, '.git-hidden');
  const attempt = runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'source.guard.failure',
    script: [
      "require('node:fs').writeFileSync(process.env.STARTED,'yes');",
      'setTimeout(()=>process.exit(0),200);',
    ].join(''),
    env: { STARTED: started },
    terminal: true,
  }));
  while (!fs.existsSync(started)) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  fs.renameSync(gitDir, hiddenGitDir);
  let result;
  try {
    result = await attempt;
  } finally {
    fs.renameSync(hiddenGitDir, gitDir);
  }

  assert.equal(result.receipt.execution.termination, 'infrastructure_error');
  assert.equal(result.receipt.execution.detail, 'source_guard_failed');
  assert.equal(result.receipt.source_guard.after, null);
  assert.equal(result.receipt.source_guard.unchanged, false);
  assert.equal(result.report.execution.termination, 'infrastructure_error');
  const workspaceEvent = result.report.events.find((event) =>
    event.id.endsWith('.runner-workspace'));
  assert.equal(workspaceEvent.status, 'failed');
  assert.match(workspaceEvent.summary, /Captured the complete final workspace delta/);
  assert.notEqual(result.report.experiment.workspace.final_snapshot_digest, undefined);
  assert.notEqual(result.report.experiment.workspace.diff_ref, undefined);
  assert.equal(fs.existsSync(path.join(result.evidenceDir, 'receipt.json')), true);
  assert.equal(fs.existsSync(path.join(result.evidenceDir, 'report.json')), true);
});

test('a source change during report adaptation updates raw facts and publishes an infra terminal', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t);
  const attemptId = 'source.guard.adapter-change';
  const spec = attemptSpec({ sourceDir, evidenceRoot, attemptId, script: '' });
  spec.buildReportInput = () => {
    fs.writeFileSync(path.join(sourceDir, 'adapter-change.txt'), 'changed outside capsule\n');
    return baseReportInput();
  };

  const result = await runIsolatedEffectivenessAttempt(spec);
  assert.equal(result.receipt.execution.termination, 'infrastructure_error');
  assert.equal(
    result.receipt.execution.detail,
    'source_repository_changed_during_report_adaptation',
  );
  assert.equal(result.receipt.source_guard.unchanged, false);
  assert.equal(
    result.receipt.source_guard.error.code,
    'source_repository_changed_during_report_adaptation',
  );
  assert.equal(result.report.execution.termination, 'infrastructure_error');
  assert.equal(result.report.final_result.submission_status, 'no_output');

  const evidenceDir = path.join(evidenceRoot, attemptId);
  for (const name of ['receipt.json', 'attempt.json']) {
    const document = JSON.parse(fs.readFileSync(path.join(evidenceDir, name), 'utf8'));
    assert.equal(document.source_guard.unchanged, false, name);
    assert.equal(
      document.execution.detail,
      'source_repository_changed_during_report_adaptation',
      name,
    );
  }
  assert.equal(fs.existsSync(path.join(evidenceDir, 'report.json')), true);
});

test('source guard detects ignored worktree changes without destructively restoring them', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t, {
    '.gitignore': 'ignored-cache.txt\n',
  });
  const ignoredPath = path.join(sourceDir, 'ignored-cache.txt');
  const before = sourceState(sourceDir);
  const spec = attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'source.guard.ignored-change',
    script: '',
  });
  spec.buildReportInput = () => {
    fs.writeFileSync(ignoredPath, 'external ignored change\n');
    return baseReportInput();
  };

  let result;
  try {
    result = await runIsolatedEffectivenessAttempt(spec);
    assert.equal(fs.existsSync(ignoredPath), true);
  } finally {
    fs.rmSync(ignoredPath, { force: true });
  }
  assert.equal(result.receipt.execution.termination, 'infrastructure_error');
  assert.equal(result.receipt.source_guard.unchanged, false);
  assert.notEqual(
    result.receipt.source_guard.before,
    result.receipt.source_guard.after,
  );
  assert.deepEqual(sourceState(sourceDir), before);
});

test('runner identity, event namespace, and acquisition source are adapter-inaccessible', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t);
  for (const [suffix, mutate] of [
    ['actor', (input) => input.events.push({
      id: 'forged-runner-event',
      sequence: 99,
      type: 'observation',
      actor: 'runner',
      observed_at: '2026-07-14T00:00:00.000Z',
      status: 'succeeded',
      summary: 'forged runner observation',
    })],
    ['producer', (input) => {
      input.evidence[0].producer_ref = 'runner:forge-effectiveness-runner@1';
    }],
    ['cost', (input) => {
      input.costs[0].acquisition.kind = 'runner';
    }],
    ['verifier', (input) => {
      input.events.push({
        id: 'forged-verifier-event',
        sequence: 100,
        type: 'observation',
        actor: 'verifier',
        observed_at: '2026-07-14T00:00:00.000Z',
        status: 'succeeded',
        summary: 'premature verifier result',
      });
      input.evidence.push({
        id: 'forged-verifier-evidence',
        source_kind: 'independent_verifier',
        locator: 'forged-verifier.json',
        digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        producer_ref: 'verifier:premature',
        event_id: 'forged-verifier-event',
        objective_ref: input.experiment.objective.id,
      });
      input.final_result.verifier_result_refs = ['forged-verifier-evidence'];
    }],
  ]) {
    const spec = attemptSpec({
      sourceDir,
      evidenceRoot,
      attemptId: `ownership.${suffix}`,
      script: '',
    });
    spec.buildReportInput = () => {
      const input = baseReportInput();
      input.costs[0].acquisition.kind = 'tool';
      mutate(input);
      return input;
    };
    await assert.rejects(
      runIsolatedEffectivenessAttempt(spec),
      (error) => error instanceof EffectivenessRunnerError && error.code === 'report_rejected',
    );
  }
});

test('adapter mutation of retained runner evidence rejects formal report publication', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t);
  const attemptId = 'evidence.tamper';
  const spec = attemptSpec({ sourceDir, evidenceRoot, attemptId, script: '' });
  spec.buildReportInput = () => {
    fs.writeFileSync(path.join(evidenceRoot, attemptId, 'command.json'), '{"tampered":true}\n');
    const input = baseReportInput();
    input.costs[0].acquisition.kind = 'tool';
    return input;
  };

  await assert.rejects(
    runIsolatedEffectivenessAttempt(spec),
    (error) => error instanceof EffectivenessRunnerError && error.code === 'report_rejected',
  );
  assert.equal(fs.existsSync(path.join(evidenceRoot, attemptId, 'report.json')), false);
});

test('retained runner evidence must remain regular files inside the evidence directory', async (t) => {
  const { tempRoot, sourceDir, evidenceRoot } = createSource(t);
  const attemptId = 'evidence.symlink-tamper';
  const outside = path.join(tempRoot, 'outside-command.json');
  const spec = attemptSpec({ sourceDir, evidenceRoot, attemptId, script: '' });
  spec.buildReportInput = () => {
    const commandPath = path.join(evidenceRoot, attemptId, 'command.json');
    fs.copyFileSync(commandPath, outside);
    fs.rmSync(commandPath);
    fs.symlinkSync(outside, commandPath);
    return baseReportInput();
  };

  await assert.rejects(
    runIsolatedEffectivenessAttempt(spec),
    (error) => error instanceof EffectivenessRunnerError && error.code === 'report_rejected',
  );
  assert.equal(fs.existsSync(path.join(evidenceRoot, attemptId, 'report.json')), false);
});

test('report rejection preserves raw receipt but never publishes a formal report', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t);
  const spec = attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'report.rejected',
    script: '',
  });
  spec.buildReportInput = () => ({ broken: true });

  await assert.rejects(
    runIsolatedEffectivenessAttempt(spec),
    (error) =>
      error instanceof EffectivenessRunnerError &&
      error.code === 'report_rejected' &&
      error.receipt?.execution?.termination === 'completed',
  );
  const evidenceDir = path.join(evidenceRoot, 'report.rejected');
  assert.equal(fs.existsSync(path.join(evidenceDir, 'receipt.json')), true);
  assert.equal(fs.existsSync(path.join(evidenceDir, 'report.json')), false);
  assert.equal(
    fs.readdirSync(evidenceDir).some((name) => name.includes('report') && name.endsWith('.tmp')),
    false,
  );
});

test('cleanup failure preserves the capsule path even when report construction is rejected', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t);
  const attemptId = 'cleanup.report-rejected';
  const spec = attemptSpec({ sourceDir, evidenceRoot, attemptId, script: '' });
  spec.buildReportInput = () => ({ broken: true });
  const originalRmSync = fs.rmSync;
  let capsulePath = null;
  fs.rmSync = (target, options) => {
    if (
      typeof target === 'string' &&
      path.basename(target).startsWith('forge-effectiveness-attempt-') &&
      options?.recursive === true
    ) {
      capsulePath = target;
      const error = new Error('simulated cleanup failure');
      error.code = 'EACCES';
      throw error;
    }
    return originalRmSync(target, options);
  };

  try {
    await assert.rejects(
      runIsolatedEffectivenessAttempt(spec),
      (error) =>
        error instanceof EffectivenessRunnerError &&
        error.code === 'report_rejected' &&
        error.receipt?.execution?.detail === 'cleanup_failed' &&
        error.receipt?.cleanup?.capsule_removed === false &&
        error.receipt?.cleanup?.capsule_path === capsulePath,
    );
    assert.equal(fs.existsSync(capsulePath), true);
    const evidenceDir = path.join(evidenceRoot, attemptId);
    for (const name of ['receipt.json', 'attempt.json']) {
      const document = JSON.parse(fs.readFileSync(path.join(evidenceDir, name), 'utf8'));
      assert.equal(document.cleanup.capsule_path, capsulePath, name);
    }
    assert.equal(fs.existsSync(path.join(evidenceDir, 'report.json')), false);
  } finally {
    fs.rmSync = originalRmSync;
    if (capsulePath !== null) {
      originalRmSync(capsulePath, { recursive: true, force: true });
    }
  }
});

test('configured credentials already present in the source never produce retained snapshot facts', async (t) => {
  const secret = 'sk-source-secret-123456789';
  const { sourceDir, evidenceRoot } = createSource(t, {
    'credential-fixture.txt': `${secret}\n`,
  });
  const attemptId = 'credential.initial-workspace';

  await assert.rejects(
    runIsolatedEffectivenessAttempt(attemptSpec({
      sourceDir,
      evidenceRoot,
      attemptId,
      script: '',
      env: { OPENAI_API_KEY: secret },
    })),
    (error) =>
      error instanceof EffectivenessRunnerError &&
      error.code === 'credential_material_detected' &&
      error.stage === 'preflight',
  );
  assert.equal(fs.existsSync(path.join(evidenceRoot, attemptId)), false);
});

test('credential material is never promoted from temporary process output', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t);
  const secret = 'sk-fixture-secret-123456789';
  const result = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'credential.output',
    script: 'process.stdout.write(process.env.OPENAI_API_KEY)',
    env: { OPENAI_API_KEY: secret },
    terminal: true,
  }));

  assert.equal(result.receipt.command.exit_code, 0);
  assert.equal(result.receipt.execution.termination, 'infrastructure_error');
  assert.equal(result.receipt.execution.detail, 'credential_material_detected');
  assert.equal(result.receipt.command.stdout.retention, 'rejected_credential_material');
  assert.equal(result.receipt.command.stdout.observed_digest, null);
  assert.equal(result.receipt.artifacts.stdout, null);
  for (const name of fs.readdirSync(result.evidenceDir)) {
    const filePath = path.join(result.evidenceDir, name);
    if (fs.statSync(filePath).isFile()) {
      assert.equal(fs.readFileSync(filePath).includes(secret), false, name);
    }
  }
  assert.deepEqual(
    parseEffectivenessReport(result.report, { rootDir: root, experimentPlan }),
    result.report,
  );
});

test('truncated output with configured credentials retains no credential prefix', async (t) => {
  const { sourceDir, evidenceRoot } = createSource(t);
  const secret = 'sk-fixture-secret-123456789';
  const result = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir,
    evidenceRoot,
    attemptId: 'credential.truncated-prefix',
    script: "process.stdout.write('prefix-' + process.env.OPENAI_API_KEY)",
    env: { OPENAI_API_KEY: secret },
    limits: { maxStdoutBytes: 13 },
    terminal: true,
  }));
  assert.equal(result.receipt.execution.termination, 'infrastructure_error');
  assert.equal(result.receipt.execution.detail, 'credential_material_unverifiable');
  assert.equal(result.receipt.artifacts.stdout, null);
  assert.equal(result.receipt.command.stdout.observed_digest, null);
  for (const name of fs.readdirSync(result.evidenceDir)) {
    const filePath = path.join(result.evidenceDir, name);
    if (fs.statSync(filePath).isFile()) {
      assert.equal(fs.readFileSync(filePath).includes('sk-fix'), false, name);
    }
  }
});

test('short credentials and credentials written into workspace never enter retained evidence', async (t) => {
  const shortFixture = createSource(t);
  const shortSecret = 'hunter2';
  const short = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir: shortFixture.sourceDir,
    evidenceRoot: shortFixture.evidenceRoot,
    attemptId: 'credential.short',
    script: 'process.stdout.write(process.env.PASSWORD)',
    env: { PASSWORD: shortSecret },
    terminal: true,
  }));
  assert.equal(short.receipt.execution.detail, 'credential_material_detected');
  assert.equal(short.receipt.artifacts.stdout, null);

  const workspaceFixture = createSource(t);
  const workspaceSecret = 'sk-workspace-secret-123456789';
  const workspace = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir: workspaceFixture.sourceDir,
    evidenceRoot: workspaceFixture.evidenceRoot,
    attemptId: 'credential.workspace',
    script: "require('node:fs').writeFileSync('leak.txt', process.env.OPENAI_API_KEY)",
    env: { OPENAI_API_KEY: workspaceSecret },
    terminal: true,
  }));
  assert.equal(workspace.receipt.execution.detail, 'credential_material_detected');
  assert.equal(workspace.receipt.artifacts.diff, null);
  for (const name of fs.readdirSync(workspace.evidenceDir)) {
    const filePath = path.join(workspace.evidenceDir, name);
    if (fs.statSync(filePath).isFile()) {
      assert.equal(fs.readFileSync(filePath).includes(workspaceSecret), false, name);
    }
  }

  const binaryFixture = createSource(t);
  const binarySecret = 'sk-binary-secret-123456789';
  const binary = await runIsolatedEffectivenessAttempt(attemptSpec({
    sourceDir: binaryFixture.sourceDir,
    evidenceRoot: binaryFixture.evidenceRoot,
    attemptId: 'credential.binary-workspace',
    script: [
      "const fs=require('node:fs');",
      "fs.writeFileSync('binary-leak.bin',Buffer.concat([Buffer.from([0]),Buffer.from(process.env.OPENAI_API_KEY)]));",
    ].join(''),
    env: { OPENAI_API_KEY: binarySecret },
    terminal: true,
  }));
  assert.equal(binary.receipt.execution.detail, 'credential_material_detected');
  assert.equal(binary.receipt.artifacts.diff, null);
});
