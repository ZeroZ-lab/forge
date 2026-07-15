import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createCommandVerifierAdapter,
  createDiffVerifierAdapter,
  createEffectivenessVerifierRuntime,
  createHiddenAssertionVerifierAdapter,
  parseEffectivenessVerifierResult,
  runEffectivenessVerifierSet,
} from '../scripts/lib/effectiveness-verifier.mjs';

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-effectiveness-verifier-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const workspaceDir = path.join(root, 'workspace');
  const evidenceDir = path.join(root, 'evidence');
  fs.mkdirSync(workspaceDir);
  fs.mkdirSync(evidenceDir);
  fs.writeFileSync(path.join(workspaceDir, 'result.txt'), 'ready\n');
  return {
    workspaceDir,
    evidenceDir,
    target: {
      attempt_id: 'attempt-1',
      objective_ref: 'objective-1',
      objective_digest: digest('objective-1'),
      workspace: {
        isolation_id: 'isolation-1',
        base_snapshot_digest: digest('workspace-base'),
        final_snapshot_digest: digest('workspace-final'),
        diff_ref: 'diff.patch',
        diff_digest: digest('diff.patch'),
      },
    },
  };
}

function commandAdapter(id, exitCode, purpose = 'test') {
  const script = `process.stdout.write('checked\\n');process.exit(${exitCode})`;
  return createCommandVerifierAdapter({
    id,
    purpose,
    scope: { kind: 'workspace', paths: ['result.txt'] },
    command: {
      file: process.execPath,
      args: ['-e', script],
      env: {},
    },
  });
}

function commandObservation(adapter, workspaceDir, limits) {
  const execution = spawnSync(adapter.command.file, adapter.command.args, {
    cwd: workspaceDir,
    env: { ...process.env, ...adapter.command.env },
    encoding: null,
    timeout: limits.timeoutMs,
    maxBuffer: limits.maxOutputBytes,
  });
  return {
    kind: 'command',
    status: execution.error?.code === 'ENOENT'
      ? 'command_not_found'
      : execution.error?.code === 'ETIMEDOUT'
        ? 'timeout'
        : execution.error?.code === 'ENOBUFS'
          ? 'output_limit'
          : execution.error
            ? 'infrastructure_error'
            : 'completed',
    exit_code: Number.isInteger(execution.status) ? execution.status : null,
    signal: execution.signal ?? null,
    stdout_digest: digest(Buffer.isBuffer(execution.stdout) ? execution.stdout : Buffer.alloc(0)),
    stderr_digest: digest(Buffer.isBuffer(execution.stderr) ? execution.stderr : Buffer.alloc(0)),
  };
}

function runtime(adapters, behavior = {}) {
  return createEffectivenessVerifierRuntime({
    id: 'fixture-verifiers',
    executor: {
      id: 'fixture-verifier-host',
      version: '1',
      definition: {
        boundary: 'test-double',
        guarantees: ['timeout', 'output-bound', 'workspace-isolation'],
      },
      async execute({ adapter, workspaceDir, target, limits }) {
        if (behavior[adapter.id]) return behavior[adapter.id]({ workspaceDir, target, limits });
        return commandObservation(adapter, workspaceDir, limits);
      },
    },
    adapters,
  });
}

test('external command host distinguishes pass, task failure, missing command, and infrastructure failure', async (t) => {
  const value = fixture(t);
  const missing = createCommandVerifierAdapter({
    id: 'missing-tool',
    purpose: 'build',
    scope: { kind: 'workspace', paths: ['package.json'] },
    command: {
      file: `forge-missing-verifier-${crypto.randomUUID()}`,
      args: [],
      env: {},
    },
  });
  const timeout = createCommandVerifierAdapter({
    id: 'typecheck-timeout',
    purpose: 'typecheck',
    scope: { kind: 'workspace', paths: ['src/'] },
    command: {
      file: process.execPath,
      args: ['-e', 'setTimeout(() => {}, 10000)'],
      env: {},
    },
  });
  const verifierRuntime = runtime([
    commandAdapter('tests-pass', 0),
    commandAdapter('tests-fail', 2),
    commandAdapter('build-pass', 0, 'build'),
    commandAdapter('typecheck-fail', 3, 'typecheck'),
    missing,
    timeout,
  ]);

  const run = await runEffectivenessVerifierSet({
    ...value,
    runtime: verifierRuntime,
    limits: { timeoutMs: 1_000, maxOutputBytes: 64 * 1024 },
  });

  assert.equal(run.verifier_set.digest, verifierRuntime.verifierSet.digest);
  assert.deepEqual(
    run.results.map(({ result }) => [result.verifier.id, result.outcome, result.reason_code]),
    [
      ['tests-pass', 'passed', 'command_passed'],
      ['tests-fail', 'task_failed', 'command_failed'],
      ['build-pass', 'passed', 'command_passed'],
      ['typecheck-fail', 'task_failed', 'command_failed'],
      ['missing-tool', 'unavailable', 'command_not_found'],
      ['typecheck-timeout', 'infrastructure_error', 'verifier_timeout'],
    ],
  );
  for (const entry of run.results) {
    assert.equal(entry.result.independence_level, 'independent_verifier');
    assert.deepEqual(entry.result.target, value.target);
    assert.equal(entry.result.evidence_refs.length, 1);
    for (const reference of [entry.observation_reference, entry.reference]) {
      const retained = fs.readFileSync(path.join(value.evidenceDir, reference.ref));
      assert.equal(retained.length, reference.bytes);
      assert.equal(digest(retained), reference.digest);
    }
    assert.deepEqual(
      parseEffectivenessVerifierResult(JSON.stringify(entry.result), {
        runtime: verifierRuntime,
        target: value.target,
      }),
      entry.result,
    );
  }

  const promoted = structuredClone(run.results[0].result);
  promoted.independence_level = 'model_self_report';
  assert.throws(
    () => parseEffectivenessVerifierResult(promoted, {
      runtime: verifierRuntime,
      target: value.target,
    }),
    /independence_level/,
  );
  const mismatchedPurpose = structuredClone(run.results[0].result);
  mismatchedPurpose.verifier.purpose = 'hidden_assertion';
  assert.throws(
    () => parseEffectivenessVerifierResult(mismatchedPurpose),
    /purpose/,
  );
  const missingObservation = structuredClone(run.results[0].result);
  missingObservation.evidence_refs[0].role = 'self_report';
  assert.throws(
    () => parseEffectivenessVerifierResult(missingObservation),
    /host_observation/,
  );
});

