import { isDeepStrictEqual } from 'node:util';

import { loadEffectivenessContract } from './effectiveness-contract.mjs';
import { validateJsonSchema } from './json-schema-subset.mjs';

const REPORT_CONTRACT = 'forge-effectiveness-report';
const REPORT_SCHEMA_VERSION = 1;
const CONSTRUCTOR_OWNED_FIELDS = ['schema_version', 'contract', 'report_id'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function jsonSafeDiagnostic(value, seen = new WeakSet(), depth = 0) {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.length <= 500 ? value : `${value.slice(0, 500)}[Truncated ${value.length - 500} chars]`;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'undefined' || typeof value === 'symbol' || typeof value === 'function') {
    return String(value);
  }
  if (seen.has(value)) return '[Circular]';
  if (depth >= 4) return `[Truncated ${Object.prototype.toString.call(value)}]`;
  seen.add(value);
  if (Array.isArray(value)) {
    const limit = Math.min(value.length, 20);
    const result = Array.from({ length: limit }, (_, index) =>
      Object.hasOwn(value, index) ? jsonSafeDiagnostic(value[index], seen, depth + 1) : '[Sparse]',
    );
    if (value.length > limit) result.push(`[${value.length - limit} more items]`);
    return result;
  }
  if (!isPlainObject(value)) return Object.prototype.toString.call(value);
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 20)
      .map(([key, child]) => [key, jsonSafeDiagnostic(child, seen, depth + 1)]),
  );
}

function issue(path, code, message, details = {}) {
  const normalizedDetails = { ...details };
  if (Object.hasOwn(normalizedDetails, 'expected')) {
    normalizedDetails.expected = jsonSafeDiagnostic(normalizedDetails.expected);
  }
  if (Object.hasOwn(normalizedDetails, 'actual')) {
    normalizedDetails.actual = jsonSafeDiagnostic(normalizedDetails.actual);
  }
  return { path, code, message, ...normalizedDetails };
}

function stableIssues(issues) {
  const unique = new Map();
  for (const item of issues) {
    const key = `${item.path}\u0000${item.code}\u0000${item.message}\u0000${item.related_path ?? ''}`;
    unique.set(key, item);
  }
  return [...unique.values()].sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.code.localeCompare(right.code) ||
      left.message.localeCompare(right.message),
  );
}

export class EffectivenessReportError extends Error {
  constructor(code, issues, options = {}) {
    const normalizedIssues = stableIssues(issues);
    super(
      normalizedIssues.length === 1
        ? normalizedIssues[0].message
        : `Effectiveness report rejected (${normalizedIssues.length} issues)`,
      options,
    );
    this.name = 'EffectivenessReportError';
    this.code = code;
    this.issues = normalizedIssues;
  }
}

function cloneInput(value) {
  try {
    return structuredClone(value);
  } catch (error) {
    throw new EffectivenessReportError(
      'INVALID_REPORT',
      [issue('', 'invalid_value', `report input cannot be cloned: ${error.message}`)],
      { cause: error },
    );
  }
}

function decodeInput(input) {
  if (typeof input !== 'string') return cloneInput(input);
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new EffectivenessReportError(
      'INVALID_JSON',
      [issue('', 'invalid_json', `report is not valid JSON: ${error.message}`)],
      { cause: error },
    );
  }
}

function matchesDiscriminator(value, discriminator) {
  if (!isPlainObject(value) || !isPlainObject(discriminator)) return false;
  for (const [field, expected] of Object.entries(discriminator.required_values ?? {})) {
    if (!Object.is(value[field], expected)) return false;
  }
  if (!(discriminator.required_fields ?? []).every((field) => Object.hasOwn(value, field))) {
    return false;
  }
  return (discriminator.forbidden_fields ?? []).every((field) => !Object.hasOwn(value, field));
}

