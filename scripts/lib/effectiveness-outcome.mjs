import crypto from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const REQUIREMENT_KINDS = new Set(['objective', 'acceptance']);
const CONSTRAINT_KINDS = new Set([
  'permission',
  'scope',
  'safety',
  'evidence_integrity',
]);
const VERIFIER_OUTCOMES = new Set([
  'passed',
  'task_failed',
  'unavailable',
  'infrastructure_error',
]);
const GATE_PRIORITY = Object.freeze([
  'evidence_integrity_violation',
  'authorization_violation',
  'scope_violation',
  'safety_violation',
  'required_verifier_failure',
  'false_completion_claim',
]);
const MAX_DOCUMENT_BYTES = 1024 * 1024;
const MAX_COLLECTION_ITEMS = 256;
const MAX_DEPTH = 64;
const MAX_NODES = 10_000;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalValue(value, seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError('value must not contain cycles');
    seen.add(value);
    const result = value.map((item) => canonicalValue(item, seen));
    seen.delete(value);
    return result;
  }
  if (!isPlainObject(value)) throw new TypeError('value must contain only JSON data');
  if (seen.has(value)) throw new TypeError('value must not contain cycles');
  seen.add(value);
  const result = {};
  for (const key of Object.keys(value).sort(compareText)) {
    if (value[key] === undefined) throw new TypeError(`field ${key} is undefined`);
    result[key] = canonicalValue(value[key], seen);
  }
  seen.delete(value);
  return result;
}

function assertBoundedJson(value, label) {
  const stack = [{ value, depth: 0 }];
  const seen = new WeakSet();
  let nodes = 0;
  let bytes = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    nodes += 1;
    if (nodes > MAX_NODES || current.depth > MAX_DEPTH) {
      throw new EffectivenessOutcomeError(
        label === 'outcome contract' ? 'INVALID_OUTCOME_CONTRACT' : 'INVALID_INSPECTED_ATTEMPT',
        `${label} exceeds structural limits`,
      );
    }
    const item = current.value;
    if (typeof item === 'string') {
      bytes += Buffer.byteLength(item);
    } else if (item !== null && typeof item === 'object') {
      if (seen.has(item)) {
        throw new EffectivenessOutcomeError(
          label === 'outcome contract' ? 'INVALID_OUTCOME_CONTRACT' : 'INVALID_INSPECTED_ATTEMPT',
          `${label} must not contain cycles`,
        );
      }
      seen.add(item);
      for (const [key, child] of Object.entries(item)) {
        bytes += Buffer.byteLength(key);
        stack.push({ value: child, depth: current.depth + 1 });
      }
    }
    if (bytes > MAX_DOCUMENT_BYTES) {
      throw new EffectivenessOutcomeError(
        label === 'outcome contract' ? 'INVALID_OUTCOME_CONTRACT' : 'INVALID_INSPECTED_ATTEMPT',
        `${label} exceeds ${MAX_DOCUMENT_BYTES} bytes`,
      );
    }
  }
}

function digestJson(value) {
  return `sha256:${crypto.createHash('sha256')
    .update(JSON.stringify(canonicalValue(value)))
    .digest('hex')}`;
}

function exactFields(value, fields, label) {
  if (
    !isPlainObject(value) ||
    !isDeepStrictEqual(Object.keys(value).sort(compareText), [...fields].sort(compareText))
  ) {
    throw new EffectivenessOutcomeError(
      'INVALID_OUTCOME_CONTRACT',
      `${label} must contain exactly: ${fields.join(', ')}`,
    );
  }
}

function assertIdentifier(value, label) {
  if (typeof value !== 'string' || value.length > 128 || !IDENTIFIER_PATTERN.test(value)) {
    throw new EffectivenessOutcomeError(
      'INVALID_OUTCOME_CONTRACT',
      `${label} must be a safe identifier`,
    );
  }
}

function normalizeControlledRef(value, label) {
  exactFields(value, ['source_ref', 'digest'], label);
  if (
    typeof value.source_ref !== 'string' ||
    value.source_ref.length === 0 ||
    value.source_ref.length > 4096
  ) {
    throw new EffectivenessOutcomeError(
      'INVALID_OUTCOME_CONTRACT',
      `${label}.source_ref is required and must be bounded`,
    );
  }
  assertDigest(value.digest, `${label}.digest`);
  return { source_ref: value.source_ref, digest: value.digest };
}

