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
  parseEffectivenessVerifierObservation,
  parseEffectivenessVerifierResult,
  runEffectivenessVerifierSet,
} from '../scripts/lib/effectiveness-verifier.mjs';

const VERIFIER_HOST_GUARANTEES = [
  'cancellation', 'cpu-limit', 'disk-limit', 'memory-limit',
  'network-isolation', 'non-blocking-bridge', 'output-bound',
  'process-tree-cleanup', 'read-only-evidence', 'secret-isolation',
  'timeout', 'workspace-isolation',
];

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
  fs.writeFileSync(path.join(evidenceDir, 'diff.patch'), 'diff.patch');
  return {
    workspaceDir,
    evidenceDir,
    baseSnapshot: {
      path: workspaceDir,
      revision: 'fixture-base',
      digest: digest('workspace-base'),
    },
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
        guarantees: VERIFIER_HOST_GUARANTEES,
      },
      async execute({ adapter, workspaceDir, target, limits, artifacts }) {
        if (behavior[adapter.id]) {
          return behavior[adapter.id]({ workspaceDir, target, limits, artifacts });
        }
        return commandObservation(adapter, workspaceDir, limits);
      },
      async cancel({ runId }) {
        return { run_id: runId, status: 'cancelled' };
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
    limits: { timeoutMs: 1_000, maxOutputBytes: 64 * 1024, maxInputBytes: 64 * 1024 },
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
    assert.deepEqual(
      parseEffectivenessVerifierObservation(
        fs.readFileSync(path.join(value.evidenceDir, entry.observation_reference.ref)),
        { result: entry.result },
      ).target,
      value.target,
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
  const contradictoryObservation = JSON.parse(
    fs.readFileSync(path.join(value.evidenceDir, run.results[0].observation_reference.ref)),
  );
  contradictoryObservation.observation.exit_code = 2;
  assert.throws(
    () => parseEffectivenessVerifierObservation(contradictoryObservation, {
      result: run.results[0].result,
    }),
    /does not support/,
  );
  const impossibleCompletion = structuredClone(contradictoryObservation);
  impossibleCompletion.observation.exit_code = null;
  assert.throws(
    () => parseEffectivenessVerifierObservation(impossibleCompletion),
    /invariants/,
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
    limits: { timeoutMs: 2_000, maxOutputBytes: 64 * 1024, maxInputBytes: 64 * 1024 },
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
          guarantees: VERIFIER_HOST_GUARANTEES,
        },
        async execute() { return { kind: 'diff', status: 'passed' }; },
        async cancel({ runId }) { return { run_id: runId, status: 'cancelled' }; },
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
  assert.throws(
    () => createEffectivenessVerifierRuntime({
      id: 'missing-network-isolation',
      executor: {
        id: 'incomplete-host',
        version: '1',
        definition: {
          guarantees: VERIFIER_HOST_GUARANTEES.filter(
            (guarantee) => guarantee !== 'network-isolation',
          ),
        },
        async execute() { return { kind: 'diff', status: 'passed' }; },
        async cancel({ runId }) { return { run_id: runId, status: 'cancelled' }; },
      },
      adapters: [diff],
    }),
    /network-isolation/,
  );
});

