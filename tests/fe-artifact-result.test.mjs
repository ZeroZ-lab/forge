import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createFeArtifactReceipt } from '../scripts/lib/fe-artifact-result.mjs';

const root = new URL('..', import.meta.url);
const changedFiles = ['src/settings-page.tsx'];
const rollback = 'git restore -- src/settings-page.tsx';

test('fe-artifact keeps preview separate from an unverified implementation', () => {
  assert.deepEqual(createFeArtifactReceipt({
    changedFiles,
    preview: {
      status: 'available',
      evidence: 'http://127.0.0.1:3000/settings',
    },
    verifier: null,
    unverifiedItems: ['settings save behavior'],
    rollback,
  }), {
    result: 'implemented_unverified',
    changed_files: changedFiles,
    preview_status: 'available',
    preview_evidence: 'http://127.0.0.1:3000/settings',
    verifier: 'not_run',
    verification_target: 'not_run',
    verification_outcome: 'not_run',
    evidence: null,
    unverified_items: ['settings save behavior'],
    rollback,
  });
});

test('fe-artifact preserves failed verifier evidence without claiming completion', () => {
  const verifier = {
    outcome: 'failed',
    name: 'browser smoke',
    target: 'settings save flow',
    evidence: 'artifacts/browser-smoke.json#failure-1',
  };

  assert.deepEqual(createFeArtifactReceipt({
    changedFiles,
    verifier,
    unverifiedItems: ['settings save flow'],
    rollback,
  }), {
    result: 'verification_failed',
    changed_files: changedFiles,
    preview_status: 'not_run',
    preview_evidence: null,
    verifier: 'browser smoke',
    verification_target: 'settings save flow',
    verification_outcome: 'failed',
    evidence: 'artifacts/browser-smoke.json#failure-1',
    unverified_items: ['settings save flow'],
    rollback,
  });
});

test('fe-artifact only reports verified from a passing receipt, independent of preview', () => {
  const verifier = {
    outcome: 'passed',
    name: 'component test',
    target: 'settings form states',
    evidence: 'node --test tests/settings-form.test.mjs (4 passed)',
  };

  const receipt = createFeArtifactReceipt({
    changedFiles,
    preview: {
      status: 'unavailable',
      evidence: 'component package has no standalone preview surface',
    },
    verifier,
    unverifiedItems: [],
    rollback,
  });

  assert.deepEqual(receipt, {
    result: 'verified',
    changed_files: changedFiles,
    preview_status: 'unavailable',
    preview_evidence: 'component package has no standalone preview surface',
    verifier: 'component test',
    verification_target: 'settings form states',
    verification_outcome: 'passed',
    evidence: 'node --test tests/settings-form.test.mjs (4 passed)',
    unverified_items: [],
    rollback,
  });
  assert.equal('accepted' in receipt, false);
});

test('fe-artifact rejects unverifiable and unknown receipts', () => {
  for (const outcome of ['passed', 'failed']) {
    assert.throws(
      () => createFeArtifactReceipt({
        changedFiles,
        verifier: { outcome, name: 'browser', target: 'page', evidence: '' },
        unverifiedItems: outcome === 'failed' ? ['page'] : [],
        rollback,
      }),
      /verifier evidence must be a non-empty string/,
    );
  }
  assert.throws(
    () => createFeArtifactReceipt({
      changedFiles,
      verifier: { outcome: 'skipped', name: 'browser', target: 'page', evidence: 'none' },
      unverifiedItems: ['page'],
      rollback,
    }),
    /verifier outcome must be passed or failed/,
  );
  assert.throws(
    () => createFeArtifactReceipt({
      changedFiles: [],
      verifier: null,
      unverifiedItems: ['page'],
      rollback,
    }),
    /changedFiles must contain at least one path/,
  );
  assert.throws(
    () => createFeArtifactReceipt({
      changedFiles: new Array(1),
      verifier: null,
      unverifiedItems: ['page'],
      rollback,
    }),
    /changedFiles must be an array of non-empty strings/,
  );
  assert.throws(
    () => createFeArtifactReceipt({
      changedFiles,
      verifier: null,
      unverifiedItems: [],
      rollback,
    }),
    /unverifiedItems must identify remaining uncertainty/,
  );
  assert.throws(
    () => createFeArtifactReceipt({
      changedFiles,
      verifier: null,
      unverifiedItems: new Array(1),
      rollback,
    }),
    /unverifiedItems must be an array of non-empty strings/,
  );
  assert.throws(
    () => createFeArtifactReceipt({
      changedFiles,
      preview: { status: 'available', evidence: '' },
      verifier: null,
      unverifiedItems: ['page'],
      rollback,
    }),
    /preview evidence must be a non-empty string/,
  );
});

test('published fe-artifact protocol separates implementation, preview, verification, and acceptance', async () => {
  const skill = await readFile(
    new URL('plugins/forge/skills/fe-artifact/SKILL.md', root),
    'utf8',
  );
  const protocol = await readFile(
    new URL('plugins/forge/skills/fe-artifact/references/fe-artifact-protocol.md', root),
    'utf8',
  );

  assert.doesNotMatch(skill, /frontmatter\.signal_routes/);
  for (const result of ['implemented_unverified', 'verification_failed', 'verified']) {
    assert.match(skill, new RegExp(result));
  }
  assert.match(skill, /preview available[\s\S]*不是验证结论/i);
  assert.match(skill, /verified[\s\S]*实际 verifier[\s\S]*evidence/i);
  assert.match(skill, /accepted[\s\S]*fe-accept/i);
  assert.match(
    protocol,
    /result[\s\S]*changed_files[\s\S]*preview_status[\s\S]*preview_evidence[\s\S]*verifier[\s\S]*verification_target[\s\S]*verification_outcome[\s\S]*evidence[\s\S]*unverified_items[\s\S]*rollback/i,
  );
  assert.doesNotMatch(protocol, /\|\s*`accepted`\s*\|/i);
});
