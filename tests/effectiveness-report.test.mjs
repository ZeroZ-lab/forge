import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  EffectivenessReportError,
  createEffectivenessReport,
  parseEffectivenessReport,
} from '../scripts/lib/effectiveness-report.mjs';

const root = path.resolve(import.meta.dirname, '..');
const samplePath = path.join(
  root,
  'evals',
  'effectiveness-suite',
  'report-samples',
  'v1-valid-direct-action.json',
);
const experimentPlan = {
  arms: {
    'no-forge': {
      definition_digest: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      capability_policy: {
        id: 'no-forge',
        digest: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        exposed: [],
      },
    },
    'kernel-only': {
      definition_digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      capability_policy: {
        id: 'kernel-only',
        digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        exposed: [{ kind: 'other', id: 'forge:kernel', version: '1' }],
      },
    },
    'adaptive-full': {
      definition_digest: 'sha256:2222222222222222222222222222222222222222222222222222222222222222',
      capability_policy: {
        id: 'adaptive-full',
        digest: 'sha256:8888888888888888888888888888888888888888888888888888888888888888',
        exposed: [{ kind: 'skill', id: 'forge:detail', version: '0.52.0' }],
      },
    },
    'legacy-chain': {
      definition_digest: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      capability_policy: {
        id: 'legacy-chain',
        digest: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        exposed: [{ kind: 'other', id: 'forge:legacy-chain', version: '0.52.0' }],
      },
    },
  },
};

function reportOptions() {
  return { rootDir: root, experimentPlan };
}

function validReport() {
  return JSON.parse(fs.readFileSync(samplePath, 'utf8'));
}

function inspect(report) {
  try {
    return {
      ok: true,
      issues: [],
      report: parseEffectivenessReport(report, reportOptions()),
    };
  } catch (error) {
    assert.ok(error instanceof EffectivenessReportError);
    return { ok: false, issues: error.issues };
  }
}

function hasIssue(result, pathName, code) {
  return result.issues.some((issue) => issue.path === pathName && issue.code === code);
}

test('constructor owns constants, deterministic report id, cloning, and the shared validator', () => {
  const source = validReport();
  const { schema_version, contract, report_id, ...input } = source;
  delete input.final_result.artifact_refs;
  delete input.final_result.verifier_result_refs;
  const created = createEffectivenessReport(input, reportOptions());

  assert.equal(created.schema_version, 1);
  assert.equal(created.contract, 'forge-effectiveness-report');
  assert.equal(
    created.report_id,
    `${created.experiment.comparison_group_id}.${created.experiment.arm.id}.${created.experiment.reproduction.repeat_index}`,
  );
  assert.deepEqual(inspect(created), { ok: true, issues: [], report: created });

  input.experiment.arm.id = 'mutated-after-construction';
  assert.equal(created.experiment.arm.id, 'kernel-only');
  assert.equal(schema_version, 1);
  assert.equal(contract, 'forge-effectiveness-report');
  assert.equal(report_id, 'direct-read-package-version.model-fixture-model.0.kernel-only.0');
  assert.deepEqual(created.final_result.artifact_refs, []);
  assert.deepEqual(created.final_result.verifier_result_refs, []);

  for (const [field, value] of [
    ['schema_version', schema_version],
    ['contract', contract],
    ['report_id', report_id],
  ]) {
    assert.throws(
      () => createEffectivenessReport({ ...input, [field]: value }, reportOptions()),
      (error) =>
        error instanceof EffectivenessReportError &&
        hasIssue({ issues: error.issues }, `/${field}`, 'constructor_owned'),
    );
  }
});

test('parser accepts object or JSON text and rejects malformed JSON with one error type', () => {
  const source = validReport();
  assert.deepEqual(parseEffectivenessReport(source, reportOptions()), source);
  assert.deepEqual(parseEffectivenessReport(JSON.stringify(source), reportOptions()), source);

  assert.throws(
    () => parseEffectivenessReport('{', reportOptions()),
    (error) =>
      error instanceof EffectivenessReportError &&
      error.issues.length === 1 &&
      error.issues[0].path === '' &&
      error.issues[0].code === 'invalid_json',
  );

  assert.throws(
    () => parseEffectivenessReport(source, { rootDir: root }),
    (error) =>
      error instanceof EffectivenessReportError &&
      hasIssue({ issues: error.issues }, '/experiment_plan', 'required_context'),
  );
});