test('hidden assertions and diff checks retain only normalized host observations', async (t) => {
  const value = fixture(t);
  const hiddenFailure = 'hidden-oracle-secret-must-not-be-retained';
  const hidden = createHiddenAssertionVerifierAdapter({
    id: 'hidden-contract',
    scope: { kind: 'workspace', paths: ['result.txt'] },
    oracleRef: 'host-oracle://contract-v1',
    oracleDigest: digest('hidden-contract-definition'),
  });
  const brokenHidden = createHiddenAssertionVerifierAdapter({
    id: 'hidden-broken',
    scope: { kind: 'workspace', paths: ['result.txt'] },
    oracleRef: 'host-oracle://broken-v1',
    oracleDigest: digest('hidden-broken-definition'),
  });
  const passingHidden = createHiddenAssertionVerifierAdapter({
    id: 'hidden-pass',
    scope: { kind: 'workspace', paths: ['result.txt'] },
    oracleRef: 'host-oracle://passing-v1',
    oracleDigest: digest('hidden-passing-definition'),
  });
  const diff = createDiffVerifierAdapter({
    id: 'diff-contract',
    scope: { kind: 'diff', paths: ['result.txt'] },
    policy: { allowed_paths: ['result.txt'], required_paths: ['result.txt'] },
  });
  const failedDiff = createDiffVerifierAdapter({
    id: 'diff-fail',
    scope: { kind: 'diff', paths: ['result.txt'] },
    policy: { allowed_paths: [], required_paths: ['result.txt'] },
  });
  const brokenDiff = createDiffVerifierAdapter({
    id: 'diff-broken',
    scope: { kind: 'diff', paths: ['result.txt'] },
    policy: { allowed_paths: ['result.txt'] },
  });
  const verifierRuntime = runtime(
    [hidden, brokenHidden, passingHidden, diff, failedDiff, brokenDiff],
    {
    'hidden-contract': () => ({ kind: 'assertion', status: 'failed' }),
    'hidden-broken': () => { throw new Error(hiddenFailure); },
    'hidden-pass': () => ({ kind: 'assertion', status: 'passed' }),
    'diff-contract': ({ workspaceDir, target }) => {
      assert.equal(target.workspace.final_snapshot_digest, value.target.workspace.final_snapshot_digest);
      assert.equal(fs.readFileSync(path.join(workspaceDir, 'result.txt'), 'utf8'), 'ready\n');
      return { kind: 'diff', status: 'passed' };
    },
    'diff-fail': () => ({ kind: 'diff', status: 'failed' }),
    'diff-broken': () => ({ kind: 'diff', status: 'unexpected' }),
    },
  );

  const run = await runEffectivenessVerifierSet({
    ...value,
    runtime: verifierRuntime,
    limits: { timeoutMs: 2_000, maxOutputBytes: 64 * 1024 },
  });

  assert.deepEqual(
    run.results.map(({ result }) => [result.verifier.id, result.outcome, result.reason_code]),
    [
      ['hidden-contract', 'task_failed', 'assertion_failed'],
      ['hidden-broken', 'infrastructure_error', 'verifier_execution_failed'],
      ['hidden-pass', 'passed', 'assertion_passed'],
      ['diff-contract', 'passed', 'diff_passed'],
      ['diff-fail', 'task_failed', 'diff_failed'],
      ['diff-broken', 'infrastructure_error', 'verifier_execution_failed'],
    ],
  );
  assert.equal(
    fs.readdirSync(value.evidenceDir)
      .map((name) => fs.readFileSync(path.join(value.evidenceDir, name)))
      .some((content) => content.includes(hiddenFailure)),
    false,
  );
  assert.throws(
    () => createEffectivenessVerifierRuntime({
      id: 'promoted',
      executor: {
        id: 'fake',
        version: '1',
        definition: {
          guarantees: ['timeout', 'output-bound', 'workspace-isolation'],
        },
        async execute() { return { kind: 'diff', status: 'passed' }; },
      },
      adapters: [{ ...diff }],
    }),
    /trusted factory/,
  );
  assert.throws(
    () => createDiffVerifierAdapter({
      id: 'ambiguous-policy',
      scope: { kind: 'diff', paths: ['result.txt'] },
      policy: { allowed_paths: undefined },
    }),
    /JSON data/,
  );
});
