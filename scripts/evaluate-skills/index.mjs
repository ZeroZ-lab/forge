#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { loadBenchmarkContract } from '../lib/benchmark-contract.mjs';
import { loadIndependentEvidence } from '../lib/evidence-collector.mjs';
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
  transcript_contains: 'verification',
  forbidden_behavior_absent: 'scope_control',
  forbidden_files_absent: 'scope_control',
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

// Fair comparison model: excludes axes that are structurally impossible for a
// no-Forge baseline to score on (routing requires triggering Forge skills;
// traceability/goal_verification require Forge-schema CU + goal_coverage).
// Only behaviorally verifiable axes are compared, so the uplift gate measures
// "did Forge produce better real behavior", not "did Forge fill its own schema".
const fairComparisonScoringModel = {
  version: 1,
  grade_thresholds: { A: 90, B: 80, C: 70, D: 60, F: 0 },
  axes: [
    { id: 'artifacts', label: 'Artifact completeness', weight: 25 },
    { id: 'decisions', label: 'Decision gates', weight: 25 },
    { id: 'verification', label: 'Verification evidence', weight: 25 },
    { id: 'scope_control', label: 'Scope control', weight: 25 },
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
  const parsed = {
    allowPartial: false,
    baselineReportPath: null,
    compareOutPath: null,
    minScoreRatio: 2,
    reportPath: null,
    scoreOutPath: null,
    skipBlocked: false,
    trustSelfReport: false,
    verifyDisk: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--report') {
      parsed.reportPath = argv[index + 1];
      index += 1;
      if (!parsed.reportPath) fail('--report requires a file path');
    } else if (arg === '--baseline-report') {
      parsed.baselineReportPath = argv[index + 1];
      index += 1;
      if (!parsed.baselineReportPath) fail('--baseline-report requires a file path');
    } else if (arg === '--allow-partial') {
      parsed.allowPartial = true;
    } else if (arg === '--compare-out') {
      parsed.compareOutPath = argv[index + 1];
      index += 1;
      if (!parsed.compareOutPath) fail('--compare-out requires a file path');
    } else if (arg === '--min-score-ratio') {
      parsed.minScoreRatio = Number.parseFloat(argv[index + 1]);
      index += 1;
      if (!Number.isFinite(parsed.minScoreRatio) || parsed.minScoreRatio <= 0) {
        fail('--min-score-ratio requires a positive number');
      }
    } else if (arg === '--trust-self-report') {
      parsed.trustSelfReport = true;
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

function scoreReport(manifest, inspection, scoringModelOverride) {
  const scoringModel = scoringModelOverride ?? manifest.scoring_model ?? defaultScoringModel;
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

function passRate(inspection) {
  const total = inspection.caseEvaluations.length;
  if (total === 0) return null;
  const passed = inspection.caseEvaluations.filter(({ run }) => run.status === 'pass').length;
  return roundScore((passed / total) * 100);
}

function scoreRatio(forgeScore, baselineScore) {
  if (forgeScore === null || forgeScore === undefined || baselineScore === null || baselineScore === undefined) {
    return null;
  }
  if (baselineScore === 0) return forgeScore > 0 ? Infinity : 1;
  return forgeScore / baselineScore;
}

function formatRatio(value) {
  if (value === Infinity || value === 'Infinity') return 'Infinity';
  if (value === null || value === undefined) return 'n/a';
  return `${roundScore(value)}x`;
}

function reportRatio(value) {
  return value === Infinity ? 'Infinity' : roundScore(value);
}

function compareReports({ baselineReport, baselineScore, baselineInspection, forgeReport, forgeScore, forgeInspection, minScoreRatio }) {
  const ratio = scoreRatio(forgeScore.score, baselineScore.score);
  const forgePassRate = passRate(forgeInspection);
  const baselinePassRate = passRate(baselineInspection);
  return {
    version: 1,
    suite: 'forge',
    comparison: 'forge-vs-no-forge',
    min_score_ratio: minScoreRatio,
    forge: {
      run_id: forgeReport.run_id,
      score: forgeScore.score,
      grade: forgeScore.grade,
      pass_rate: forgePassRate,
      scored_cases: forgeScore.scoredCases,
    },
    baseline: {
      run_id: baselineReport.run_id,
      score: baselineScore.score,
      grade: baselineScore.grade,
      pass_rate: baselinePassRate,
      scored_cases: baselineScore.scoredCases,
    },
    uplift: {
      score_ratio: reportRatio(ratio),
      score_delta: roundScore((forgeScore.score ?? 0) - (baselineScore.score ?? 0)),
      pass_rate_delta:
        forgePassRate === null || baselinePassRate === null ? null : roundScore(forgePassRate - baselinePassRate),
      score_ratio_passed: ratio !== null && ratio >= minScoreRatio,
      pass_rate_not_worse:
        forgePassRate !== null && baselinePassRate !== null && forgePassRate >= baselinePassRate,
    },
  };
}

function writeJsonReport(outputPath, payload) {
  if (!outputPath) return;
  try {
    fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  } catch (error) {
    fail(`${outputPath}: cannot write JSON report (${error.message})`);
  }
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
  writeJsonReport(scoreOutPath, output);
}

const args = parseArgs(process.argv.slice(2));
const reportAbsPath = args.reportPath
  ? (path.isAbsolute(args.reportPath) ? args.reportPath : path.join(root, args.reportPath))
  : null;
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

if (args.baselineReportPath && !args.reportPath) {
  fail('--baseline-report requires --report');
}

if (failures.length > 0) {
  console.error('Forge skills-suite evaluation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (!args.reportPath) {
  console.log('No run report supplied; behavioral effectiveness is not claimed.');
  process.exit(0);
}

const report = readJson(args.reportPath);
// Independent evidence lives next to the report: <reportDir>/<caseId>.events.jsonl
// and <reportDir>/workspaces/<caseId>/. When absent, checks fall back to
// self-report (tagged). --trust-self-report forces the fallback even when
// evidence is present (escape hatch for synthetic tests / legacy reports).
const reportDir = reportAbsPath ? path.dirname(reportAbsPath) : root;
const evidenceAvailable = !args.trustSelfReport;
const loadEvidence = evidenceAvailable
  ? (caseId) => {
      const evidence = loadIndependentEvidence(reportDir, caseId);
      return evidence.available ? evidence : undefined;
    }
  : undefined;
const inspection = inspectRunReport(report, {
  manifest,
  registry,
  allowPartial: args.allowPartial,
  skipBlocked: args.skipBlocked,
  loadEvidence,
  trustSelfReport: args.trustSelfReport,
});
failures.push(...inspection.issues);
if (args.verifyDisk && Array.isArray(report?.cases)) {
  for (const run of report.cases) {
    const workspaceDir = path.join(reportDir, 'workspaces', run.case_id);
    const resolveDiskPath = (relativePath) => {
      const inWorkspace = path.join(workspaceDir, relativePath);
      if (fs.existsSync(inWorkspace)) return inWorkspace;
      return path.join(root, relativePath);
    };
    for (const entry of run?.change_units ?? []) {
      const cuPath = typeof entry === 'string' ? entry : entry?.path;
      if (typeof cuPath !== 'string' || !cuPath.startsWith('docs/change-units/')) continue;
      const absolute = resolveDiskPath(cuPath);
      if (!fs.existsSync(absolute)) {
        failures.push(`${run.case_id}: change unit not found on disk: ${cuPath}`);
        continue;
      }
      const body = fs.readFileSync(absolute, 'utf8');
      const verifyIndex = body.search(/^##\s*Verification\b/im);
      if (verifyIndex === -1) {
        failures.push(`${run.case_id}: change unit lacks a Verification section: ${cuPath}`);
        continue;
      }
      const afterVerify = body.slice(verifyIndex);
      const nextHeading = afterVerify.slice(1).search(/^##\s/m);
      const section = nextHeading === -1 ? afterVerify : afterVerify.slice(0, nextHeading + 1);
      const hasCommandEvidence =
        section.includes('```') || /\b(node|npm|npx|git|yarn|pnpm|deno|bash|sh|python|pip)\s+\S/.test(section);
      if (!hasCommandEvidence) {
        failures.push(`${run.case_id}: change unit Verification section lacks command evidence: ${cuPath}`);
      }
    }
    for (const entry of run?.artifacts ?? []) {
      const artifactPath = typeof entry === 'string' ? entry : entry?.path;
      if (typeof artifactPath !== 'string' || artifactPath.length === 0) continue;
      if (artifactPath.startsWith('docs/change-units/')) continue;
      const absolute = resolveDiskPath(artifactPath);
      if (!fs.existsSync(absolute)) {
        failures.push(`${run.case_id}: artifact not found on disk: ${artifactPath}`);
      }
    }
  }
}
const score = scoreReport(manifest, inspection);
writeScoreReport(args.scoreOutPath, report, score, manifest);

let comparison = null;
if (args.baselineReportPath) {
  const baselineReport = readJson(args.baselineReportPath);
  const baselineInspection = inspectRunReport(baselineReport, {
    manifest,
    registry,
    allowPartial: args.allowPartial,
    skipBlocked: args.skipBlocked,
    strictOutcomes: false,
    loadEvidence: (caseId) => {
      const baselineDir = args.baselineReportPath
        ? (path.isAbsolute(args.baselineReportPath) ? path.dirname(args.baselineReportPath) : path.dirname(path.join(root, args.baselineReportPath)))
        : root;
      const evidence = loadIndependentEvidence(baselineDir, caseId);
      return evidence.available ? evidence : undefined;
    },
    trustSelfReport: args.trustSelfReport,
  });
  failures.push(...baselineInspection.issues.map((issue) => `baseline: ${issue}`));
  // Re-score both sides on the fair comparison model so the uplift gate
  // measures behaviorally verifiable axes only (no schema-filling红利).
  const forgeFairScore = scoreReport(manifest, inspection, fairComparisonScoringModel);
  const baselineFairScore = scoreReport(manifest, baselineInspection, fairComparisonScoringModel);
  // keep the full-model score for display, but gate on the fair score
  comparison = compareReports({
    baselineReport,
    baselineScore: baselineFairScore,
    baselineInspection,
    forgeReport: report,
    forgeScore: forgeFairScore,
    forgeInspection: inspection,
    minScoreRatio: args.minScoreRatio,
  });
  comparison.scoring_model = 'fair-comparison (artifacts, decisions, verification, scope_control)';
  writeJsonReport(args.compareOutPath, comparison);

  if (!comparison.uplift.score_ratio_passed) {
    failures.push(
      `Forge fair-comparison score ratio ${formatRatio(comparison.uplift.score_ratio)} is below required ${args.minScoreRatio}x baseline`,
    );
  }
  if (!comparison.uplift.pass_rate_not_worse) {
    failures.push(
      `Forge pass rate ${comparison.forge.pass_rate}% is below baseline pass rate ${comparison.baseline.pass_rate}%`,
    );
  }
}

if (failures.length > 0) {
  console.error('\nForge skills-suite report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  if (score.score !== null && score.score !== undefined) {
    console.error(`\nScore: ${score.score}/100 (${score.grade}); axes: ${printableAxisScores(score)}`);
  }
  if (comparison) {
    console.error(
      `Comparison: Forge ${comparison.forge.score}/100 vs baseline ${comparison.baseline.score}/100 ` +
        `(${formatRatio(comparison.uplift.score_ratio)}, required ${comparison.min_score_ratio}x)`,
    );
  }
  process.exit(1);
}

const blockedSuffix = score.blockedSkipped > 0 ? `, ${score.blockedSkipped} blocked skipped` : '';
const diskSuffix = args.verifyDisk ? ', on-disk verified' : '';
console.log(`Forge skills-suite report passed (${score.scoredCases} cases${blockedSuffix}, ${score.passedChecks}/${score.totalChecks} oracle checks${diskSuffix}).`);
console.log(`Score: ${score.score}/100 (${score.grade}); axes: ${printableAxisScores(score)}`);
if (comparison) {
  console.log(
    `Forge vs no-Forge: ${score.score}/100 vs ${comparison.baseline.score}/100 ` +
      `(${formatRatio(comparison.uplift.score_ratio)}, required ${comparison.min_score_ratio}x); ` +
      `pass rate ${comparison.forge.pass_rate}% vs ${comparison.baseline.pass_rate}%.`,
  );
  if (args.compareOutPath) console.log(`Comparison report written to ${args.compareOutPath}`);
}
if (args.scoreOutPath) console.log(`Score report written to ${args.scoreOutPath}`);
