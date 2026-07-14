import fs from 'node:fs';
import path from 'node:path';

const MANIFEST_PATH = 'evals/effectiveness-suite/manifest.json';
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
const ALLOWED_MANIFEST_FIELDS = new Set([
  'version',
  'name',
  'description',
  'minimum_cases',
  'required_repeats',
  'modes',
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

function stringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
}

function requireExactList(value, expected, label, issues) {
  if (!stringArray(value) || JSON.stringify(value) !== JSON.stringify(expected)) {
    issues.push(`${label} must equal ${expected.join(', ')}`);
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

export function loadEffectivenessContract(rootDir) {
  const issues = [];
  const manifestFile = path.join(rootDir, MANIFEST_PATH);
  const manifest = readJson(manifestFile, issues, MANIFEST_PATH);
  const kernelContract = manifest.kernel_contract;
  const caseIds = new Set();
  const scenarios = new Set();

  requireExactFields(manifest, ALLOWED_MANIFEST_FIELDS, 'manifest', issues);
  if (manifest.version !== 2) issues.push('manifest.version must be 2');
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
  requireExactList(manifest.modes, ['forge', 'no-forge'], 'manifest.modes', issues);
  requireExactList(manifest.metrics, REQUIRED_METRICS, 'manifest.metrics', issues);

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
        ['forge', 'no-forge'],
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

  return { manifest, kernelContract, coveredScenarios: scenarios };
}