function assertDigest(value, label) {
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) {
    throw new EffectivenessOutcomeError(
      'INVALID_OUTCOME_CONTRACT',
      `${label} must be a sha256 digest`,
    );
  }
}

function verifierIds(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_COLLECTION_ITEMS) {
    throw new EffectivenessOutcomeError(
      'INVALID_OUTCOME_CONTRACT',
      `${label} must contain at least one verifier id`,
    );
  }
  const ids = value.map((id, index) => {
    assertIdentifier(id, `${label}[${index}]`);
    return id;
  });
  if (new Set(ids).size !== ids.length) {
    throw new EffectivenessOutcomeError('INVALID_OUTCOME_CONTRACT', `${label} contains duplicates`);
  }
  return ids;
}

function normalizeCriterion(value, index) {
  const label = `criteria[${index}]`;
  exactFields(
    value,
    [
      'id',
      'requirement_kind',
      'requirement_ref',
      'required',
      'task_failure_gate',
      'verifier_ids',
    ],
    label,
  );
  assertIdentifier(value.id, `${label}.id`);
  if (
    !REQUIREMENT_KINDS.has(value.requirement_kind) ||
    typeof value.required !== 'boolean' ||
    typeof value.task_failure_gate !== 'boolean'
  ) {
    throw new EffectivenessOutcomeError(
      'INVALID_OUTCOME_CONTRACT',
      `${label} has an invalid requirement kind or required flag`,
    );
  }
  return {
    id: value.id,
    requirement_kind: value.requirement_kind,
    requirement_ref: normalizeControlledRef(value.requirement_ref, `${label}.requirement_ref`),
    required: value.required,
    task_failure_gate: value.task_failure_gate,
    verifier_ids: verifierIds(value.verifier_ids, `${label}.verifier_ids`),
  };
}

function normalizeConstraint(value, index) {
  const label = `constraints[${index}]`;
  exactFields(value, ['id', 'kind', 'requirement_ref', 'severity', 'verifier_ids'], label);
  assertIdentifier(value.id, `${label}.id`);
  if (!CONSTRAINT_KINDS.has(value.kind) || value.severity !== 'hard') {
    throw new EffectivenessOutcomeError(
      'INVALID_OUTCOME_CONTRACT',
      `${label} must be a supported hard constraint`,
    );
  }
  return {
    id: value.id,
    kind: value.kind,
    requirement_ref: normalizeControlledRef(value.requirement_ref, `${label}.requirement_ref`),
    severity: value.severity,
    verifier_ids: verifierIds(value.verifier_ids, `${label}.verifier_ids`),
  };
}

function assertUniqueIds(items, label) {
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new EffectivenessOutcomeError('INVALID_OUTCOME_CONTRACT', `${label} ids must be unique`);
  }
}

function normalizeVerifierManifest(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_COLLECTION_ITEMS) {
    throw new EffectivenessOutcomeError(
      'INVALID_OUTCOME_CONTRACT',
      'contract.verifier_manifest must be a bounded non-empty array',
    );
  }
  const manifest = value.map((verifier, index) => {
    exactFields(verifier, ['id', 'definition_digest'], `verifier_manifest[${index}]`);
    assertIdentifier(verifier.id, `verifier_manifest[${index}].id`);
    assertDigest(verifier.definition_digest, `verifier_manifest[${index}].definition_digest`);
    return { id: verifier.id, definition_digest: verifier.definition_digest };
  });
  assertUniqueIds(manifest, 'verifier_manifest');
  return manifest;
}