test('the bridge deadline requires cancellation acknowledgement and settled execution', async (t) => {
  const value = fixture(t);
  const adapter = commandAdapter('supervised-timeout', 0);
  let cancellations = 0;
  const supervised = createEffectivenessVerifierRuntime({
    id: 'supervised-verifiers',
    executor: {
      id: 'supervised-host',
      version: '1',
      definition: { boundary: 'test-double', guarantees: VERIFIER_HOST_GUARANTEES },
      execute({ signal }) {
        return new Promise((resolve) => {
          signal.addEventListener('abort', () => resolve(commandObservation(
            adapter,
            value.workspaceDir,
            { timeoutMs: 1_000, maxOutputBytes: 64 * 1024 },
          )), { once: true });
        });
      },
      async cancel({ runId }) {
        cancellations += 1;
        return { run_id: runId, status: 'cancelled' };
      },
    },
    adapters: [adapter],
  });
  const run = await runEffectivenessVerifierSet({
    ...value,
    runtime: supervised,
    limits: { timeoutMs: 25, maxOutputBytes: 64 * 1024, maxInputBytes: 64 * 1024 },
  });
  assert.equal(cancellations, 1);
  assert.equal(run.results[0].result.reason_code, 'verifier_timeout');

  const unsafeValue = fixture(t);
  const unsafe = createEffectivenessVerifierRuntime({
    id: 'unsafe-verifiers',
    executor: {
      id: 'unsafe-host',
      version: '1',
      definition: { boundary: 'test-double', guarantees: VERIFIER_HOST_GUARANTEES },
      execute({ signal }) {
        return new Promise((resolve) => {
          signal.addEventListener('abort', () => resolve({
            kind: 'command',
            status: 'timeout',
            exit_code: null,
            signal: null,
            stdout_digest: digest(''),
            stderr_digest: digest(''),
          }), { once: true });
        });
      },
      async cancel() { return { status: 'unknown' }; },
    },
    adapters: [adapter],
  });
  await assert.rejects(
    () => runEffectivenessVerifierSet({
      ...unsafeValue,
      runtime: unsafe,
      limits: { timeoutMs: 25, maxOutputBytes: 64 * 1024, maxInputBytes: 64 * 1024 },
    }),
    (error) => error.code === 'host_cleanup_failed',
  );
});

test('the host cannot mutate the retained diff it was asked to verify', async (t) => {
  const value = fixture(t);
  const adapter = createDiffVerifierAdapter({
    id: 'immutable-diff',
    scope: { kind: 'diff', paths: ['result.txt'] },
    policy: { mode: 'captured-diff' },
  });
  const verifierRuntime = runtime([adapter], {
    'immutable-diff': ({ artifacts }) => {
      fs.appendFileSync(artifacts.captured_diff.path, '\nchanged');
      return { kind: 'diff', status: 'passed' };
    },
  });
  await assert.rejects(
    () => runEffectivenessVerifierSet({
      ...value,
      runtime: verifierRuntime,
      limits: { timeoutMs: 1_000, maxOutputBytes: 64 * 1024, maxInputBytes: 64 * 1024 },
    }),
    (error) => error.code === 'host_evidence_changed',
  );
});

test('the host cannot mutate the base snapshot handle', async (t) => {
  const value = fixture(t);
  const adapter = createDiffVerifierAdapter({
    id: 'immutable-base',
    scope: { kind: 'diff', paths: ['result.txt'] },
    policy: { mode: 'captured-diff' },
  });
  const verifierRuntime = runtime([adapter], {
    'immutable-base': ({ artifacts }) => {
      fs.appendFileSync(path.join(artifacts.base_snapshot.path, 'result.txt'), 'changed\n');
      return { kind: 'diff', status: 'passed' };
    },
  });
  await assert.rejects(
    () => runEffectivenessVerifierSet({
      ...value,
      runtime: verifierRuntime,
      limits: { timeoutMs: 1_000, maxOutputBytes: 64 * 1024, maxInputBytes: 64 * 1024 },
    }),
    (error) => error.code === 'host_evidence_changed',
  );
});

test('oversized combined observations fail before retained publication', async (t) => {
  const value = fixture(t);
  value.target.objective_ref = `objective-${'o'.repeat(600_000)}`;
  const adapter = createDiffVerifierAdapter({
    id: 'large-observation',
    scope: { kind: 'diff', paths: [`path-${'p'.repeat(600_000)}`] },
    policy: { mode: 'captured-diff' },
  });
  const verifierRuntime = runtime([adapter], {
    'large-observation': () => ({ kind: 'diff', status: 'passed' }),
  });
  await assert.rejects(
    () => runEffectivenessVerifierSet({
      ...value,
      runtime: verifierRuntime,
      limits: {
        timeoutMs: 1_000,
        maxOutputBytes: 64 * 1024,
        maxInputBytes: 64 * 1024,
      },
    }),
    /exceeds 1 MiB/,
  );
  assert.equal(
    fs.readdirSync(value.evidenceDir).some((name) => name.endsWith('.verifier-observation.json')),
    false,
  );
});
