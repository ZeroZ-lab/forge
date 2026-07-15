import fs from 'node:fs';
import path from 'node:path';

import { inspectJsonSchemaSupport } from './json-schema-subset.mjs';

const MANIFEST_PATH = 'evals/effectiveness-suite/manifest.json';
const REPORT_SCHEMA_PATH = 'evals/effectiveness-suite/report.schema.json';
const REPORT_COMPATIBILITY_PATH = 'evals/effectiveness-suite/report.compatibility.json';
const REPORT_CONTRACT = 'forge-effectiveness-report';
const REPORT_SCHEMA_VERSION = 1;
const REQUIRED_MIGRATION_REQUIREMENTS = [
  'preserve the source report digest and original contract version',
  'never infer missing model, arm, workspace, budget, verifier, or evidence provenance',
  'revalidate the complete migrated report against the current schema',
];
const REQUIRED_REPORT_FIELDS = [
  'schema_version',
  'contract',
  'report_id',
  'experiment',
  'execution',
  'events',
  'evidence',
  'final_result',
  'costs',
];
const REQUIRED_METRICS = [
  'goal_completion',
  'scope_control',
  'verification_strength',
  'doc_drift',
  'human_reviewability',
];
const REQUIRED_SCENARIOS = [
  'direct-action',
  'small-feature',
  'bugfix',
  'frontend-buy-vs-build',
  'delegation',
  'learn-boundary',
];
const REQUIRED_KERNEL_OWNS = [
  'objective',
  'permissions',
  'scope',
  'authoritative_facts',
  'evidence',
  'task_state',
  'completion_conditions',
];
const REQUIRED_KERNEL_NON_CONTROL = [
  'lifecycle_stage',
  'skill_selection',
  'implementation_strategy',
  'model_internal_reasoning',
];
const REQUIRED_ACTION_PATHS = [
  'direct_action',
  'optional_skill',
  'skip_skill',
  'reject_irrelevant_capability',
];
const REQUIRED_SUCCESS_BASIS = [
  'verified_outcome',
  'safety',
  'valid_evidence',
];
const REQUIRED_FORBIDDEN_PROXIES = [
  'fixed_skill_hit_rate',
  'fixed_stage_completion',
  'model_name_capability_order',
];
const REQUIRED_CONTROLLED_DIMENSIONS = [
  'model',
  'fixture',
  'workspace_revision',
  'budget',
  'verifier',
];
const REQUIRED_ARM_IDS = [
  'no-forge',
  'kernel-only',
  'adaptive-full',
  'legacy-chain',
];
const REQUIRED_ARM_DEFINITIONS = {
  'no-forge': {
    capability_mode: 'no-forge',
    model_action_policy: 'autonomous',
    skill_activation: 'forbidden',
  },
  'kernel-only': {
    capability_mode: 'kernel-only',
    model_action_policy: 'autonomous',
    skill_activation: 'forbidden',
    kernel_version: '1',
  },
  'adaptive-full': {
    capability_mode: 'kernel-and-published-skills',
    model_action_policy: 'autonomous',
    skill_activation: 'optional',
    kernel_version: '1',
  },
  'legacy-chain': {
    capability_mode: 'legacy-capsule',
    model_action_policy: 'pinned-default-chain',
    skill_activation: 'legacy-controlled',
    baseline_version: '0.52.0',
    baseline_tree: 'git-tree-sha1:516a67e49c8c5e564be1671396bad6edadaef4f2',
    default_chain: ['detail', 'codegen', 'review'],
  },
};
const ALLOWED_MANIFEST_FIELDS = new Set([
  'version',
  'name',
  'description',
  'minimum_cases',
  'required_repeats',
  'modes',
  'arm_definitions',
  'report_schema',
  'report_compatibility',
  'metrics',
  'kernel_contract',
  'cases',
]);
const ALLOWED_KERNEL_FIELDS = new Set([
  'version',
  'kernel_owns',
  'kernel_must_not_control',
  'legal_action_paths',
  'success_basis',
  'forbidden_success_proxies',
  'non_interference',
]);
const ALLOWED_NON_INTERFERENCE_FIELDS = new Set([
  'comparison_unit',
  'arms',
  'controlled_dimensions',
  'model_capability_ordering',
  'judged_by',
]);
const ALLOWED_CASE_FIELDS = new Set([
  'id',
  'title',
  'scenario',
  'fixture',
  'success_signals',
  'failure_signals',
  'human_review_prompts',
]);
const ALLOWED_COMPATIBILITY_FIELDS = new Set([
  'contract',
  'policy_version',
  'current_version',
  'directly_accepted_versions',
  'unknown_version',
  'migration_policy',
  'migrations',
  'foreign_contracts',
  'samples',
]);

function stringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
}

function requireExactList(value, expected, label, issues) {
  if (!stringArray(value) || JSON.stringify(value) !== JSON.stringify(expected)) {
    issues.push(`${label} must equal ${expected.join(', ')}`);
  }
}

function requireSameStringSet(value, expected, label, issues) {
  if (
    !stringArray(value) ||
    JSON.stringify([...value].sort()) !== JSON.stringify([...expected].sort())
  ) {
    issues.push(`${label} must contain exactly ${expected.join(', ')}`);
  }
}

function requireExactFields(value, allowed, label, issues) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) issues.push(`${label} contains unsupported field ${field}`);
  }
}

function readJson(filePath, issues, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    issues.push(`${label}: cannot read JSON (${error.message})`);
    return {};
  }
}

function resolveLocalRef(root, reference) {
  if (typeof reference !== 'string' || !reference.startsWith('#/')) return undefined;
  let value = root;
  for (const encodedSegment of reference.slice(2).split('/')) {
    const segment = encodedSegment.replaceAll('~1', '/').replaceAll('~0', '~');
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, segment)) return undefined;
    value = value[segment];
  }
  return value;
}

function validateLocalRefs(value, root, label, issues) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateLocalRefs(item, root, `${label}[${index}]`, issues));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Object.hasOwn(value, '$ref')) {
    const target = resolveLocalRef(root, value.$ref);
    if (
      target === undefined ||
      (target !== true && target !== false && (typeof target !== 'object' || Array.isArray(target)))
    ) {
      issues.push(`${label}: unresolved local $ref ${String(value.$ref)}`);
    }
  }
  for (const [field, child] of Object.entries(value)) {
    validateLocalRefs(child, root, `${label}.${field}`, issues);
  }
}

