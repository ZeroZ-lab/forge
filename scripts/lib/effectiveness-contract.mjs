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
  'small-feature',
  'bugfix',
  'frontend-buy-vs-build',
  'delegation',
  'learn-boundary',
];

function stringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
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
  const caseIds = new Set();
  const scenarios = new Set();

  if (manifest.version !== 1) issues.push('manifest.version must be 1');
  if (manifest.name !== 'forge-effectiveness-suite') {
    issues.push('manifest.name must be forge-effectiveness-suite');
  }
  if (!Number.isInteger(manifest.minimum_cases) || manifest.minimum_cases < REQUIRED_SCENARIOS.length) {
    issues.push(`manifest.minimum_cases must be at least ${REQUIRED_SCENARIOS.length}`);
  }
  if (!Number.isInteger(manifest.required_repeats) || manifest.required_repeats < 2) {
    issues.push('manifest.required_repeats must be at least 2');
  }
  if (!Array.isArray(manifest.modes) || !manifest.modes.includes('forge') || !manifest.modes.includes('no-forge')) {
    issues.push('manifest.modes must include forge and no-forge');
  }
  for (const metric of REQUIRED_METRICS) {
    if (!manifest.metrics?.includes(metric)) issues.push(`manifest.metrics missing ${metric}`);
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
  }

  for (const scenario of REQUIRED_SCENARIOS) {
    if (!scenarios.has(scenario)) issues.push(`manifest does not cover scenario ${scenario}`);
  }

  if (issues.length > 0) {
    const error = new Error(`Invalid effectiveness contract (${issues.length} issues)`);
    error.issues = issues;
    throw error;
  }

  return { manifest, coveredScenarios: scenarios };
}
