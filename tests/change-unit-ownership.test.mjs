import assert from 'node:assert/strict';
import test from 'node:test';

import { decideChangeUnitOwnership } from '../scripts/lib/change-unit-ownership.mjs';

const baseReceipt = [
  'changed_files',
  'decisions',
  'risks',
  'verification_evidence',
  'unresolved_items',
  'recommended_next_action',
];

test('direct and standalone mutation are written once by the current Chain Owner', () => {
  for (const mode of ['direct', 'standalone']) {
    assert.deepEqual(
      decideChangeUnitOwnership({ mode, retainedMutation: true, outcome: 'completed' }),
      {
        currentWrites: true,
        writer: 'chain_owner',
        expectedChangeUnits: 1,
        receiptFields: baseReceipt,
      },
    );
  }
});

test('child mutation delegates one consolidated Change Unit to the Chain Owner', () => {
  assert.deepEqual(
    decideChangeUnitOwnership({ mode: 'child', retainedMutation: true, outcome: 'completed' }),
    {
      currentWrites: false,
      writer: 'chain_owner',
      expectedChangeUnits: 1,
      receiptFields: baseReceipt,
    },
  );
});

test('pre-mutation blocks and fully rolled-back changes write no Change Unit', () => {
  for (const mode of ['direct', 'standalone', 'child']) {
    assert.deepEqual(
      decideChangeUnitOwnership({ mode, retainedMutation: false, outcome: 'blocked' }),
      {
        currentWrites: false,
        writer: null,
        expectedChangeUnits: 0,
        receiptFields: [],
      },
    );
  }
});

test('partial and blocked retained mutation preserve recovery evidence for one owner', () => {
  for (const outcome of ['partial', 'blocked']) {
    for (const mode of ['direct', 'standalone', 'child']) {
      const decision = decideChangeUnitOwnership({ mode, retainedMutation: true, outcome });

      assert.equal(decision.writer, 'chain_owner');
      assert.equal(decision.currentWrites, mode !== 'child');
      assert.equal(decision.expectedChangeUnits, 1);
      assert.deepEqual(decision.receiptFields, [
        ...baseReceipt,
        'partial_changes',
        'unverified_items',
        'rollback',
      ]);
    }
  }
});

test('ownership policy rejects unknown modes, outcomes, and mutation flags', () => {
  assert.throws(
    () => decideChangeUnitOwnership({ mode: 'stage', retainedMutation: true, outcome: 'completed' }),
    /mode must be direct, standalone, or child/,
  );
  assert.throws(
    () => decideChangeUnitOwnership({ mode: 'direct', retainedMutation: true, outcome: 'paused' }),
    /outcome must be completed, partial, or blocked/,
  );
  assert.throws(
    () => decideChangeUnitOwnership({ mode: 'direct', retainedMutation: 'yes', outcome: 'completed' }),
    /retainedMutation must be boolean/,
  );
});
