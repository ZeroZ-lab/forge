import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EffectivenessOutcomeError,
  createEffectivenessOutcomeContract,
  deriveEffectivenessOutcome,
} from '../scripts/lib/effectiveness-outcome.mjs';

const DIGEST = `sha256:${'a'.repeat(64)}`;
const VERIFIER_DIGESTS = {
  value: `sha256:${'b'.repeat(64)}`,
  explanation: `sha256:${'c'.repeat(64)}`,
  workspace: `sha256:${'d'.repeat(64)}`,
  second: `sha256:${'e'.repeat(64)}`,
};

function requirementRef(id) {
  return { source_ref: `fixture://requirements/${id}`, digest: DIGEST };
}

function contract(overrides = {}) {
  return createEffectivenessOutcomeContract({
    id: 'read-package-version-outcome',
    objective: { id: 'read-package-version', digest: DIGEST },
    fixture: { id: 'direct-read-package-version', digest: DIGEST },
    verifier_manifest: [
      { id: 'value-check', definition_digest: VERIFIER_DIGESTS.value },
      { id: 'explanation-check', definition_digest: VERIFIER_DIGESTS.explanation },
      { id: 'workspace-check', definition_digest: VERIFIER_DIGESTS.workspace },
    ],
    criteria: [
      {
        id: 'ac-value-is-correct',
        requirement_kind: 'acceptance',
        requirement_ref: requirementRef('ac-value-is-correct'),
        required: true,
        task_failure_gate: true,
        verifier_ids: ['value-check'],
      },
      {
        id: 'ac-explanation-is-helpful',
        requirement_kind: 'acceptance',
        requirement_ref: requirementRef('ac-explanation-is-helpful'),
        required: false,
        task_failure_gate: false,
        verifier_ids: ['explanation-check'],
      },
    ],
    constraints: [
      {
        id: 'constraint-read-only',
        kind: 'scope',
        requirement_ref: requirementRef('constraint-read-only'),
        severity: 'hard',
        verifier_ids: ['workspace-check'],
      },
    ],
    blockage_policy: {
      rules: [{
        verifier_id: 'value-check',
        outcome: 'unavailable',
        reason_code: 'command_not_found',
      }],
    },
    ...overrides,
  });
}

function result(id, outcome = 'passed', reasonCode = `${id}_passed`) {
  return {
    verifier_id: id,
    definition_digest: {
      'value-check': VERIFIER_DIGESTS.value,
      'explanation-check': VERIFIER_DIGESTS.explanation,
      'workspace-check': VERIFIER_DIGESTS.workspace,
      'second-check': VERIFIER_DIGESTS.second,
    }[id],
    outcome,
    reason_code: reasonCode,
    evidence_id: `evidence-${id}`,
    envelope_ref: `envelope-${id}.json`,
    result_ref: `result-${id}.json`,
    observation_ref: `observation-${id}.json`,
  };
}

function attempt(overrides = {}) {
  return {
    report_id: 'report-1',
    arm_id: 'adaptive-full',
    objective: { id: 'read-package-version', digest: DIGEST },
    fixture: { id: 'direct-read-package-version', digest: DIGEST },
    workspace: {
      isolation_id: 'workspace-1',
      final_snapshot_digest: DIGEST,
    },
    submission_status: 'submitted',
    model_claim_state: 'completed',
    execution_termination: 'completed',
    verifier_results: [
      result('value-check'),
      result('explanation-check'),
      result('workspace-check'),
    ],
    ...overrides,
  };
}

test('outcome contract rejects action-path and Skill routing proxies', () => {
  for (const forbidden of [
    { required_skill: 'forge:detail' },
    { lifecycle_stage: 'review' },
    { action_path: 'direct_action' },
    { arm_id: 'adaptive-full' },
    { model_id: 'strong-model' },
  ]) {
    assert.throws(
      () => contract({ criteria: [{
        id: 'ac-value-is-correct',
        requirement_kind: 'acceptance',
        requirement_ref: requirementRef('ac-value-is-correct'),
        required: true,
        task_failure_gate: true,
        verifier_ids: ['value-check'],
        ...forbidden,
      }] }),
      (error) => error instanceof EffectivenessOutcomeError && error.code === 'INVALID_OUTCOME_CONTRACT',
    );
  }
});

test('verified required outcomes produce success with exact evidence traces', () => {
  const evaluation = deriveEffectivenessOutcome({
    outcomeContract: contract(),
    inspectedAttempt: attempt(),
  });

  assert.equal(evaluation.verdict, 'success');
  assert.deepEqual(evaluation.hard_gates, { triggered: false, primary: null, all: [] });
  assert.equal(evaluation.criteria[0].status, 'satisfied');
  assert.deepEqual(evaluation.criteria[0].evidence_refs, [{
    verifier_id: 'value-check',
    evidence_id: 'evidence-value-check',
    envelope_ref: 'envelope-value-check.json',
    result_ref: 'result-value-check.json',
    observation_ref: 'observation-value-check.json',
  }]);
  assert.equal(evaluation.claim_alignment.status, 'aligned');
});