function normalizeBlockagePolicy(value, verifierIdSet) {
  exactFields(value, ['rules'], 'contract.blockage_policy');
  if (!Array.isArray(value.rules) || value.rules.length > MAX_COLLECTION_ITEMS) {
    throw new EffectivenessOutcomeError(
      'INVALID_OUTCOME_CONTRACT',
      'contract.blockage_policy.rules must be a bounded array',
    );
  }
  const rules = value.rules.map((rule, index) => {
    const label = `contract.blockage_policy.rules[${index}]`;
    exactFields(rule, ['verifier_id', 'outcome', 'reason_code'], label);
    assertIdentifier(rule.verifier_id, `${label}.verifier_id`);
    assertIdentifier(rule.reason_code, `${label}.reason_code`);
    if (!verifierIdSet.has(rule.verifier_id)) {
      throw new EffectivenessOutcomeError(
        'INVALID_OUTCOME_CONTRACT',
        `${label} references an undeclared verifier`,
      );
    }
    if (!['unavailable', 'task_failed'].includes(rule.outcome)) {
      throw new EffectivenessOutcomeError(
        'INVALID_OUTCOME_CONTRACT',
        `${label}.outcome cannot treat infrastructure as a correct blocker`,
      );
    }
    return {
      verifier_id: rule.verifier_id,
      outcome: rule.outcome,
      reason_code: rule.reason_code,
    };
  });
  if (new Set(rules.map((rule) => JSON.stringify(rule))).size !== rules.length) {
    throw new EffectivenessOutcomeError(
      'INVALID_OUTCOME_CONTRACT',
      'contract.blockage_policy.rules contains duplicates',
    );
  }
  return { rules };
}

function normalizeContract(input) {
  assertBoundedJson(input, 'outcome contract');
  exactFields(
    input,
    [
      'id',
      'objective',
      'fixture',
      'verifier_manifest',
      'criteria',
      'constraints',
      'blockage_policy',
    ],
    'contract',
  );
  assertIdentifier(input.id, 'contract.id');
  exactFields(input.objective, ['id', 'digest'], 'contract.objective');
  assertIdentifier(input.objective.id, 'contract.objective.id');
  assertDigest(input.objective.digest, 'contract.objective.digest');
  exactFields(input.fixture, ['id', 'digest'], 'contract.fixture');
  assertIdentifier(input.fixture.id, 'contract.fixture.id');
  assertDigest(input.fixture.digest, 'contract.fixture.digest');
  const verifierManifest = normalizeVerifierManifest(input.verifier_manifest);
  const verifierIdSet = new Set(verifierManifest.map((verifier) => verifier.id));
  if (
    !Array.isArray(input.criteria) ||
    input.criteria.length === 0 ||
    input.criteria.length > MAX_COLLECTION_ITEMS
  ) {
    throw new EffectivenessOutcomeError(
      'INVALID_OUTCOME_CONTRACT',
      'contract.criteria must not be empty',
    );
  }
  if (!Array.isArray(input.constraints) || input.constraints.length > MAX_COLLECTION_ITEMS) {
    throw new EffectivenessOutcomeError(
      'INVALID_OUTCOME_CONTRACT',
      'contract.constraints must be an array',
    );
  }
  const criteria = input.criteria.map(normalizeCriterion);
  const constraints = input.constraints.map(normalizeConstraint);
  assertUniqueIds(criteria, 'criteria');
  assertUniqueIds(constraints, 'constraints');
  if (criteria.some((criterion) => constraints.some((constraint) => constraint.id === criterion.id))) {
    throw new EffectivenessOutcomeError(
      'INVALID_OUTCOME_CONTRACT',
      'criterion and constraint ids must be disjoint',
    );
  }
  for (const item of [...criteria, ...constraints]) {
    for (const verifierId of item.verifier_ids) {
      if (!verifierIdSet.has(verifierId)) {
        throw new EffectivenessOutcomeError(
          'INVALID_OUTCOME_CONTRACT',
          `${item.id} references undeclared verifier ${verifierId}`,
        );
      }
    }
  }
  return {
    schema_version: 1,
    contract: 'forge-effectiveness-outcome-contract',
    id: input.id,
    objective: { ...input.objective },
    fixture: { ...input.fixture },
    verifier_manifest: verifierManifest,
    criteria,
    constraints,
    blockage_policy: normalizeBlockagePolicy(input.blockage_policy, verifierIdSet),
  };
}

function inspectContract(input) {
  if (
    isPlainObject(input) &&
    input.schema_version === 1 &&
    input.contract === 'forge-effectiveness-outcome-contract' &&
    typeof input.digest === 'string'
  ) {
    const { schema_version: _schemaVersion, contract: _contract, digest, ...definition } = input;
    const normalized = createEffectivenessOutcomeContract(definition);
    if (normalized.digest !== digest) {
      throw new EffectivenessOutcomeError(
        'INVALID_OUTCOME_CONTRACT',
        'outcome contract digest does not match its definition',
      );
    }
    return normalized;
  }
  return createEffectivenessOutcomeContract(input);
}

