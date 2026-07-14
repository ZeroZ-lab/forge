const BASE_RECEIPT_FIELDS = [
  'changed_files',
  'decisions',
  'risks',
  'verification_evidence',
];

const BLOCKED_MUTATION_FIELDS = [
  'partial_changes',
  'unverified_items',
  'rollback',
];

export function decideChangeUnitOwnership({ mode, retainedMutation, outcome }) {
  if (mode !== 'standalone' && mode !== 'child') {
    throw new Error('mode must be standalone or child');
  }
  if (outcome !== 'completed' && outcome !== 'blocked') {
    throw new Error('outcome must be completed or blocked');
  }
  if (typeof retainedMutation !== 'boolean') {
    throw new Error('retainedMutation must be boolean');
  }

  if (!retainedMutation) {
    return {
      currentWrites: false,
      writer: null,
      expectedChangeUnits: 0,
      receiptFields: [],
    };
  }

  return {
    currentWrites: mode === 'standalone',
    writer: mode === 'standalone' ? 'current' : 'orchestrator',
    expectedChangeUnits: 1,
    receiptFields: outcome === 'blocked'
      ? [...BASE_RECEIPT_FIELDS, ...BLOCKED_MUTATION_FIELDS]
      : [...BASE_RECEIPT_FIELDS],
  };
}
