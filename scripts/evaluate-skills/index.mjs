#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { loadBenchmarkContract } from '../lib/benchmark-contract.mjs';
import { loadRegistry } from '../lib/registry.mjs';
import { inspectRun, inspectRunReport } from '../lib/run-report.mjs';

const root = process.cwd();
const failures = [];
const checkAxis = {
  artifact_reported: 'artifacts',
  artifact_absent: 'scope_control',
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

function parseArgs(argv) {
  const parsed = { allowPartial: false, reportPath: null, scoreOutPath: null, skipBlocked: false, verifyDisk: false };
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
    } else if (arg === '--verify-disk') {
      parsed.verifyDisk = true;
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }
  return parsed;
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
  return inspectRun(run).matchesArtifact(expectedArtifact);
}

function routingScore(testCase, run) {
  const expected = new Set(testCase.expected_skills ?? []);
  const triggered = new Set(inspectRun(run).triggeredSkills);
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

function scoreReport(manifest, inspection) {
  const scoringModel = manifest.scoring_model ?? defaultScoringModel;
  let passedChecks = 0;
  let totalChecks = 0;
  const caseScores = [];
  for (const { testCase, run, oracleResults } of inspection.caseEvaluations) {
    caseScores.push(scoreCase(testCase, run, oracleResults, scoringModel));
    for (const result of oracleResults) {
      totalChecks += 1;
      if (result.passed) passedChecks += 1;
    }
  }
  return {
    blockedSkipped: inspection.blockedSkipped,
    cases: caseScores,
    passedChecks,
    scoredCases: inspection.caseEvaluations.length,
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
let manifest = {};
let coveredSkills = new Set();
try {
  ({ manifest, coveredSkills } = loadBenchmarkContract(root, registry));
} catch (error) {
  failures.push(...(error.issues ?? [error.message]));
}

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
const inspection = inspectRunReport(report, {
  manifest,
  registry,
  allowPartial: args.allowPartial,
  skipBlocked: args.skipBlocked,
});
failures.push(...inspection.issues);
if (args.verifyDisk && Array.isArray(report?.cases)) {
  for (const run of report.cases) {
    for (const entry of run?.change_units ?? []) {
      const cuPath = typeof entry === 'string' ? entry : entry?.path;
      if (typeof cuPath !== 'string' || !cuPath.startsWith('docs/change-units/')) continue;
      if (!fs.existsSync(path.join(root, cuPath))) {
        failures.push(`${run.case_id}: change unit not found on disk: ${cuPath}`);
      }
    }
  }
}
const score = scoreReport(manifest, inspection);
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
const diskSuffix = args.verifyDisk ? ', on-disk verified' : '';
console.log(`Forge skills-suite report passed (${score.scoredCases} cases${blockedSuffix}, ${score.passedChecks}/${score.totalChecks} oracle checks${diskSuffix}).`);
console.log(`Score: ${score.score}/100 (${score.grade}); axes: ${printableAxisScores(score)}`);
if (args.scoreOutPath) console.log(`Score report written to ${args.scoreOutPath}`);