export function loadEffectivenessContract(rootDir) {
  const issues = [];
  const manifestFile = path.join(rootDir, MANIFEST_PATH);
  const manifest = readJson(manifestFile, issues, MANIFEST_PATH);
  const reportSchema = readJson(
    path.join(rootDir, REPORT_SCHEMA_PATH),
    issues,
    REPORT_SCHEMA_PATH,
  );
  const reportCompatibility = readJson(
    path.join(rootDir, REPORT_COMPATIBILITY_PATH),
    issues,
    REPORT_COMPATIBILITY_PATH,
  );
  const kernelContract = manifest.kernel_contract;
  const caseIds = new Set();
  const scenarios = new Set();

  requireExactFields(manifest, ALLOWED_MANIFEST_FIELDS, 'manifest', issues);
  if (manifest.version !== 4) issues.push('manifest.version must be 4');
  if (manifest.name !== 'forge-effectiveness-suite') {
    issues.push('manifest.name must be forge-effectiveness-suite');
  }
  if (typeof manifest.description !== 'string' || manifest.description.length === 0) {
    issues.push('manifest.description is required');
  }
  if (!Number.isInteger(manifest.minimum_cases) || manifest.minimum_cases < REQUIRED_SCENARIOS.length) {
    issues.push(`manifest.minimum_cases must be at least ${REQUIRED_SCENARIOS.length}`);
  }
  if (!Number.isInteger(manifest.required_repeats) || manifest.required_repeats < 2) {
    issues.push('manifest.required_repeats must be at least 2');
  }
  requireExactList(manifest.modes, REQUIRED_ARM_IDS, 'manifest.modes', issues);
  if (JSON.stringify(manifest.arm_definitions) !== JSON.stringify(REQUIRED_ARM_DEFINITIONS)) {
    issues.push('manifest.arm_definitions must pin the four mutually exclusive arm definitions');
  }
  if (manifest.report_schema !== REPORT_SCHEMA_PATH) {
    issues.push(`manifest.report_schema must be ${REPORT_SCHEMA_PATH}`);
  }
  if (manifest.report_compatibility !== REPORT_COMPATIBILITY_PATH) {
    issues.push(`manifest.report_compatibility must be ${REPORT_COMPATIBILITY_PATH}`);
  }
  requireExactList(manifest.metrics, REQUIRED_METRICS, 'manifest.metrics', issues);

  if (reportSchema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    issues.push(`${REPORT_SCHEMA_PATH} must use JSON Schema draft 2020-12`);
  }
  if (reportSchema.type !== 'object' || reportSchema.additionalProperties !== false) {
    issues.push(`${REPORT_SCHEMA_PATH} must be a fail-closed object schema`);
  }
  requireSameStringSet(
    reportSchema.required,
    REQUIRED_REPORT_FIELDS,
    `${REPORT_SCHEMA_PATH}.required`,
    issues,
  );
  if (reportSchema.properties?.schema_version?.const !== REPORT_SCHEMA_VERSION) {
    issues.push(`${REPORT_SCHEMA_PATH}.schema_version must be ${REPORT_SCHEMA_VERSION}`);
  }
  if (reportSchema.properties?.contract?.const !== REPORT_CONTRACT) {
    issues.push(`${REPORT_SCHEMA_PATH}.contract must be ${REPORT_CONTRACT}`);
  }
  validateLocalRefs(reportSchema, reportSchema, REPORT_SCHEMA_PATH, issues);
  for (const supportIssue of inspectJsonSchemaSupport(reportSchema)) {
    issues.push(`${REPORT_SCHEMA_PATH}: ${supportIssue}`);
  }
  requireSameStringSet(
    reportSchema.$defs?.evidenceReference?.properties?.source_kind?.enum,
    ['model_self_report', 'tool_output', 'independent_verifier'],
    `${REPORT_SCHEMA_PATH}.evidence source kinds`,
    issues,
  );

  requireExactFields(
    reportCompatibility,
    ALLOWED_COMPATIBILITY_FIELDS,
    REPORT_COMPATIBILITY_PATH,
    issues,
  );
  for (const field of ALLOWED_COMPATIBILITY_FIELDS) {
    if (!Object.hasOwn(reportCompatibility, field)) {
      issues.push(`${REPORT_COMPATIBILITY_PATH}.${field} is required`);
    }
  }
  if (reportCompatibility.contract !== REPORT_CONTRACT) {
    issues.push(`${REPORT_COMPATIBILITY_PATH}.contract must be ${REPORT_CONTRACT}`);
  }
  if (reportCompatibility.policy_version !== 1) {
    issues.push(`${REPORT_COMPATIBILITY_PATH}.policy_version must be 1`);
  }
  if (reportCompatibility.current_version !== REPORT_SCHEMA_VERSION) {
    issues.push(`${REPORT_COMPATIBILITY_PATH}.current_version must match the report schema`);
  }
  if (
    JSON.stringify(reportCompatibility.directly_accepted_versions) !==
    JSON.stringify([REPORT_SCHEMA_VERSION])
  ) {
    issues.push(
      `${REPORT_COMPATIBILITY_PATH}.directly_accepted_versions must equal ${REPORT_SCHEMA_VERSION}`,
    );
  }
  if (reportCompatibility.unknown_version?.disposition !== 'reject') {
    issues.push(`${REPORT_COMPATIBILITY_PATH}.unknown_version must be rejected`);
  }
  if (!Array.isArray(reportCompatibility.migrations) || reportCompatibility.migrations.length !== 0) {
    issues.push(
      `${REPORT_COMPATIBILITY_PATH}.migrations must remain empty until an explicit adapter is versioned`,
    );
  }
  if (reportCompatibility.migration_policy?.mode !== 'explicit_adapter_only') {
    issues.push(`${REPORT_COMPATIBILITY_PATH}.migration_policy must forbid implicit migration`);
  }
  if (
    !stringArray(reportCompatibility.migration_policy?.requirements) ||
    JSON.stringify([...reportCompatibility.migration_policy.requirements].sort()) !==
      JSON.stringify([...REQUIRED_MIGRATION_REQUIREMENTS].sort())
  ) {
    issues.push(`${REPORT_COMPATIBILITY_PATH}.migration requirements must preserve provenance`);
  }
  const legacySkillsSuite = reportCompatibility.foreign_contracts?.find(
    (entry) => entry?.contract === 'forge-skills-suite',
  );
  if (
    JSON.stringify(legacySkillsSuite?.versions) !== JSON.stringify([2]) ||
    legacySkillsSuite?.disposition !== 'incompatible' ||
    legacySkillsSuite?.diagnostic !== 'rerun_required_missing_effectiveness_provenance' ||
    JSON.stringify(legacySkillsSuite?.discriminator?.required_values) !==
      JSON.stringify({ version: 2, suite: 'forge' }) ||
    JSON.stringify(legacySkillsSuite?.discriminator?.required_fields) !==
      JSON.stringify(['run_id', 'cases']) ||
    JSON.stringify(legacySkillsSuite?.discriminator?.forbidden_fields) !==
      JSON.stringify(['schema_version', 'contract', 'experiment'])
  ) {
    issues.push(`${REPORT_COMPATIBILITY_PATH} must reject legacy skills-suite v2 as incompatible`);
  }
  const expectedSamples = new Set(['valid_current', 'missing_required', 'legacy_incompatible']);
  const actualSamples = Object.keys(reportCompatibility.samples ?? {});
  if (
    actualSamples.length !== expectedSamples.size ||
    actualSamples.some((sampleName) => !expectedSamples.has(sampleName))
  ) {
    issues.push(`${REPORT_COMPATIBILITY_PATH}.samples must contain the current contract corpus`);
  }
  for (const [sampleName, samplePath] of Object.entries(reportCompatibility.samples ?? {})) {
    if (typeof samplePath !== 'string' || !fs.existsSync(path.join(rootDir, samplePath))) {
      issues.push(`${REPORT_COMPATIBILITY_PATH}.samples.${sampleName} is missing`);
    }
  }

  if (!kernelContract || typeof kernelContract !== 'object' || Array.isArray(kernelContract)) {
    issues.push('manifest.kernel_contract must be an object');
  } else {
    requireExactFields(
      kernelContract,
      ALLOWED_KERNEL_FIELDS,
      'manifest.kernel_contract',
      issues,
    );
    if (kernelContract.version !== 1) issues.push('manifest.kernel_contract.version must be 1');
    requireExactList(
      kernelContract.kernel_owns,
      REQUIRED_KERNEL_OWNS,
      'manifest.kernel_contract.kernel_owns',
      issues,
    );
    requireExactList(
      kernelContract.kernel_must_not_control,
      REQUIRED_KERNEL_NON_CONTROL,
      'manifest.kernel_contract.kernel_must_not_control',
      issues,
    );
    requireExactList(
      kernelContract.legal_action_paths,
      REQUIRED_ACTION_PATHS,
      'manifest.kernel_contract.legal_action_paths',
      issues,
    );
    requireExactList(
      kernelContract.success_basis,
      REQUIRED_SUCCESS_BASIS,
      'manifest.kernel_contract.success_basis',
      issues,
    );
    requireExactList(
      kernelContract.forbidden_success_proxies,
      REQUIRED_FORBIDDEN_PROXIES,
      'manifest.kernel_contract.forbidden_success_proxies',
      issues,
    );

    const nonInterference = kernelContract.non_interference;
    if (!nonInterference || typeof nonInterference !== 'object' || Array.isArray(nonInterference)) {
      issues.push('manifest.kernel_contract.non_interference must be an object');
    } else {
      requireExactFields(
        nonInterference,
        ALLOWED_NON_INTERFERENCE_FIELDS,
        'manifest.kernel_contract.non_interference',
        issues,
      );
      if (nonInterference.comparison_unit !== 'paired_same_model') {
        issues.push('manifest.kernel_contract.non_interference.comparison_unit must be paired_same_model');
      }
      requireExactList(
        nonInterference.arms,
        REQUIRED_ARM_IDS,
        'manifest.kernel_contract.non_interference.arms',
        issues,
      );
      requireExactList(
        nonInterference.controlled_dimensions,
        REQUIRED_CONTROLLED_DIMENSIONS,
        'manifest.kernel_contract.non_interference.controlled_dimensions',
        issues,
      );
      if (nonInterference.model_capability_ordering !== 'none') {
        issues.push('manifest.kernel_contract.non_interference.model_capability_ordering must be none');
      }
      requireExactList(
        nonInterference.judged_by,
        REQUIRED_SUCCESS_BASIS,
        'manifest.kernel_contract.non_interference.judged_by',
        issues,
      );
    }
  }
  if (!Array.isArray(manifest.cases)) {
    issues.push('manifest.cases must be an array');
  } else if (manifest.cases.length < (manifest.minimum_cases ?? REQUIRED_SCENARIOS.length)) {
    issues.push(`manifest must contain at least ${manifest.minimum_cases} cases`);
  }

  for (const testCase of manifest.cases ?? []) {
    if (typeof testCase.id !== 'string' || !/^[a-z0-9-]+$/.test(testCase.id)) {
      issues.push('case.id must be kebab-case');
    } else if (caseIds.has(testCase.id)) {
      issues.push(`duplicate case id: ${testCase.id}`);
    } else {
      caseIds.add(testCase.id);
    }

    if (typeof testCase.title !== 'string' || testCase.title.length === 0) {
      issues.push(`${testCase.id}: title is required`);
    }
    if (!REQUIRED_SCENARIOS.includes(testCase.scenario)) {
      issues.push(`${testCase.id}: scenario must be one of ${REQUIRED_SCENARIOS.join(', ')}`);
    } else {
      scenarios.add(testCase.scenario);
    }
    if (
      typeof testCase.fixture !== 'string' ||
      !fs.existsSync(path.join(rootDir, testCase.fixture))
    ) {
      issues.push(`${testCase.id}: fixture is missing`);
    }
    for (const field of ['success_signals', 'failure_signals', 'human_review_prompts']) {
      if (!stringArray(testCase[field])) issues.push(`${testCase.id}: ${field} must contain only non-empty strings`);
    }
    for (const field of Object.keys(testCase)) {
      if (!ALLOWED_CASE_FIELDS.has(field)) {
        issues.push(`${testCase.id}: path-dependent or unsupported success condition field ${field} is forbidden`);
      }
    }
  }

  for (const scenario of REQUIRED_SCENARIOS) {
    if (!scenarios.has(scenario)) issues.push(`manifest does not cover scenario ${scenario}`);
  }

  if (issues.length > 0) {
    const error = new Error(`Invalid effectiveness contract (${issues.length} issues)`);
    error.issues = issues;
    throw error;
  }

  return {
    manifest,
    kernelContract,
    armDefinitions: manifest.arm_definitions,
    coveredScenarios: scenarios,
    reportContract: {
      schema: reportSchema,
      compatibility: reportCompatibility,
    },
  };
}
