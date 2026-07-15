import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createCommandVerifierAdapter,
  createDiffVerifierAdapter,
  createHiddenAssertionVerifierAdapter,
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
        snapshot_digest: digest('workspace-1'),
      },
    },
    verifierSet: {
      id: 'fixture-verifiers',
      digest: digest('fixture-verifiers-v1'),
    },
  };
}

function commandAdapter(id, exitCode, extra = {}) {
  const script = `process.stdout.write('checked\\n');process.exit(${exitCode})`;
  return createCommandVerifierAdapter({
    id,
    purpose: 'test',
    definitionDigest: digest(`${id}-definition`),
    scope: { kind: 'workspace', paths: ['result.txt'] },
    command: {
      file: process.execPath,
      args: ['-e', script],
      env: {},
    },
    ...extra,
  });
}

test('command verifiers distinguish pass, task failure, and missing command with retained results', async (t) => {
  const value = fixture(t);
  const missing = createCommandVerifierAdapter({
    id: 'missing-tool',
    purpose: 'build',
    definitionDigest: digest('missing-tool-definition'),
    scope: { kind: 'workspace', paths: ['package.json'] },
    command: {
      file: `forge-missing-verifier-${crypto.randomUUID()}`,
      args: [],
      env: {},
    },
  });

  const run = await runEffectivenessVerifierSet({
    ...value,
    adapters: [commandAdapter('tests-pass', 0), commandAdapter('tests-fail', 2), missing],
    limits: { timeoutMs: 2_000, maxOutputBytes: 64 * 1024 },
  });

  assert.deepEqual(
    run.results.map(({ result }) => [result.verifier.id, result.outcome, result.reason_code]),
    [
      ['tests-pass', 'passed', 'command_passed'],
      ['tests-fail', 'task_failed', 'command_failed'],
      ['missing-tool', 'unavailable', 'command_not_found'],
    ],
  );
  for (const entry of run.results) {
    assert.equal(entry.result.independence_level, 'independent_verifier');
    assert.deepEqual(entry.result.target, value.target);
    assert.deepEqual(entry.result.verifier.scope, entry.result.scope);
    assert.match(entry.reference.ref, /^[a-z0-9-]+\.verifier-result\.json$/);
    const retained = fs.readFileSync(path.join(value.evidenceDir, entry.reference.ref));
    assert.equal(retained.length, entry.reference.bytes);
    assert.equal(digest(retained), entry.reference.digest);
    assert.deepEqual(JSON.parse(retained), entry.result);
  }
});

test('hidden assertions and diff checks stay independent without leaking hidden failures', async (t) => {
  const value = fixture(t);
  const hiddenFailure = 'hidden-oracle-secret-must-not-be-retained';
  const hidden = createHiddenAssertionVerifierAdapter({
    id: 'hidden-contract',
    definitionDigest: digest('hidden-contract-definition'),
    scope: { kind: 'workspace', paths: ['result.txt'] },
    verify(context) {
      assert.equal(context.target.workspace.snapshot_digest, value.target.workspace.snapshot_digest);
      return { passed: false, detail: hiddenFailure };
    },
  });
  const brokenHidden = createHiddenAssertionVerifierAdapter({
    id: 'hidden-broken',
    definitionDigest: digest('hidden-broken-definition'),
    scope: { kind: 'workspace', paths: ['result.txt'] },
    verify() {
      throw new Error(hiddenFailure);
    },
  });
  const diff = createDiffVerifierAdapter({
    id: 'diff-contract',
    definitionDigest: digest('diff-contract-definition'),
    scope: { kind: 'diff', paths: ['result.txt'] },
    verify(context) {
      assert.equal(fs.readFileSync(path.join(context.workspaceDir, 'result.txt'), 'utf8'), 'ready\n');
      return { passed: true };
    },
  });

  const run = await runEffectivenessVerifierSet({
    ...value,
    adapters: [hidden, brokenHidden, diff],
    limits: { timeoutMs: 2_000, maxOutputBytes: 64 * 1024 },
  });

  assert.deepEqual(
    run.results.map(({ result }) => [result.verifier.id, result.outcome, result.reason_code]),
    [
      ['hidden-contract', 'task_failed', 'assertion_failed'],
      ['hidden-broken', 'infrastructure_error', 'verifier_execution_failed'],
      ['diff-contract', 'passed', 'diff_passed'],
    ],
  );
  assert.equal(
    fs.readdirSync(value.evidenceDir)
      .map((name) => fs.readFileSync(path.join(value.evidenceDir, name)))
      .some((content) => content.includes(hiddenFailure)),
    false,
  );
  assert.throws(
    () => createDiffVerifierAdapter({
      id: 'promoted',
      definitionDigest: digest('promoted'),
      scope: { kind: 'diff', paths: ['result.txt'] },
      independenceLevel: 'independent_verifier',
      verify() { return { passed: true }; },
    }),
    /fields must be exactly/,
  );
  await assert.rejects(
    () => runEffectivenessVerifierSet({
      ...value,
      adapters: [{ ...diff }],
      limits: { timeoutMs: 2_000, maxOutputBytes: 64 * 1024 },
    }),
    /trusted factory/,
  );
});