function compatibilityFailure(report, compatibility) {
  for (const foreignContract of compatibility.foreign_contracts ?? []) {
    if (!matchesDiscriminator(report, foreignContract.discriminator)) continue;
    return new EffectivenessReportError('INCOMPATIBLE_CONTRACT', [
      issue(
        '',
        foreignContract.diagnostic,
        `report matches incompatible ${foreignContract.contract} contract; rerun is required`,
        {
          expected: REPORT_CONTRACT,
          actual: foreignContract.contract,
        },
      ),
    ]);
  }

  if (isPlainObject(report) && Object.hasOwn(report, 'contract') && report.contract !== REPORT_CONTRACT) {
    return new EffectivenessReportError('INCOMPATIBLE_CONTRACT', [
      issue('/contract', 'incompatible_contract', 'report contract is not accepted', {
        expected: REPORT_CONTRACT,
        actual: report.contract,
      }),
    ]);
  }

  if (
    isPlainObject(report) &&
    report.contract === REPORT_CONTRACT &&
    Object.hasOwn(report, 'schema_version') &&
    !compatibility.directly_accepted_versions.includes(report.schema_version)
  ) {
    return new EffectivenessReportError('UNSUPPORTED_VERSION', [
      issue('/schema_version', 'unsupported_version', 'report schema version is not accepted', {
        expected: compatibility.directly_accepted_versions,
        actual: report.schema_version,
      }),
    ]);
  }

  return undefined;
}

function expectedReportId(report) {
  const comparisonGroupId = report.experiment?.comparison_group_id;
  const armId = report.experiment?.arm?.id;
  const repeatIndex = report.experiment?.reproduction?.repeat_index;
  if (
    typeof comparisonGroupId !== 'string' ||
    typeof armId !== 'string' ||
    !Number.isInteger(repeatIndex)
  ) {
    return undefined;
  }
  return `${comparisonGroupId}.${armId}.${repeatIndex}`;
}

function experimentPlanSchema(manifest, reportSchema) {
  const armDefinition = {
    type: 'object',
    additionalProperties: false,
    required: ['definition_digest', 'capability_policy'],
    properties: {
      definition_digest: { $ref: '#/$defs/digest' },
      capability_policy: { $ref: '#/$defs/capabilityPolicy' },
    },
  };
  return {
    $defs: reportSchema.$defs,
    type: 'object',
    additionalProperties: false,
    required: ['arms'],
    properties: {
      arms: {
        type: 'object',
        additionalProperties: false,
        required: manifest.modes,
        properties: Object.fromEntries(
          manifest.modes.map((armId) => [armId, armDefinition]),
        ),
      },
    },
  };
}

function acceptExperimentPlan(value, manifest, reportSchema) {
  if (value === undefined) {
    throw new EffectivenessReportError('INVALID_EXPERIMENT_PLAN', [
      issue('/experiment_plan', 'required_context', 'a trusted experiment plan is required'),
    ]);
  }

  let plan;
  try {
    plan = structuredClone(value);
  } catch (error) {
    throw new EffectivenessReportError(
      'INVALID_EXPERIMENT_PLAN',
      [issue('/experiment_plan', 'invalid_value', `experiment plan cannot be cloned: ${error.message}`)],
      { cause: error },
    );
  }
  const planIssues = validateJsonSchema(plan, experimentPlanSchema(manifest, reportSchema)).map(
    (item) => ({
      ...item,
      path: item.path === '' ? '/experiment_plan' : `/experiment_plan${item.path}`,
    }),
  );
  if (planIssues.length > 0) {
    throw new EffectivenessReportError('INVALID_EXPERIMENT_PLAN', planIssues);
  }
  return plan;
}

function descriptorIsExposed(capability, exposed) {
  return exposed.some(
    (candidate) =>
      candidate.kind === capability.kind &&
      candidate.id === capability.id &&
      (candidate.version === undefined || candidate.version === capability.version),
  );
}

function duplicateIdentityIssues(values, collectionPath, field) {
  const seen = new Map();
  const issues = [];
  values.forEach((value, index) => {
    const identity = value?.[field];
    if (!seen.has(identity)) {
      seen.set(identity, index);
      return;
    }
    issues.push(
      issue(
        `/${collectionPath}/${index}/${field}`,
        'duplicate_id',
        `${field} duplicates an earlier ${collectionPath} entry`,
        { related_path: `/${collectionPath}/${seen.get(identity)}/${field}` },
      ),
    );
  });
  return issues;
}

function duplicateReferenceIssues(values, collectionPath) {
  const seen = new Map();
  const issues = [];
  values.forEach((value, index) => {
    if (!seen.has(value)) {
      seen.set(value, index);
      return;
    }
    issues.push(
      issue(
        `${collectionPath}/${index}`,
        'duplicate_reference',
        'reference duplicates an earlier entry',
        { related_path: `${collectionPath}/${seen.get(value)}` },
      ),
    );
  });
  return issues;
}

