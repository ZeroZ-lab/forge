const BASE_RECEIPT_FIELDS = [
  'changed_files',
  'decisions',
  'risks',
  'verification_evidence',
  'unresolved_items',
  'recommended_next_action',
];

const BLOCKED_MUTATION_FIELDS = [
  'partial_changes',
  'unverified_items',
  'rollback',
];

export function decideChangeUnitOwnership({ mode, retainedMutation, outcome }) {
  if (!['direct', 'standalone', 'child'].includes(mode)) {
    throw new Error('mode must be direct, standalone, or child');
  }
  if (!['completed', 'partial', 'blocked'].includes(outcome)) {
    throw new Error('outcome must be completed, partial, or blocked');
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

  const currentWrites = mode !== 'child';
  return {
    currentWrites,
    writer: 'chain_owner',
    expectedChangeUnits: 1,
    receiptFields: outcome === 'completed'
      ? [...BASE_RECEIPT_FIELDS]
      : [...BASE_RECEIPT_FIELDS, ...BLOCKED_MUTATION_FIELDS],
  };
}
