#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { loadRegistry } from '../lib/registry.mjs';

const root = process.cwd();
const failures = [];
const allowedCheckTypes = new Set([
  'artifact_reported',
  'change_unit_reported',
  'goal_covers',
  'command_reported',
  'decision_gate_reported',
  'goal_verified',
  'evidence_contains',
  'forbidden_behavior_absent',
  'skill_triggered',
]);
const checkAxis = {
  artifact_reported: 'artifacts',
  change_unit_reported: 'traceability',
  goal_covers: 'traceability',
  command_reported: 'verification',
  decision_gate_reported: 'decisions',
  goal_verified: 'goal_verification',
  evidence_contains: 'verification',
  forbidden_behavior_absent: 'scope_control',
  skill_triggered: 'routing',
};
const defaultScoringModel = {
  version: 1,
  grade_thresholds: { A: 90, B: 80, C: 70, D: 60, F: 0 },
  axes: [
    { id: 'routing', label: 'Skill routing', weight: 15 },
    { id: 'artifacts', label: 'Artifact completeness', weight: 15 },
    { id: 'decisions', label: 'Decision gates', weight: 10 },
    { id: 'verification', label: 'Verification evidence', weight: 15 },
    { id: 'scope_control', label: 'Scope control', weight: 15 },
    { id: 'traceability', label: 'Traceability', weight: 20 },
    { id: 'goal_verification', label: 'Goal verification coverage', weight: 10 },
  ],
};

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
  const parsed = { allowPartial: false, reportPath: null, scoreOutPath: null, skipBlocked: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--report') {
      parsed.reportPath = argv[index + 1];
      index += 1;
      if (!parsed.reportPath) fail('--report requires a file path');
    } else if (arg === '--allow-partial') {
      parsed.allowPartial = true;
    } else if (arg === '--score-out') {
      parsed.scoreOutPath = argv[index + 1];
      index += 1;
      if (!parsed.scoreOutPath) fail('--score-out requires a file path');
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

  assert(manifest.version === 2, 'manifest.version must be 2');
  assert(manifest.name === 'forge-skills-suite-benchmark', 'manifest.name must be forge-skills-suite-benchmark');
  assert(manifest.report_schema === 'evals/skills-suite/report.schema.json', 'manifest.report_schema must point to report.schema.json');
  assert(exists(manifest.report_schema), `${manifest.report_schema}: missing`);
  assert(Array.isArray(manifest.cases), 'manifest.cases must be an array');
  assert(manifest.cases?.length >= manifest.minimum_cases, `manifest must contain at least ${manifest.minimum_cases} cases`);
  assert(typeof manifest.scoring_model === 'object' && manifest.scoring_model !== null, 'manifest.scoring_model is required');
  assert(Array.isArray(manifest.scoring_model?.axes), 'manifest.scoring_model.axes must be an array');
  assert(typeof manifest.scoring_model?.grade_thresholds === 'object', 'manifest.scoring_model.grade_thresholds is required');
  for (const axis of manifest.scoring_model?.axes ?? []) {
    assert(typeof axis.id === 'string' && axis.id.length > 0, 'manifest.scoring_model.axes[].id is required');
    assert(typeof axis.label === 'string' && axis.label.length > 0, `${axis.id}: scoring axis label is required`);
    assert(typeof axis.weight === 'number' && axis.weight > 0, `${axis.id}: scoring axis weight must be positive`);
  }

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
      if (check.type === 'change_unit_reported') assert(typeof check.path === 'string' && check.path.length > 0, `${testCase.id}: change_unit_reported.path is required`);
      if (check.type === 'goal_covers') assert(typeof check.path === 'string' && check.path.length > 0, `${testCase.id}: goal_covers.path is required`);
      if (check.type === 'command_reported') assert(typeof check.command === 'string' && check.command.length > 0, `${testCase.id}: command_reported.command is required`);
      if (check.type === 'decision_gate_reported') assert(typeof check.decision === 'string' && check.decision.length > 0, `${testCase.id}: decision_gate_reported.decision is required`);
      if (check.type === 'goal_verified') assert(typeof check.target === 'string' && check.target.length > 0, `${testCase.id}: goal_verified.target is required`);
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

function changeUnitPaths(run) {
  return new Set(
    (run.change_units ?? [])
      .map((changeUnit) => (typeof changeUnit === 'string' ? changeUnit : changeUnit?.path))
      .filter(isChangeUnitPath),
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

function docSyncTargets(run) {
  return new Set(
    (run.goal_verification ?? [])
      .filter((item) => item?.status === 'completed')
      .map((item) => item?.target)
      .filter(Boolean),
  );
}

function goalCoveragePaths(run) {
  const paths = new Set();
  for (const entry of run.goal_coverage_entries ?? []) {
    if (entry?.source) paths.add(entry.source);
    for (const coveredPath of entry?.covers ?? []) paths.add(coveredPath);
  }
  return paths;
}

function validGoalCoverageEntry(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    !Array.isArray(entry) &&
    typeof entry.source === 'string' &&
    entry.source.startsWith('docs/') &&
    Array.isArray(entry.covers) &&
    entry.covers.every((coveredPath) => typeof coveredPath === 'string' && coveredPath.length > 0)
  );
}

function isChangeUnitPath(value) {
  return typeof value === 'string' && /^docs\/change-units\/CU-[^/]+\.md$/.test(value);
}

function validChangeUnitEntry(entry) {
  if (typeof entry === 'string') return isChangeUnitPath(entry);
  return entry && typeof entry === 'object' && !Array.isArray(entry) && isChangeUnitPath(entry.path);
}

function validDocSyncEntry(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    !Array.isArray(entry) &&
    typeof entry.target === 'string' &&
    entry.target.length > 0 &&
      ['completed', 'pending', 'blocked'].includes(entry.status)
  );
}

function validMetrics(metrics) {
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) return false;
  const allowedKeys = new Set(['user_interventions', 'turns', 'changed_files', 'elapsed_ms', 'tokens']);
  return Object.entries(metrics).every(([key, value]) => allowedKeys.has(key) && typeof value === 'number' && value >= 0);
}

