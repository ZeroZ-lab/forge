import assert from 'node:assert/strict';
import test from 'node:test';

import { decideChangeUnitOwnership } from '../scripts/lib/change-unit-ownership.mjs';

test('standalone mutation owns exactly one Change Unit', () => {
  assert.deepEqual(
    decideChangeUnitOwnership({ mode: 'standalone', mutation: true, outcome: 'completed' }),
    {
      currentWrites: true,
      writer: 'current',
      expectedChangeUnits: 1,
      receiptFields: ['changed_files', 'decisions', 'risks', 'verification_evidence'],
    },
  );
});

test('child mutation delegates one consolidated Change Unit to its orchestrator', () => {
  assert.deepEqual(
    decideChangeUnitOwnership({ mode: 'child', mutation: true, outcome: 'completed' }),
    {
      currentWrites: false,
      writer: 'orchestrator',
      expectedChangeUnits: 1,
      receiptFields: ['changed_files', 'decisions', 'risks', 'verification_evidence'],
    },
  );
});

test('a pre-mutation block writes no Change Unit', () => {
  assert.deepEqual(
    decideChangeUnitOwnership({ mode: 'standalone', mutation: false, outcome: 'blocked' }),
    {
      currentWrites: false,
      writer: null,
      expectedChangeUnits: 0,
      receiptFields: [],
    },
  );
});

test('a post-mutation block preserves partial evidence for the single owner', () => {
  for (const [mode, writer, currentWrites] of [
    ['standalone', 'current', true],
    ['child', 'orchestrator', false],
  ]) {
    const decision = decideChangeUnitOwnership({ mode, mutation: true, outcome: 'blocked' });

    assert.equal(decision.writer, writer);
    assert.equal(decision.currentWrites, currentWrites);
    assert.equal(decision.expectedChangeUnits, 1);
    assert.deepEqual(decision.receiptFields, [
      'changed_files',
      'decisions',
      'risks',
      'verification_evidence',
      'partial_changes',
      'unverified_items',
      'rollback',
    ]);
  }
});

test('ownership policy rejects unknown modes and outcomes', () => {
  assert.throws(
    () => decideChangeUnitOwnership({ mode: 'stage', mutation: true, outcome: 'completed' }),
    /mode must be standalone or child/,
  );
  assert.throws(
    () => decideChangeUnitOwnership({ mode: 'standalone', mutation: true, outcome: 'paused' }),
    /outcome must be completed or blocked/,
  );
});