test('object inputs with non-JSON scalar values still fail through the report error interface', () => {
  const invalidEnum = validReport();
  invalidEnum.events[0].actor = 1n;
  assert.throws(
    () => parseEffectivenessReport(invalidEnum, reportOptions()),
    (error) =>
      error instanceof EffectivenessReportError &&
      hasIssue({ issues: error.issues }, '/events/0/actor', 'enum'),
  );

  const invalidContract = validReport();
  invalidContract.contract = 1n;
  let contractError;
  assert.throws(
    () => parseEffectivenessReport(invalidContract, reportOptions()),
    (error) => {
      contractError = error;
      return (
        error instanceof EffectivenessReportError &&
        hasIssue({ issues: error.issues }, '/contract', 'incompatible_contract')
      );
    },
  );
  assert.doesNotThrow(() => JSON.stringify(contractError.issues));

  const legacyLike = { version: 2n, suite: 'forge', run_id: 'legacy', cases: [] };
  assert.throws(
    () => parseEffectivenessReport(legacyLike, reportOptions()),
    (error) => error instanceof EffectivenessReportError,
  );
});

test('strict schema errors identify missing provenance and unsupported fields', () => {
  const missingEvidenceSource = validReport();
  delete missingEvidenceSource.evidence[0].locator;
  const evidenceResult = inspect(missingEvidenceSource);
  assert.equal(evidenceResult.ok, false);
  assert.equal(hasIssue(evidenceResult, '/evidence/0/locator', 'required'), true);

  const missingCostSource = validReport();
  delete missingCostSource.costs[0].acquisition;
  assert.equal(hasIssue(inspect(missingCostSource), '/costs/0/acquisition', 'required'), true);

  const routed = validReport();
  routed.triggered_skills = ['detail'];
  assert.equal(hasIssue(inspect(routed), '/triggered_skills', 'additional_property'), true);

  const sparseArtifacts = validReport();
  sparseArtifacts.final_result.artifact_refs = Array(1);
  assert.equal(hasIssue(inspect(sparseArtifacts), '/final_result/artifact_refs/0', 'sparse_item'), true);

  const hugeSparseArtifacts = validReport();
  hugeSparseArtifacts.final_result.artifact_refs = [];
  hugeSparseArtifacts.final_result.artifact_refs.length = 2 ** 32 - 1;
  assert.equal(
    hasIssue(inspect(hugeSparseArtifacts), '/final_result/artifact_refs/0', 'sparse_item'),
    true,
  );
});

test('schema-valid but undeclared experiment arms are rejected at the manifest seam', () => {
  const report = validReport();
  report.experiment.arm.id = 'unknown-arm';

  const result = inspect(report);
  assert.equal(result.ok, false);
  assert.equal(hasIssue(result, '/experiment/arm/id', 'unknown_experiment_arm'), true);
});

test('arm definition and capability policy are bound to the trusted experiment plan', () => {
  const wrongDefinition = validReport();
  wrongDefinition.experiment.arm.definition_digest = 'sha256:attacker-controlled';
  assert.equal(
    hasIssue(
      inspect(wrongDefinition),
      '/experiment/arm/definition_digest',
      'arm_definition_mismatch',
    ),
    true,
  );

  const wrongExposure = validReport();
  wrongExposure.experiment.capability_policy.exposed.push({ kind: 'tool', id: 'unplanned-tool' });
  assert.equal(
    hasIssue(
      inspect(wrongExposure),
      '/experiment/capability_policy/exposed',
      'capability_policy_mismatch',
    ),
    true,
  );
});