function semanticIssues(report, manifest, experimentPlan) {
  const issues = [];
  const expectedId = expectedReportId(report);
  if (expectedId !== undefined && report.report_id !== expectedId) {
    issues.push(
      issue('/report_id', 'report_id_mismatch', 'report id does not match its controlled dimensions', {
        expected: expectedId,
        actual: report.report_id,
      }),
    );
  }

  const declaredArms = new Set(manifest.modes);
  const armId = report.experiment.arm.id;
  if (!declaredArms.has(armId)) {
    issues.push(
      issue('/experiment/arm/id', 'unknown_experiment_arm', 'experiment arm is not declared', {
        expected: [...declaredArms],
        actual: armId,
      }),
    );
  } else {
    const plannedArm = experimentPlan.arms[armId];
    if (report.experiment.arm.definition_digest !== plannedArm.definition_digest) {
      issues.push(
        issue(
          '/experiment/arm/definition_digest',
          'arm_definition_mismatch',
          'arm definition digest does not match the trusted experiment plan',
          {
            expected: plannedArm.definition_digest,
            actual: report.experiment.arm.definition_digest,
          },
        ),
      );
    }
    for (const field of ['id', 'digest']) {
      if (report.experiment.capability_policy[field] !== plannedArm.capability_policy[field]) {
        issues.push(
          issue(
            `/experiment/capability_policy/${field}`,
            'capability_policy_mismatch',
            `capability policy ${field} does not match the trusted experiment plan`,
            {
              expected: plannedArm.capability_policy[field],
              actual: report.experiment.capability_policy[field],
            },
          ),
        );
      }
    }
    if (
      !isDeepStrictEqual(
        report.experiment.capability_policy.exposed,
        plannedArm.capability_policy.exposed,
      )
    ) {
      issues.push(
        issue(
          '/experiment/capability_policy/exposed',
          'capability_policy_mismatch',
          'exposed capabilities do not match the trusted experiment plan',
          {
            expected: plannedArm.capability_policy.exposed,
            actual: report.experiment.capability_policy.exposed,
          },
        ),
      );
    }
  }

  issues.push(...duplicateIdentityIssues(report.events, 'events', 'id'));
  issues.push(...duplicateIdentityIssues(report.events, 'events', 'sequence'));
  issues.push(...duplicateIdentityIssues(report.evidence, 'evidence', 'id'));

  const eventsById = new Map(report.events.map((event) => [event.id, event]));
  const eventIndexes = new Map(report.events.map((event, index) => [event.id, index]));
  const evidenceById = new Map(report.evidence.map((evidence) => [evidence.id, evidence]));

  report.events.forEach((event, eventIndex) => {
    if (eventIndex > 0 && event.sequence <= report.events[eventIndex - 1].sequence) {
      issues.push(
        issue(
          `/events/${eventIndex}/sequence`,
          'sequence_out_of_order',
          'event sequence must be strictly increasing in report order',
          { related_path: `/events/${eventIndex - 1}/sequence` },
        ),
      );
    }

    issues.push(
      ...duplicateReferenceIssues(
        event.evidence_refs ?? [],
        `/events/${eventIndex}/evidence_refs`,
      ),
    );

    for (const [referenceIndex, evidenceId] of (event.evidence_refs ?? []).entries()) {
      const evidence = evidenceById.get(evidenceId);
      const referencePath = `/events/${eventIndex}/evidence_refs/${referenceIndex}`;
      if (!evidence) {
        issues.push(issue(referencePath, 'reference_missing', 'referenced evidence does not exist'));
      } else if (evidence.event_id !== event.id) {
        issues.push(
          issue(referencePath, 'event_link_mismatch', 'evidence points to a different event', {
            related_path: `/evidence/${report.evidence.indexOf(evidence)}/event_id`,
          }),
        );
      }
    }

    if (
      event.type === 'capability_activation' &&
      !descriptorIsExposed(event.capability, report.experiment.capability_policy.exposed)
    ) {
      issues.push(
        issue(
          `/events/${eventIndex}/capability`,
          'capability_not_exposed',
          'activated capability is not exposed by the experiment policy',
        ),
      );
    }
  });

  report.evidence.forEach((evidence, evidenceIndex) => {
    if (evidence.objective_ref !== report.experiment.objective.id) {
      issues.push(
        issue(
          `/evidence/${evidenceIndex}/objective_ref`,
          'objective_mismatch',
          'evidence objective does not match the report objective',
          { expected: report.experiment.objective.id, actual: evidence.objective_ref },
        ),
      );
    }

    const event = eventsById.get(evidence.event_id);
    if (!event) {
      issues.push(
        issue(`/evidence/${evidenceIndex}/event_id`, 'reference_missing', 'referenced event does not exist'),
      );
    } else if (!(event.evidence_refs ?? []).includes(evidence.id)) {
      issues.push(
        issue(
          `/evidence/${evidenceIndex}/event_id`,
          'event_link_mismatch',
          'referenced event does not link back to this evidence',
          { related_path: `/events/${eventIndexes.get(event.id)}/evidence_refs` },
        ),
      );
    }
  });

  function checkEvidenceReference(reference, path, expectedSourceKind) {
    const evidence = evidenceById.get(reference);
    if (!evidence) {
      issues.push(issue(path, 'reference_missing', 'referenced evidence does not exist'));
      return;
    }
    if (expectedSourceKind !== undefined && evidence.source_kind !== expectedSourceKind) {
      issues.push(
        issue(path, 'reference_source_mismatch', 'evidence source kind is not valid for this reference', {
          expected: expectedSourceKind,
          actual: evidence.source_kind,
        }),
      );
    }
  }

  if (report.final_result.final_output_ref !== undefined) {
    checkEvidenceReference(
      report.final_result.final_output_ref,
      '/final_result/final_output_ref',
    );
  }
  if (report.final_result.model_claim !== undefined) {
    checkEvidenceReference(
      report.final_result.model_claim.evidence_ref,
      '/final_result/model_claim/evidence_ref',
      'model_self_report',
    );
  }
  issues.push(
    ...duplicateReferenceIssues(
      report.final_result.artifact_refs,
      '/final_result/artifact_refs',
    ),
    ...duplicateReferenceIssues(
      report.final_result.verifier_result_refs,
      '/final_result/verifier_result_refs',
    ),
  );
  report.final_result.verifier_result_refs.forEach((reference, index) => {
    checkEvidenceReference(
      reference,
      `/final_result/verifier_result_refs/${index}`,
      'independent_verifier',
    );
  });

  return issues;
}