function evidenceText(run) {
  return [...(run.evidence ?? []), run.notes ?? ''].join('\n');
}

function clampScore(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function roundScore(value) {
  if (value === null || value === undefined) return null;
  return Math.round(value * 10) / 10;
}

function ratioScore(passed, total) {
  if (total === 0) return null;
  return roundScore((passed / total) * 100);
}

function gradeFor(score, thresholds) {
  const entries = Object.entries(thresholds ?? defaultScoringModel.grade_thresholds).sort((a, b) => b[1] - a[1]);
  for (const [grade, threshold] of entries) {
    if (score >= threshold) return grade;
  }
  return 'F';
}

function expectedArtifactReported(expectedArtifact, run) {
  const artifacts = artifactPaths(run);
  const changeUnits = changeUnitPaths(run);
  return expectedArtifact.startsWith('docs/change-units/')
    ? [...changeUnits].some((changeUnitPath) => globMatch(expectedArtifact, changeUnitPath))
    : [...artifacts].some((artifactPath) => globMatch(expectedArtifact, artifactPath));
}

function routingScore(testCase, run) {
  const expected = new Set(testCase.expected_skills ?? []);
  const triggered = new Set(run.triggered_skills ?? []);
  if (expected.size === 0) return null;

  let hits = 0;
  for (const skillName of expected) {
    if (triggered.has(skillName)) hits += 1;
  }
  const unexpected = [...triggered].filter((skillName) => !expected.has(skillName)).length;
  const raw = (hits / expected.size) * 100 - (unexpected / expected.size) * 25;
  return roundScore(clampScore(raw));
}

function artifactCompletenessScore(testCase, run) {
  const expectedArtifacts = testCase.expected_artifacts ?? [];
  if (expectedArtifacts.length === 0) return null;
  const reported = expectedArtifacts.filter((expectedArtifact) => expectedArtifactReported(expectedArtifact, run)).length;
  return ratioScore(reported, expectedArtifacts.length);
}

function oracleAxisScore(results, axis) {
  const axisResults = results.filter((result) => checkAxis[result.check.type] === axis);
  return ratioScore(axisResults.filter((result) => result.passed).length, axisResults.length);
}

function weightedAverage(axisScores, scoringModel) {
  let weightedTotal = 0;
  let weightTotal = 0;
  for (const axis of scoringModel.axes ?? []) {
    const score = axisScores[axis.id];
    if (score === null || score === undefined) continue;
    weightedTotal += score * axis.weight;
    weightTotal += axis.weight;
  }
  if (weightTotal === 0) return null;
  return roundScore(weightedTotal / weightTotal);
}

function scoreCase(testCase, run, results, scoringModel) {
  const axes = {};
  for (const axis of scoringModel.axes ?? []) {
    if (axis.id === 'routing') {
      axes[axis.id] = routingScore(testCase, run);
    } else if (axis.id === 'artifacts') {
      axes[axis.id] = artifactCompletenessScore(testCase, run);
    } else if (axis.id === 'goal_verification') {
      axes[axis.id] = oracleAxisScore(results, 'goal_verification');
    } else {
      axes[axis.id] = oracleAxisScore(results, axis.id);
    }
  }
  const overallScore = weightedAverage(axes, scoringModel);
  return {
    case_id: testCase.id,
    status: run.status,
    score: overallScore,
    grade: overallScore === null ? null : gradeFor(overallScore, scoringModel.grade_thresholds),
    axes,
    oracle_checks: {
      passed: results.filter((result) => result.passed).length,
      total: results.length,
    },
  };
}

function aggregateScores(caseScores, scoringModel) {
  const axes = {};
  for (const axis of scoringModel.axes ?? []) {
    const values = caseScores.map((caseScore) => caseScore.axes[axis.id]).filter((value) => value !== null && value !== undefined);
    axes[axis.id] = values.length === 0 ? null : roundScore(values.reduce((total, value) => total + value, 0) / values.length);
  }
  const overallScore = weightedAverage(axes, scoringModel);
  return {
    score: overallScore,
    grade: overallScore === null ? null : gradeFor(overallScore, scoringModel.grade_thresholds),
    axes,
  };
}

function checkRun(testCase, run) {
  const triggeredSkills = new Set(run.triggered_skills ?? []);
  const artifacts = artifactPaths(run);
  const changeUnits = changeUnitPaths(run);
  const commands = new Set(run.commands_run ?? []);
  const decisions = decisionIds(run);
  const docSync = docSyncTargets(run);
  const goalCoverage = goalCoveragePaths(run);
  const forbiddenBehaviors = new Set(run.forbidden_behaviors ?? []);
  const evidence = evidenceText(run);
  const results = [];

  for (const check of testCase.oracle_checks) {
    let passed = false;
    if (check.type === 'skill_triggered') passed = triggeredSkills.has(check.skill);
    if (check.type === 'artifact_reported') {
      passed = [...artifacts].some((artifactPath) => globMatch(check.path, artifactPath));
    }
    if (check.type === 'change_unit_reported') {
      passed = [...changeUnits].some((changeUnitPath) => globMatch(check.path, changeUnitPath));
    }
    if (check.type === 'goal_covers') {
      passed = [...goalCoverage].some((coveredPath) => globMatch(check.path, coveredPath));
    }
    if (check.type === 'command_reported') passed = commands.has(check.command);
    if (check.type === 'decision_gate_reported') passed = decisions.has(check.decision);
    if (check.type === 'goal_verified') passed = docSync.has(check.target);
    if (check.type === 'evidence_contains') passed = evidence.includes(check.text);
    if (check.type === 'forbidden_behavior_absent') passed = !forbiddenBehaviors.has(check.behavior);
    results.push({ passed, check });
  }

  return results;
}

function validateReport(manifest, registry, report, options = {}) {
  const scoringModel = manifest.scoring_model ?? defaultScoringModel;
  assert(report.version === 2, 'report.version must be 2');
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
    assert(Array.isArray(run.change_units), `${run.case_id}: change_units must be an array`);
    assert(Array.isArray(run.goal_verification), `${run.case_id}: goal_verification must be an array`);
    assert(Array.isArray(run.goal_coverage_entries ?? []), `${run.case_id}: goal_coverage_entries must be an array`);
    assert(Array.isArray(run.evidence), `${run.case_id}: evidence must be an array`);
    for (const entry of run.change_units ?? []) {
      assert(validChangeUnitEntry(entry), `${run.case_id}: change_units must point to docs/change-units/CU-*.md`);
    }
    for (const entry of run.goal_verification ?? []) {
      assert(validDocSyncEntry(entry), `${run.case_id}: goal_verification must be { target, status } objects`);
    }
    for (const entry of run.goal_coverage_entries ?? []) {
      assert(validGoalCoverageEntry(entry), `${run.case_id}: goal_coverage_entries must be { source: "docs/...", covers: [...] } objects`);
    }
    if ('metrics' in run) {
      assert(validMetrics(run.metrics), `${run.case_id}: metrics must contain only non-negative numeric runtime metrics`);
    }

    for (const skillName of run.triggered_skills ?? []) {
      assert(registrySkills.has(skillName), `${run.case_id}: unknown triggered skill ${skillName}`);
    }

    if (!(run.status === 'blocked' && options.skipBlocked)) {
      const artifacts = artifactPaths(run);
      const changeUnits = changeUnitPaths(run);
      for (const expectedArtifact of manifestById.get(run.case_id)?.expected_artifacts ?? []) {
        const reported = expectedArtifact.startsWith('docs/change-units/')
          ? [...changeUnits].some((changeUnitPath) => globMatch(expectedArtifact, changeUnitPath))
          : [...artifacts].some((artifactPath) => globMatch(expectedArtifact, artifactPath));
        if (!reported) fail(`${run.case_id}: expected artifact not reported ${expectedArtifact}`);
      }

      const changedCurrentDocs = [...artifacts].some((artifactPath) =>
        ['docs/goal.md', 'docs/goal_verification.md'].some((currentPath) => globMatch(currentPath, artifactPath)),
      );
      if (changedCurrentDocs && changeUnits.size === 0) {
        fail(`${run.case_id}: goal verification docs changed without a Change Unit`);
      }
    }
  }

  let passedChecks = 0;
  let blockedSkipped = 0;
  let totalChecks = 0;
  let scoredCases = 0;
  const caseScores = [];

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

    const results = checkRun(testCase, run);
    caseScores.push(scoreCase(testCase, run, results, scoringModel));

    for (const result of results) {
      totalChecks += 1;
      if (result.passed) {
        passedChecks += 1;
      } else {
        fail(`${testCase.id}: failed oracle ${JSON.stringify(result.check)}`);
      }
    }
  }

  assert(scoredCases > 0, 'report did not include any scored benchmark cases');
  return {
    blockedSkipped,
    cases: caseScores,
    passedChecks,
    scoredCases,
    totalChecks,
    ...aggregateScores(caseScores, scoringModel),
  };
}