test('report-local objective, event, evidence, and final-result references are consistent', () => {
  const wrongReportId = validReport();
  wrongReportId.report_id = 'other-run.no-forge.99';
  assert.equal(hasIssue(inspect(wrongReportId), '/report_id', 'report_id_mismatch'), true);

  const wrongObjective = validReport();
  wrongObjective.evidence[0].objective_ref = 'another-objective';
  assert.equal(hasIssue(inspect(wrongObjective), '/evidence/0/objective_ref', 'objective_mismatch'), true);

  const missingEvent = validReport();
  missingEvent.evidence[0].event_id = 'event-missing';
  assert.equal(hasIssue(inspect(missingEvent), '/evidence/0/event_id', 'reference_missing'), true);

  const missingEvidence = validReport();
  missingEvidence.events[0].evidence_refs[0] = 'evidence-missing';
  assert.equal(hasIssue(inspect(missingEvidence), '/events/0/evidence_refs/0', 'reference_missing'), true);

  const missingVerifierEvidence = validReport();
  missingVerifierEvidence.final_result.verifier_result_refs[0] = 'evidence-missing';
  assert.equal(
    hasIssue(inspect(missingVerifierEvidence), '/final_result/verifier_result_refs/0', 'reference_missing'),
    true,
  );
});

test('duplicate ids and source-mismatched final references are rejected', () => {
  const duplicateEvent = validReport();
  duplicateEvent.events[1].id = duplicateEvent.events[0].id;
  assert.equal(hasIssue(inspect(duplicateEvent), '/events/1/id', 'duplicate_id'), true);

  const duplicateEvidence = validReport();
  duplicateEvidence.evidence[1].id = duplicateEvidence.evidence[0].id;
  assert.equal(hasIssue(inspect(duplicateEvidence), '/evidence/1/id', 'duplicate_id'), true);

  const duplicateVerifierReference = validReport();
  duplicateVerifierReference.final_result.verifier_result_refs.push(
    duplicateVerifierReference.final_result.verifier_result_refs[0],
  );
  assert.equal(
    hasIssue(
      inspect(duplicateVerifierReference),
      '/final_result/verifier_result_refs/1',
      'duplicate_reference',
    ),
    true,
  );

  const modelClaimFromTool = validReport();
  modelClaimFromTool.final_result.model_claim.evidence_ref = 'evidence-read-version';
  assert.equal(
    hasIssue(
      inspect(modelClaimFromTool),
      '/final_result/model_claim/evidence_ref',
      'reference_source_mismatch',
    ),
    true,
  );

  const verifierFromModel = validReport();
  verifierFromModel.final_result.verifier_result_refs[0] = 'evidence-model-claim';
  assert.equal(
    hasIssue(
      inspect(verifierFromModel),
      '/final_result/verifier_result_refs/0',
      'reference_source_mismatch',
    ),
    true,
  );
});

test('schema model-availability errors retain the precise missing-field path', () => {
  const report = validReport();
  delete report.experiment.model.actual;

  const result = inspect(report);
  assert.equal(result.ok, false);
  assert.equal(hasIssue(result, '/experiment/model/actual', 'required'), true);
});

test('legacy and future reports receive explicit family/version diagnostics', () => {
  const legacy = JSON.parse(
    fs.readFileSync(
      path.join(
        root,
        'evals',
        'effectiveness-suite',
        'report-samples',
        'skills-suite-v2.incompatible.json',
      ),
      'utf8',
    ),
  );
  const legacyResult = inspect(legacy);
  assert.equal(legacyResult.ok, false);
  assert.equal(hasIssue(legacyResult, '', 'rerun_required_missing_effectiveness_provenance'), true);

  const future = validReport();
  future.schema_version = 2;
  const futureResult = inspect(future);
  assert.equal(futureResult.ok, false);
  assert.equal(hasIssue(futureResult, '/schema_version', 'unsupported_version'), true);
});

test('B03 validates reference structure without claiming B06 evidence validity', () => {
  const report = validReport();
  for (const evidence of report.evidence) delete evidence.envelope_ref;

  const result = inspect(report);
  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
});