function loadContract(rootDir) {
  try {
    return loadEffectivenessContract(rootDir);
  } catch (error) {
    if (error instanceof EffectivenessReportError) throw error;
    throw new EffectivenessReportError(
      'INVALID_CONTRACT',
      (error.issues ?? [error.message]).map((message) =>
        issue('', 'invalid_contract', String(message)),
      ),
      { cause: error },
    );
  }
}

function acceptReport(input, options) {
  const report = decodeInput(input);
  const { manifest, reportContract } = loadContract(options.rootDir);
  const compatibilityError = compatibilityFailure(report, reportContract.compatibility);
  if (compatibilityError) throw compatibilityError;

  const structuralIssues = validateJsonSchema(report, reportContract.schema);
  if (structuralIssues.length > 0) {
    throw new EffectivenessReportError('INVALID_REPORT', structuralIssues);
  }

  const experimentPlan = acceptExperimentPlan(
    options.experimentPlan,
    manifest,
    reportContract.schema,
  );
  const internalIssues = semanticIssues(report, manifest, experimentPlan);
  if (internalIssues.length > 0) {
    throw new EffectivenessReportError('INVALID_REPORT', internalIssues);
  }
  return report;
}

export function parseEffectivenessReport(input, options = {}) {
  return acceptReport(input, { rootDir: process.cwd(), ...options });
}

export function createEffectivenessReport(input, options = {}) {
  const observed = cloneInput(input);
  if (!isPlainObject(observed)) {
    throw new EffectivenessReportError('INVALID_REPORT', [
      issue('', 'type', 'constructor input must be an object'),
    ]);
  }

  const ownedIssues = CONSTRUCTOR_OWNED_FIELDS.filter((field) => Object.hasOwn(observed, field)).map(
    (field) =>
      issue(`/${field}`, 'constructor_owned', `${field} is generated by createEffectivenessReport`),
  );
  if (ownedIssues.length > 0) {
    throw new EffectivenessReportError('INVALID_REPORT', ownedIssues);
  }

  const report = {
    schema_version: REPORT_SCHEMA_VERSION,
    contract: REPORT_CONTRACT,
    ...observed,
  };
  const reportId = expectedReportId(report);
  if (reportId !== undefined) report.report_id = reportId;
  if (isPlainObject(report.final_result)) {
    report.final_result = {
      artifact_refs: [],
      verifier_result_refs: [],
      ...report.final_result,
    };
  }

  return acceptReport(report, { rootDir: process.cwd(), ...options });
}