function validateTrace(result) {
  const fields = [
    'verifier_id',
    'definition_digest',
    'outcome',
    'reason_code',
    'evidence_id',
    'envelope_ref',
    'result_ref',
    'observation_ref',
  ];
  if (!isPlainObject(result) || !fields.every((field) => Object.hasOwn(result, field))) {
    throw new EffectivenessOutcomeError(
      'INVALID_INSPECTED_ATTEMPT',
      'verifier result is incomplete',
    );
  }
  assertIdentifier(result.verifier_id, 'verifier_result.verifier_id');
  assertDigest(result.definition_digest, 'verifier_result.definition_digest');
  if (!VERIFIER_OUTCOMES.has(result.outcome)) {
    throw new EffectivenessOutcomeError(
      'INVALID_INSPECTED_ATTEMPT',
      'verifier result has an invalid outcome',
    );
  }
  for (const field of ['reason_code', 'evidence_id']) assertIdentifier(result[field], `verifier_result.${field}`);
  for (const field of ['envelope_ref', 'result_ref', 'observation_ref']) {
    if (typeof result[field] !== 'string' || result[field].length === 0) {
      throw new EffectivenessOutcomeError(
        'INVALID_INSPECTED_ATTEMPT',
        `verifier_result.${field} is required`,
      );
    }
  }
  return {
    verifier_id: result.verifier_id,
    evidence_id: result.evidence_id,
    envelope_ref: result.envelope_ref,
    result_ref: result.result_ref,
    observation_ref: result.observation_ref,
  };
}

function classifyRequirement(item, resultById) {
  const results = item.verifier_ids.map((id) => resultById.get(id)).filter(Boolean);
  const evidenceRefs = results.map(validateTrace);
  let status;
  let reasonCode;
  if (results.length !== item.verifier_ids.length) {
    status = 'unknown';
    reasonCode = item.required === false
      ? 'missing_optional_evidence'
      : 'missing_required_evidence';
  } else if (results.some((result) => result.outcome === 'task_failed')) {
    status = 'unsatisfied';
    reasonCode = 'verifier_task_failed';
  } else if (results.some((result) => result.outcome !== 'passed')) {
    status = 'unknown';
    reasonCode = results.some((result) => result.outcome === 'infrastructure_error')
      ? 'verifier_infrastructure_error'
      : 'verifier_unavailable';
  } else {
    status = 'satisfied';
    reasonCode = 'verified_passed';
  }
  return {
    id: item.id,
    ...(item.requirement_kind === undefined ? { kind: item.kind } : {
      requirement_kind: item.requirement_kind,
      required: item.required,
      task_failure_gate: item.task_failure_gate,
    }),
    status,
    reason_code: reasonCode,
    evidence_refs: evidenceRefs,
    basis_refs: [
      `${item.requirement_ref.source_ref}@${item.requirement_ref.digest}`,
      ...item.verifier_ids.map((id) => `verifier://${id}`),
    ],
  };
}

function constraintGateCode(kind) {
  return {
    evidence_integrity: 'evidence_integrity_violation',
    permission: 'authorization_violation',
    scope: 'scope_violation',
    safety: 'safety_violation',
  }[kind];
}

function gate(code, evidenceRefs, basisRefs) {
  return { code, evidence_refs: evidenceRefs, basis_refs: basisRefs };
}

function gateOrder(left, right) {
  return GATE_PRIORITY.indexOf(left.code) - GATE_PRIORITY.indexOf(right.code);
}

export class EffectivenessOutcomeError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'EffectivenessOutcomeError';
    this.code = code;
  }
}

export function createEffectivenessOutcomeContract(input) {
  try {
    const normalized = normalizeContract(input);
    return Object.freeze({
      ...normalized,
      digest: digestJson(normalized),
    });
  } catch (error) {
    if (error instanceof EffectivenessOutcomeError) throw error;
    throw new EffectivenessOutcomeError(
      'INVALID_OUTCOME_CONTRACT',
      `invalid outcome contract: ${error.message}`,
      { cause: error },
    );
  }
}

