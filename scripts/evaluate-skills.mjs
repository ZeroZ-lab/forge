#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const failures = [];
const allowedCheckTypes = new Set([
  'artifact_reported',
  'command_reported',
  'decision_gate_reported',
  'evidence_contains',
  'forbidden_behavior_absent',
  'skill_triggered',
]);

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(relativeOrAbsolutePath) {
  const filePath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(root, relativeOrAbsolutePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${relativeOrAbsolutePath}: cannot read JSON (${error.message})`);
    return {};
  }
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function arrayOfStrings(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
}

function parseArgs(argv) {
  const parsed = { allowPartial: false, reportPath: null, skipBlocked: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--report') {
      parsed.reportPath = argv[index + 1];
      index += 1;
      if (!parsed.reportPath) fail('--report requires a file path');
    } else if (arg === '--allow-partial') {
      parsed.allowPartial = true;
    } else if (arg === '--skip-blocked') {
      parsed.skipBlocked = true;
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function validateManifest(registry, manifest) {
  const registrySkills = new Set((registry.skills ?? []).map((skill) => skill.name));

  assert(manifest.version === 1, 'manifest.version must be 1');
  assert(manifest.name === 'forge-skills-suite-benchmark', 'manifest.name must be forge-skills-suite-benchmark');
  assert(manifest.report_schema === 'evals/skills-suite/report.schema.json', 'manifest.report_schema must point to report.schema.json');
  assert(exists(manifest.report_schema), `${manifest.report_schema}: missing`);
  assert(Array.isArray(manifest.cases), 'manifest.cases must be an array');
  assert(manifest.cases?.length >= manifest.minimum_cases, `manifest must contain at least ${manifest.minimum_cases} cases`);

  const caseIds = new Set();
  const coveredSkills = new Set();

  for (const testCase of manifest.cases ?? []) {
    assert(typeof testCase.id === 'string' && /^[a-z0-9-]+$/.test(testCase.id), 'case.id must be kebab-case');
    assert(!caseIds.has(testCase.id), `duplicate case id: ${testCase.id}`);
    caseIds.add(testCase.id);

    assert(typeof testCase.title === 'string' && testCase.title.length > 0, `${testCase.id}: title is required`);
    assert(typeof testCase.fixture === 'string' && exists(testCase.fixture), `${testCase.id}: fixture is missing`);
    assert(arrayOfStrings(testCase.expected_skills), `${testCase.id}: expected_skills must be non-empty strings`);
    assert(arrayOfStrings(testCase.expected_artifacts), `${testCase.id}: expected_artifacts must be non-empty strings`);
    assert(arrayOfStrings(testCase.required_evidence), `${testCase.id}: required_evidence must be non-empty strings`);
    assert(arrayOfStrings(testCase.forbidden_behaviors), `${testCase.id}: forbidden_behaviors must be non-empty strings`);
    assert(Array.isArray(testCase.oracle_checks) && testCase.oracle_checks.length > 0, `${testCase.id}: oracle_checks are required`);

    for (const skillName of testCase.expected_skills ?? []) {
      assert(registrySkills.has(skillName), `${testCase.id}: unknown expected skill ${skillName}`);
      coveredSkills.add(skillName);
    }

    for (const check of testCase.oracle_checks ?? []) {
      assert(check && typeof check === 'object' && !Array.isArray(check), `${testCase.id}: oracle check must be an object`);
      assert(allowedCheckTypes.has(check.type), `${testCase.id}: unknown oracle check type ${check.type}`);
      if (check.type === 'skill_triggered') assert(registrySkills.has(check.skill), `${testCase.id}: unknown oracle skill ${check.skill}`);
      if (check.type === 'artifact_reported') assert(typeof check.path === 'string' && check.path.length > 0, `${testCase.id}: artifact_reported.path is required`);
      if (check.type === 'command_reported') assert(typeof check.command === 'string' && check.command.length > 0, `${testCase.id}: command_reported.command is required`);
      if (check.type === 'decision_gate_reported') assert(typeof check.decision === 'string' && check.decision.length > 0, `${testCase.id}: decision_gate_reported.decision is required`);
      if (check.type === 'evidence_contains') assert(typeof check.text === 'string' && check.text.length > 0, `${testCase.id}: evidence_contains.text is required`);
      if (check.type === 'forbidden_behavior_absent') assert(typeof check.behavior === 'string' && check.behavior.length > 0, `${testCase.id}: forbidden_behavior_absent.behavior is required`);
    }
  }

  for (const skillName of registrySkills) {
    assert(coveredSkills.has(skillName), `manifest does not cover ${skillName}`);
  }

  return { caseIds, coveredSkills };
}

function artifactPaths(run) {
  return new Set(
    (run.artifacts ?? []).map((artifact) => (typeof artifact === 'string' ? artifact : artifact?.path)).filter(Boolean),
  );
}

function globMatch(pattern, value) {
  if (!pattern.includes('*')) return value === pattern;
  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`).test(value);
}