test('verified progress without all required acceptance criteria is partial', () => {
  const outcomeContract = contract({
    criteria: [
      {
        id: 'ac-value-is-correct',
        requirement_kind: 'acceptance',
        requirement_ref: requirementRef('ac-value-is-correct'),
        required: true,
        task_failure_gate: true,
        verifier_ids: ['value-check'],
      },
      {
        id: 'ac-second-required-result',
        requirement_kind: 'acceptance',
        requirement_ref: requirementRef('ac-second-required-result'),
        required: true,
        task_failure_gate: false,
        verifier_ids: ['second-check'],
      },
    ],
    verifier_manifest: [
      { id: 'value-check', definition_digest: VERIFIER_DIGESTS.value },
      { id: 'second-check', definition_digest: VERIFIER_DIGESTS.second },
      { id: 'workspace-check', definition_digest: VERIFIER_DIGESTS.workspace },
    ],
  });
  const evaluation = deriveEffectivenessOutcome({
    outcomeContract,
    inspectedAttempt: attempt({
      model_claim_state: 'partial',
      verifier_results: [
        result('value-check'),
        result('second-check', 'task_failed', 'assertion_failed'),
        result('workspace-check'),
      ],
    }),
  });

  assert.equal(evaluation.verdict, 'partial');
  assert.equal(evaluation.criteria[1].status, 'unsatisfied');
  assert.equal(evaluation.criteria[1].reason_code, 'verifier_task_failed');
  assert.equal(evaluation.hard_gates.triggered, false);
});

test('an allowed evidenced blocker is distinguished from infrastructure failure', () => {
  const evaluation = deriveEffectivenessOutcome({
    outcomeContract: contract(),
    inspectedAttempt: attempt({
      submission_status: 'blocked',
      model_claim_state: 'blocked',
      verifier_results: [
        result('value-check', 'unavailable', 'command_not_found'),
        result('workspace-check'),
      ],
    }),
  });

  assert.equal(evaluation.verdict, 'correct_block');
  assert.equal(evaluation.hard_gates.triggered, false);
});

test('an allowed blocker cannot hide a second unexplained required unknown', () => {
  const evaluation = deriveEffectivenessOutcome({
    outcomeContract: contract({
      criteria: [
        {
        id: 'ac-value-is-correct',
        requirement_kind: 'acceptance',
        requirement_ref: requirementRef('ac-value-is-correct'),
        required: true,
        task_failure_gate: true,
        verifier_ids: ['value-check'],
        },
        {
        id: 'ac-second-result',
        requirement_kind: 'acceptance',
        requirement_ref: requirementRef('ac-second-result'),
        required: true,
        task_failure_gate: false,
        verifier_ids: ['second-check'],
      },
    ],
    verifier_manifest: [
      { id: 'value-check', definition_digest: VERIFIER_DIGESTS.value },
      { id: 'second-check', definition_digest: VERIFIER_DIGESTS.second },
      { id: 'workspace-check', definition_digest: VERIFIER_DIGESTS.workspace },
    ],
    }),
    inspectedAttempt: attempt({
      submission_status: 'blocked',
      model_claim_state: 'blocked',
      verifier_results: [
        result('value-check', 'unavailable', 'command_not_found'),
        result('second-check', 'infrastructure_error', 'verifier_timeout'),
        result('workspace-check'),
      ],
    }),
  });

  assert.equal(evaluation.verdict, 'infrastructure_error');
});

test('unavailable required verification is infrastructure_error when it is not an allowed blocker', () => {
  const evaluation = deriveEffectivenessOutcome({
    outcomeContract: contract({
      blockage_policy: { rules: [] },
    }),
    inspectedAttempt: attempt({
      submission_status: 'no_output',
      model_claim_state: null,
      verifier_results: [
        result('value-check', 'infrastructure_error', 'verifier_timeout'),
        result('workspace-check'),
      ],
    }),
  });

  assert.equal(evaluation.verdict, 'infrastructure_error');
  assert.equal(evaluation.hard_gates.triggered, false);
});

test('hard constraint unknown is never reported as partial progress', () => {
  const evaluation = deriveEffectivenessOutcome({
    outcomeContract: contract(),
    inspectedAttempt: attempt({
      model_claim_state: 'partial',
      verifier_results: [
        result('value-check'),
        result('workspace-check', 'infrastructure_error', 'verifier_timeout'),
      ],
    }),
  });

  assert.equal(evaluation.verdict, 'infrastructure_error');
  assert.equal(evaluation.constraints[0].status, 'unknown');
});

test('infrastructure outcomes cannot be configured as correct blockers', () => {
  assert.throws(
    () => contract({
      blockage_policy: {
        rules: [{
          verifier_id: 'value-check',
          outcome: 'infrastructure_error',
          reason_code: 'verifier_timeout',
        }],
      },
    }),
    (error) => error instanceof EffectivenessOutcomeError &&
      error.code === 'INVALID_OUTCOME_CONTRACT',
  );
});

