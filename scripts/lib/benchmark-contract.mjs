import fs from 'node:fs';
import path from 'node:path';

import { oracleCheckIssues } from './run-report.mjs';

const MANIFEST_PATH = 'evals/skills-suite/manifest.json';

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

function validateScoringModel(scoringModel, issues) {
  if (!scoringModel || typeof scoringModel !== 'object' || Array.isArray(scoringModel)) {
    issues.push('manifest.scoring_model is required');
    return;
  }
  if (!Array.isArray(scoringModel.axes)) issues.push('manifest.scoring_model.axes must be an array');
  if (!scoringModel.grade_thresholds || typeof scoringModel.grade_thresholds !== 'object') {
    issues.push('manifest.scoring_model.grade_thresholds is required');
  }
  for (const axis of scoringModel.axes ?? []) {
    if (typeof axis.id !== 'string' || axis.id.length === 0) issues.push('manifest.scoring_model.axes[].id is required');
    if (typeof axis.label !== 'string' || axis.label.length === 0) {
      issues.push(`${axis.id}: scoring axis label is required`);
    }
    if (typeof axis.weight !== 'number' || axis.weight <= 0) {
      issues.push(`${axis.id}: scoring axis weight must be positive`);
    }
  }
}

export function loadBenchmarkContract(rootDir, registry) {
  const issues = [];
  const manifestFile = path.join(rootDir, MANIFEST_PATH);
  const manifest = readJson(manifestFile, issues, MANIFEST_PATH);
  const registrySkills = new Set((registry.skills ?? []).map((skill) => skill.name));
  const coveredSkills = new Set();
  const caseIds = new Set();

  if (manifest.version !== 2) issues.push('manifest.version must be 2');
  if (manifest.name !== 'forge-skills-suite-benchmark') {
    issues.push('manifest.name must be forge-skills-suite-benchmark');
  }
  if (manifest.report_schema !== 'evals/skills-suite/report.schema.json') {
    issues.push('manifest.report_schema must point to report.schema.json');
  } else if (!fs.existsSync(path.join(rootDir, manifest.report_schema))) {
    issues.push(`${manifest.report_schema}: missing`);
  }
  if (!Number.isInteger(manifest.minimum_cases) || manifest.minimum_cases < 10) {
    issues.push('manifest.minimum_cases must be an integer of at least 10');
  }
  if (!Array.isArray(manifest.cases)) {
    issues.push('manifest.cases must be an array');
  } else if (manifest.cases.length < (manifest.minimum_cases ?? 10)) {
    issues.push(`manifest must contain at least ${manifest.minimum_cases} cases`);
  }
  validateScoringModel(manifest.scoring_model, issues);

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
    if (
      typeof testCase.fixture !== 'string' ||
      !fs.existsSync(path.join(rootDir, testCase.fixture))
    ) {
      issues.push(`${testCase.id}: fixture is missing`);
    }
    for (const field of ['expected_skills', 'expected_artifacts', 'required_evidence', 'forbidden_behaviors']) {
      if (!stringArray(testCase[field])) issues.push(`${testCase.id}: ${field} must contain only non-empty strings`);
    }
    // forbidden_files is optional; when present it enumerates files/globs the
    // agent must NOT create, checked against independent disk + event evidence.
    if ('forbidden_files' in testCase && !stringArray(testCase.forbidden_files)) {
      issues.push(`${testCase.id}: forbidden_files must contain only non-empty strings`);
    }

    for (const skillName of testCase.expected_skills ?? []) {
      if (!registrySkills.has(skillName)) issues.push(`${testCase.id}: unknown expected skill ${skillName}`);
      coveredSkills.add(skillName);
    }
    issues.push(...oracleCheckIssues(testCase, registrySkills));

    const expectsChangeUnit = (testCase.expected_artifacts ?? []).some((artifact) =>
      artifact.startsWith('docs/change-units/'),
    );
    if (
      expectsChangeUnit &&
      !(testCase.oracle_checks ?? []).some((check) => check.type === 'change_unit_reported')
    ) {
      issues.push(`${testCase.id}: mutating case must check Change Unit reporting`);
    }
    for (const check of testCase.oracle_checks ?? []) {
      if (check.type === 'goal_verified' && !(testCase.expected_artifacts ?? []).includes(check.target)) {
        issues.push(`${testCase.id}: goal_verification target ${check.target} must be listed in expected_artifacts`);
      }
    }
  }

  for (const skillName of registrySkills) {
    if (!coveredSkills.has(skillName)) issues.push(`manifest does not cover ${skillName}`);
  }

  if (issues.length > 0) {
    const error = new Error(`Invalid benchmark contract (${issues.length} issues)`);
    error.issues = issues;
    throw error;
  }

  return { manifest, coveredSkills };
}