function decisionIds(run) {
  return new Set(
    (run.decisions ?? []).map((decision) => (typeof decision === 'string' ? decision : decision?.id)).filter(Boolean),
  );
}

function evidenceText(run) {
  return [...(run.evidence ?? []), run.notes ?? ''].join('\n');
}

function checkRun(testCase, run) {
  const triggeredSkills = new Set(run.triggered_skills ?? []);
  const artifacts = artifactPaths(run);
  const commands = new Set(run.commands_run ?? []);
  const decisions = decisionIds(run);
  const forbiddenBehaviors = new Set(run.forbidden_behaviors ?? []);
  const evidence = evidenceText(run);
  const results = [];

  for (const check of testCase.oracle_checks) {
    let passed = false;
    if (check.type === 'skill_triggered') passed = triggeredSkills.has(check.skill);
    if (check.type === 'artifact_reported') {
      passed = [...artifacts].some((artifactPath) => globMatch(check.path, artifactPath));
    }
    if (check.type === 'command_reported') passed = commands.has(check.command);
    if (check.type === 'decision_gate_reported') passed = decisions.has(check.decision);
    if (check.type === 'evidence_contains') passed = evidence.includes(check.text);
    if (check.type === 'forbidden_behavior_absent') passed = !forbiddenBehaviors.has(check.behavior);
    results.push({ passed, check });
  }

  return results;
}

function validateReport(manifest, registry, report, options = {}) {
  assert(report.version === 1, 'report.version must be 1');
  assert(report.suite === 'forge', 'report.suite must be forge');
  assert(typeof report.run_id === 'string' && report.run_id.length > 0, 'report.run_id is required');
  assert(Array.isArray(report.cases), 'report.cases must be an array');

  const registrySkills = new Set((registry.skills ?? []).map((skill) => skill.name));
  const manifestById = new Map((manifest.cases ?? []).map((testCase) => [testCase.id, testCase]));
  const runsByCase = new Map();

  for (const run of report.cases ?? []) {
    assert(typeof run.case_id === 'string' && manifestById.has(run.case_id), `report has unknown case_id ${run.case_id}`);
    assert(!runsByCase.has(run.case_id), `report has duplicate case_id ${run.case_id}`);
    runsByCase.set(run.case_id, run);

    assert(['pass', 'fail', 'blocked'].includes(run.status), `${run.case_id}: status must be pass, fail, or blocked`);
    assert(arrayOfStrings(run.triggered_skills), `${run.case_id}: triggered_skills must be strings`);
    assert(arrayOfStrings(run.commands_run), `${run.case_id}: commands_run must be strings`);
    assert(Array.isArray(run.artifacts), `${run.case_id}: artifacts must be an array`);
    assert(Array.isArray(run.evidence), `${run.case_id}: evidence must be an array`);

    for (const skillName of run.triggered_skills ?? []) {
      assert(registrySkills.has(skillName), `${run.case_id}: unknown triggered skill ${skillName}`);
    }
  }

  let passedChecks = 0;
  let blockedSkipped = 0;
  let totalChecks = 0;
  let scoredCases = 0;

  for (const testCase of manifest.cases ?? []) {
    const run = runsByCase.get(testCase.id);
    if (!run && options.allowPartial) continue;
    assert(run, `report missing case ${testCase.id}`);
    if (!run) continue;
    if (run.status === 'blocked' && options.skipBlocked) {
      blockedSkipped += 1;
      continue;
    }
    scoredCases += 1;

    if (run.status !== 'pass') fail(`${testCase.id}: status is ${run.status}`);

    for (const result of checkRun(testCase, run)) {
      totalChecks += 1;
      if (result.passed) {
        passedChecks += 1;
      } else {
        fail(`${testCase.id}: failed oracle ${JSON.stringify(result.check)}`);
      }
    }
  }

  assert(scoredCases > 0, 'report did not include any scored benchmark cases');
  return { blockedSkipped, passedChecks, scoredCases, totalChecks };
}

const args = parseArgs(process.argv.slice(2));
const registry = readJson('registry.yaml');
const manifest = readJson('evals/skills-suite/manifest.json');
const { coveredSkills } = validateManifest(registry, manifest);

if (failures.length > 0) {
  console.error('Forge skills-suite evaluation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Forge skills-suite benchmark contract passed (${manifest.cases.length} cases, ${coveredSkills.size} skills covered).`);

if (!args.reportPath) {
  console.log('No run report supplied; behavioral effectiveness is not claimed.');
  process.exit(0);
}

const report = readJson(args.reportPath);
const score = validateReport(manifest, registry, report, {
  allowPartial: args.allowPartial,
  skipBlocked: args.skipBlocked,
});

if (failures.length > 0) {
  console.error('\nForge skills-suite report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const blockedSuffix = score.blockedSkipped > 0 ? `, ${score.blockedSkipped} blocked skipped` : '';
console.log(`Forge skills-suite report passed (${score.scoredCases} cases${blockedSuffix}, ${score.passedChecks}/${score.totalChecks} oracle checks).`);