test('outcome inputs fail closed before excessive collections or nesting are processed', () => {
  const tooManyCriteria = Array.from({ length: 257 }, (_, index) => ({
    id: `criterion-${index}`,
    requirement_kind: 'acceptance',
    requirement_ref: requirementRef(`criterion-${index}`),
    required: true,
    task_failure_gate: false,
    verifier_ids: ['value-check'],
  }));
  assert.throws(
    () => contract({ criteria: tooManyCriteria }),
    (error) => error instanceof EffectivenessOutcomeError &&
      error.code === 'INVALID_OUTCOME_CONTRACT',
  );

  const nested = {};
  let cursor = nested;
  for (let depth = 0; depth < 70; depth += 1) {
    cursor.child = {};
    cursor = cursor.child;
  }
  assert.throws(
    () => contract({ unexpected: nested }),
    (error) => error instanceof EffectivenessOutcomeError &&
      error.code === 'INVALID_OUTCOME_CONTRACT',
  );
});

test('a hard scope violation cannot be masked by passing acceptance checks or infrastructure errors', () => {
  const evaluation = deriveEffectivenessOutcome({
    outcomeContract: contract(),
    inspectedAttempt: attempt({
      model_claim_state: 'partial',
      verifier_results: [
        result('value-check', 'infrastructure_error', 'verifier_timeout'),
        result('workspace-check', 'task_failed', 'diff_failed'),
      ],
    }),
  });

  assert.equal(evaluation.verdict, 'fail');
  assert.equal(evaluation.hard_gates.primary, 'scope_violation');
  assert.deepEqual(evaluation.hard_gates.all.map((gate) => gate.code), ['scope_violation']);
});

test('partial progress plus verifier infrastructure remains infrastructure_error', () => {
  const evaluation = deriveEffectivenessOutcome({
    outcomeContract: contract({
      criteria: [
        {
          id: 'ac-value-is-correct',
          requirement_kind: 'acceptance',
          requirement_ref: requirementRef('ac-value-is-correct'),
          required: true,
          task_failure_gate: true,
          verifier_ids: ['value-check'],
        },
        {
          id: 'ac-second-result',
          requirement_kind: 'acceptance',
          requirement_ref: requirementRef('ac-second-result'),
          required: true,
          task_failure_gate: false,
          verifier_ids: ['second-check'],
        },
      ],
      verifier_manifest: [
        { id: 'value-check', definition_digest: VERIFIER_DIGESTS.value },
        { id: 'second-check', definition_digest: VERIFIER_DIGESTS.second },
        { id: 'workspace-check', definition_digest: VERIFIER_DIGESTS.workspace },
      ],
    }),
    inspectedAttempt: attempt({
      model_claim_state: 'partial',
      verifier_results: [
        result('value-check'),
        result('second-check', 'infrastructure_error', 'verifier_timeout'),
        result('workspace-check'),
      ],
    }),
  });

  assert.equal(evaluation.verdict, 'infrastructure_error');
});

test('runner infrastructure termination cannot be promoted by passing verifiers', () => {
  const evaluation = deriveEffectivenessOutcome({
    outcomeContract: contract(),
    inspectedAttempt: attempt({
      model_claim_state: 'partial',
      execution_termination: 'infrastructure_error',
    }),
  });

  assert.equal(evaluation.verdict, 'infrastructure_error');
});

test('hidden required verifier failure outranks and records a false completion claim', () => {
  const evaluation = deriveEffectivenessOutcome({
    outcomeContract: contract(),
    inspectedAttempt: attempt({
      verifier_results: [
        result('value-check', 'task_failed', 'assertion_failed'),
        result('workspace-check'),
      ],
    }),
  });

  assert.equal(evaluation.verdict, 'fail');
  assert.equal(evaluation.hard_gates.primary, 'required_verifier_failure');
  assert.deepEqual(evaluation.hard_gates.all.map((gate) => gate.code), [
    'required_verifier_failure',
    'false_completion_claim',
  ]);
  assert.equal(evaluation.claim_alignment.status, 'contradicted');
});

test('completed claim over verifier infrastructure failure is a hard false completion', () => {
  const evaluation = deriveEffectivenessOutcome({
    outcomeContract: contract(),
    inspectedAttempt: attempt({
      verifier_results: [
        result('value-check', 'infrastructure_error', 'verifier_execution_failed'),
        result('workspace-check'),
      ],
    }),
  });

  assert.equal(evaluation.verdict, 'fail');
  assert.equal(evaluation.hard_gates.primary, 'false_completion_claim');
});

test('capability activation telemetry does not affect the outcome', () => {
  const outcomeContract = contract();
  const direct = deriveEffectivenessOutcome({
    outcomeContract,
    inspectedAttempt: attempt({ telemetry: { capability_activations: [] } }),
  });
  const skill = deriveEffectivenessOutcome({
    outcomeContract,
    inspectedAttempt: attempt({
      arm_id: 'kernel-only',
      telemetry: { capability_activations: ['forge:detail'] },
    }),
  });

  assert.equal(direct.verdict, skill.verdict);
  assert.deepEqual(direct.criteria, skill.criteria);
  assert.deepEqual(direct.constraints, skill.constraints);
  assert.deepEqual(direct.hard_gates, skill.hard_gates);
});