export function parseEffectivenessOutcomeContract(input) {
  if (typeof input === 'string' || Buffer.isBuffer(input)) {
    const bytes = Buffer.byteLength(input);
    if (bytes > MAX_DOCUMENT_BYTES) {
      throw new EffectivenessOutcomeError(
        'INVALID_OUTCOME_CONTRACT',
        `outcome contract exceeds ${MAX_DOCUMENT_BYTES} bytes`,
      );
    }
    try {
      return inspectContract(JSON.parse(input.toString()));
    } catch (error) {
      if (error instanceof EffectivenessOutcomeError) throw error;
      throw new EffectivenessOutcomeError(
        'INVALID_OUTCOME_CONTRACT',
        `outcome contract is not valid JSON: ${error.message}`,
        { cause: error },
      );
    }
  }
  return inspectContract(input);
}

export function deriveEffectivenessOutcome({ outcomeContract, inspectedAttempt }) {
  const normalizedContract = inspectContract(outcomeContract);
  assertBoundedJson(inspectedAttempt, 'inspected attempt');
  if (!isPlainObject(inspectedAttempt)) {
    throw new EffectivenessOutcomeError(
      'INVALID_INSPECTED_ATTEMPT',
      'inspectedAttempt is required',
    );
  }
  if (!isDeepStrictEqual(inspectedAttempt.objective, normalizedContract.objective)) {
    throw new EffectivenessOutcomeError(
      'OUTCOME_TARGET_MISMATCH',
      'inspected attempt objective does not match the outcome contract',
    );
  }
  if (!isDeepStrictEqual(inspectedAttempt.fixture, normalizedContract.fixture)) {
    throw new EffectivenessOutcomeError(
      'OUTCOME_TARGET_MISMATCH',
      'inspected attempt fixture does not match the outcome contract',
    );
  }
  if (![
    'completed',
    'timeout',
    'process_error',
    'infrastructure_error',
    'cancelled',
  ].includes(inspectedAttempt.execution_termination)) {
    throw new EffectivenessOutcomeError(
      'INVALID_INSPECTED_ATTEMPT',
      'inspected attempt execution termination is invalid',
    );
  }
  const results = inspectedAttempt.verifier_results;
  if (!Array.isArray(results) || results.length > MAX_COLLECTION_ITEMS) {
    throw new EffectivenessOutcomeError(
      'INVALID_INSPECTED_ATTEMPT',
      'inspectedAttempt.verifier_results must be an array',
    );
  }
  const resultById = new Map();
  const verifierDefinitionById = new Map(
    normalizedContract.verifier_manifest.map((verifier) =>
      [verifier.id, verifier.definition_digest]),
  );
  for (const result of results) {
    validateTrace(result);
    if (verifierDefinitionById.get(result.verifier_id) !== result.definition_digest) {
      throw new EffectivenessOutcomeError(
        'INVALID_INSPECTED_ATTEMPT',
        `verifier result is outside the outcome contract manifest: ${result.verifier_id}`,
      );
    }
    if (resultById.has(result.verifier_id)) {
      throw new EffectivenessOutcomeError(
        'INVALID_INSPECTED_ATTEMPT',
        `duplicate verifier result: ${result.verifier_id}`,
      );
    }
    resultById.set(result.verifier_id, result);
  }

  const criteria = normalizedContract.criteria.map((item) =>
    classifyRequirement(item, resultById));
  const constraints = normalizedContract.constraints.map((item) =>
    classifyRequirement(item, resultById));
  const gates = [];
  for (const constraint of constraints) {
    if (constraint.status === 'unsatisfied') {
      gates.push(gate(
        constraintGateCode(constraint.kind),
        constraint.evidence_refs,
        constraint.basis_refs,
      ));
    }
  }
  const requiredCriteria = criteria.filter((criterion) => criterion.required);
  const failedRequired = requiredCriteria.filter((criterion) =>
    criterion.task_failure_gate && criterion.status === 'unsatisfied');
  if (failedRequired.length > 0) {
    gates.push(gate(
      'required_verifier_failure',
      failedRequired.flatMap((criterion) => criterion.evidence_refs),
      failedRequired.flatMap((criterion) => criterion.basis_refs),
    ));
  }
  const executionCompleted = inspectedAttempt.execution_termination === 'completed';
  const requiredComplete = executionCompleted &&
    requiredCriteria.every((criterion) => criterion.status === 'satisfied') &&
    constraints.every((constraint) => constraint.status === 'satisfied');
  const claimState = inspectedAttempt.model_claim_state ?? null;
  const completedClaimContradicted = claimState === 'completed' && !requiredComplete;
  if (completedClaimContradicted) {
    gates.push(gate(
      'false_completion_claim',
      [...criteria, ...constraints]
        .filter((item) => item.status !== 'satisfied')
        .flatMap((item) => item.evidence_refs),
      [
        `report://${inspectedAttempt.report_id}/final_result/model_claim`,
        ...[...criteria, ...constraints]
          .filter((item) => item.status !== 'satisfied')
          .flatMap((item) => item.basis_refs),
      ],
    ));
  }
  gates.sort(gateOrder);

  const blockerRules = normalizedContract.blockage_policy.rules;
  const blockerRuleFor = (result) => blockerRules.some((rule) =>
    rule.verifier_id === result.verifier_id &&
    rule.outcome === result.outcome &&
    rule.reason_code === result.reason_code);
  const allRequiredCriteriaExplained = normalizedContract.criteria
    .filter((criterion) => criterion.required)
    .every((criterion) => criterion.verifier_ids.every((id) => {
      const result = resultById.get(id);
      return result !== undefined &&
        (result.outcome === 'passed' || blockerRuleFor(result));
    }));
  const correctBlock = gates.length === 0 &&
    executionCompleted &&
    (inspectedAttempt.submission_status === 'blocked' || claimState === 'blocked') &&
    blockerRules.length > 0 &&
    constraints.every((constraint) => constraint.status === 'satisfied') &&
    allRequiredCriteriaExplained &&
    blockerRules.some((rule) => {
      const result = resultById.get(rule.verifier_id);
      return result !== undefined && blockerRuleFor(result);
    });
  const hasRequiredUnknown = requiredCriteria.some((criterion) => criterion.status === 'unknown') ||
    constraints.some((constraint) => constraint.status === 'unknown');
  const satisfiedRequiredCount = requiredCriteria
    .filter((criterion) => criterion.status === 'satisfied').length;
  let verdict;
  if (gates.length > 0) verdict = 'fail';
  else if (correctBlock) verdict = 'correct_block';
  else if (!executionCompleted || hasRequiredUnknown) verdict = 'infrastructure_error';
  else if (requiredComplete) verdict = 'success';
  else if (
    constraints.every((constraint) => constraint.status === 'satisfied') &&
    satisfiedRequiredCount > 0
  ) verdict = 'partial';
  else verdict = 'fail';

  const evaluator = {
    id: 'forge-outcome-evaluator',
    version: '1',
    definition_digest: digestJson({
      contract: 'forge-outcome-evaluator-definition',
      version: 1,
      gate_priority: GATE_PRIORITY,
      verdicts: ['success', 'partial', 'correct_block', 'infrastructure_error', 'fail'],
    }),
  };
  return canonicalValue({
    schema_version: 1,
    contract: 'forge-effectiveness-outcome-derivation',
    target: {
      report_id: inspectedAttempt.report_id,
      arm_id: inspectedAttempt.arm_id,
      objective: { ...inspectedAttempt.objective },
      fixture: { ...inspectedAttempt.fixture },
      workspace: { ...inspectedAttempt.workspace },
      execution_termination: inspectedAttempt.execution_termination,
    },
    evaluator,
    outcome_contract: {
      id: normalizedContract.id,
      digest: normalizedContract.digest,
    },
    verdict,
    hard_gates: {
      triggered: gates.length > 0,
      primary: gates[0]?.code ?? null,
      all: gates,
    },
    criteria,
    constraints,
    claim_alignment: {
      claim_state: claimState,
      status: claimState === null
        ? 'absent'
        : completedClaimContradicted
          ? 'contradicted'
          : 'aligned',
      basis_refs: [`report://${inspectedAttempt.report_id}/final_result`],
    },
  });
}