function printableAxisScores(score) {
  return Object.entries(score.axes ?? {})
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([axis, value]) => `${axis}=${value}`)
    .join(', ');
}

function writeScoreReport(scoreOutPath, report, score, manifest) {
  if (!scoreOutPath) return;
  const output = {
    version: 1,
    suite: 'forge',
    run_id: report.run_id,
    scoring_model_version: manifest.scoring_model?.version ?? defaultScoringModel.version,
    score: score.score,
    grade: score.grade,
    axes: score.axes,
    cases: score.cases,
    oracle_checks: {
      passed: score.passedChecks,
      total: score.totalChecks,
    },
    blocked_skipped: score.blockedSkipped,
  };
  try {
    fs.writeFileSync(scoreOutPath, `${JSON.stringify(output, null, 2)}\n`);
  } catch (error) {
    fail(`${scoreOutPath}: cannot write score report (${error.message})`);
  }
}

const args = parseArgs(process.argv.slice(2));
const registry = loadRegistry(root);
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
writeScoreReport(args.scoreOutPath, report, score, manifest);

if (failures.length > 0) {
  console.error('\nForge skills-suite report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  if (score.score !== null && score.score !== undefined) {
    console.error(`\nScore: ${score.score}/100 (${score.grade}); axes: ${printableAxisScores(score)}`);
  }
  process.exit(1);
}

const blockedSuffix = score.blockedSkipped > 0 ? `, ${score.blockedSkipped} blocked skipped` : '';
console.log(`Forge skills-suite report passed (${score.scoredCases} cases${blockedSuffix}, ${score.passedChecks}/${score.totalChecks} oracle checks).`);
console.log(`Score: ${score.score}/100 (${score.grade}); axes: ${printableAxisScores(score)}`);
if (args.scoreOutPath) console.log(`Score report written to ${args.scoreOutPath}`);
