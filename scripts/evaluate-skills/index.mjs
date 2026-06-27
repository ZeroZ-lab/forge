#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { loadBenchmarkContract } from '../lib/benchmark-contract.mjs';
import { commandWasRun, loadIndependentEvidence } from '../lib/evidence-collector.mjs';
import { ciGate } from '../lib/multi-run-stats.mjs';
import { loadRegistry } from '../lib/registry.mjs';
import { inspectRun, inspectRunReport, SOURCE } from '../lib/run-report.mjs';

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
// traceability/goal_verification require Forge-schema CU + goal_coverage) AND
// excludes the Forge-schema `decisions` axis (decision IDs like
// business_go_no_go are Forge self-report a baseline cannot match). Only
// behaviorally verifiable axes remain, so the uplift gate measures "did Forge
// produce better real behavior", not "did Forge fill its own schema".
// Weights re-normalize automatically via weightedAverage (weightTotal).
const fairComparisonScoringModel = {
  version: 1,
  grade_thresholds: { A: 90, B: 80, C: 70, D: 60, F: 0 },
  axes: [
    { id: 'artifacts', label: 'Artifact completeness', weight: 25 },
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

function oracleAxisScore(results, axis, { trustSelfReport = false } = {}) {
  const axisResults = results.filter((result) => checkAxis[result.check.type] === axis);
  if (axisResults.length === 0) return null;
  // Source weighting: an INDEPENDENT pass is full credit; a SELF_REPORT pass
  // is NOT behavioral evidence and scores 0 unless --trust-self-report opts
  // into the self-report fallback (synthetic tests / legacy reports). A
  // DEPRECATED source never earns credit. This is why an answer-echo report
  // (all self-report) scores 0 on every oracle axis even when every check
  // "passed" via self-report.
  const credited = axisResults.filter((result) => {
    if (!result.passed) return false;
    if (result.source === SOURCE.INDEPENDENT) return true;
    return result.source === SOURCE.SELF_REPORT && trustSelfReport;
  }).length;
  return ratioScore(credited, axisResults.length);
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

function countSources(results) {
  const counts = { [SOURCE.INDEPENDENT]: 0, [SOURCE.SELF_REPORT]: 0, [SOURCE.DEPRECATED]: 0 };
  for (const result of results) {
    const key = result.source ?? SOURCE.SELF_REPORT;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function scoreCase(testCase, run, results, scoringModel, { trustSelfReport = false } = {}) {
  const axes = {};
  for (const axis of scoringModel.axes ?? []) {
    if (axis.id === 'routing') {
      // routing reads triggered_skills (self-report); it has no independent
      // oracle branch, so it is excluded from the fair model and kept in the
      // full model for display only.
      axes[axis.id] = routingScore(testCase, run);
    } else {
      // All other axes — including artifacts — route through oracleAxisScore,
      // which inherits the independent artifact_reported verdict and applies
      // source weighting (self-report pass = 0 unless trusted). The old
      // self-report artifactCompletenessScore is no longer a scoring path.
      axes[axis.id] = oracleAxisScore(results, axis.id, { trustSelfReport });
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
      sources: countSources(results),
    },
    checks: results.map((result) => ({ ...result.check, passed: result.passed, source: result.source })),
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

function scoreReport(manifest, inspection, scoringModelOverride, options = {}) {
  const scoringModel = scoringModelOverride ?? manifest.scoring_model ?? defaultScoringModel;
  const { trustSelfReport = false } = options;
  let passedChecks = 0;
  let totalChecks = 0;
  const caseScores = [];
  const evidenceSources = { [SOURCE.INDEPENDENT]: 0, [SOURCE.SELF_REPORT]: 0, [SOURCE.DEPRECATED]: 0 };
  for (const { testCase, run, oracleResults } of inspection.caseEvaluations) {
    caseScores.push(scoreCase(testCase, run, oracleResults, scoringModel, { trustSelfReport }));
    for (const result of oracleResults) {
      totalChecks += 1;
      if (result.passed) passedChecks += 1;
      const key = result.source ?? SOURCE.SELF_REPORT;
      evidenceSources[key] = (evidenceSources[key] ?? 0) + 1;
    }
  }
  const independentChecks = evidenceSources[SOURCE.INDEPENDENT] ?? 0;
  return {
    blockedSkipped: inspection.blockedSkipped,
    cases: caseScores,
    passedChecks,
    scoredCases: inspection.caseEvaluations.length,
    totalChecks,
    evidence_sources: evidenceSources,
    independent_ratio: totalChecks > 0 ? roundScore((independentChecks / totalChecks) * 100) : null,
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
  const passed = inspection.caseEvaluations.filter(({ oracleResults }) =>
    oracleResults.every((result) => result.passed),
  ).length;
  return roundScore((passed / total) * 100);
}

function comparisonHasRepeats(report) {
  const counts = new Map();
  for (const run of report?.cases ?? []) {
    counts.set(run.case_id, (counts.get(run.case_id) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count >= 2);
}

function repeatedSamplesHaveDistinctEvidence(report) {
  const byCase = new Map();
  for (const run of report?.cases ?? []) {
    if (!byCase.has(run.case_id)) byCase.set(run.case_id, []);
    byCase.get(run.case_id).push(run);
  }
  const repeated = [...byCase.values()].filter((runs) => runs.length >= 2);
  if (repeated.length === 0) return false;
  return repeated.every((runs) => {
    const ids = runs.map((run) => evidenceIdFor(run, run.case_id));
    return new Set(ids).size === ids.length;
  });
}

function scoreSamples(score) {
  return (score.cases ?? [])
    .map((caseScore) => caseScore.score)
    .filter((value) => Number.isFinite(value));
}

function evidenceIdFor(run, fallbackCaseId) {
  return typeof run?.evidence_id === 'string' && run.evidence_id.length > 0
    ? run.evidence_id
    : fallbackCaseId;
}

function verificationCommandCandidates(section) {
  const candidates = new Set();
  const fenced = [...section.matchAll(/```[^\n\r]*\r?\n([\s\S]*?)```/g)];
  for (const match of fenced) {
    for (const line of match[1].split(/\r?\n/)) {
      const trimmed = line.trim();
      if (/^(node|npm|npx|git|yarn|pnpm|deno|bash|sh|python|pytest|pip)\b/.test(trimmed)) {
        candidates.add(trimmed);
      }
    }
  }
  for (const match of section.matchAll(/\b(node|npm|npx|git|yarn|pnpm|deno|bash|sh|python|pytest|pip)\s+[^\n`]+/g)) {
    candidates.add(match[0].trim());
  }
  return [...candidates];
}

function scoreRatio(forgeScore, baselineScore) {
  if (forgeScore === null || forgeScore === undefined || baselineScore === null || baselineScore === undefined) {
    return null;
  }
  // A zero baseline is not comparable to a positive Forge score: it cannot
  // establish uplift (any positive number / 0 = Infinity auto-passes the gate
  // without any real evidence). Return null so the gate hard-fails with
  // "not comparable, cannot auto-pass" instead of minting an Infinity ratio.
  if (baselineScore === 0) return null;
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
    // Per-check source provenance + independent-vs-self-report ratio: a
    // self-report pass is NOT behavioral evidence, so the headline must show
    // how much of the score is actually backed by tamper-proof evidence.
    evidence_sources: score.evidence_sources,
    independent_ratio: score.independent_ratio,
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
  ? (caseId, run) => {
      const evidence = loadIndependentEvidence(reportDir, evidenceIdFor(run, caseId));
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
  requireIndependent: !args.trustSelfReport,
});
failures.push(...inspection.issues);
if (args.verifyDisk && Array.isArray(report?.cases)) {
  for (const run of report.cases) {
    const workspaceDir = path.join(reportDir, 'workspaces', evidenceIdFor(run, run.case_id));
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
      const commandCandidates = verificationCommandCandidates(section);
      if (commandCandidates.length === 0) {
        failures.push(`${run.case_id}: change unit Verification section lacks command evidence: ${cuPath}`);
        continue;
      }
      const evidence = loadIndependentEvidence(reportDir, evidenceIdFor(run, run.case_id));
      if (!evidence.available) {
        failures.push(`${run.case_id}: cannot verify Change Unit commands without events.jsonl: ${cuPath}`);
        continue;
      }
      const hasExecutedCommand = commandCandidates.some((command) =>
        commandWasRun(evidence, command, { requireExitCode: true }),
      );
      if (!hasExecutedCommand) {
        failures.push(`${run.case_id}: Change Unit Verification command was not executed successfully: ${cuPath}`);
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
const score = scoreReport(manifest, inspection, undefined, { trustSelfReport: args.trustSelfReport });
writeScoreReport(args.scoreOutPath, report, score, manifest);

// Hard gate (master gate): under default trust, a report that passes only on
// self-report — no independent evidence (no events.jsonl / no workspace) — is
// unverified self-assertion and MUST NOT pass. A self-report pass is NOT
// behavioral evidence. This is what turns an answer-echo report (every check
// "passed" via self-report) red. --trust-self-report is the explicit escape
// hatch for synthetic tests / legacy reports that have no event stream.
if (!args.trustSelfReport) {
  const anyIndependentEvidence = inspection.caseEvaluations.some(({ evidence }) => Boolean(evidence?.available));
  if (!anyIndependentEvidence) {
    failures.push(
      'report has no independent evidence (no events.jsonl/workspace); self-report alone cannot pass the gate — supply events.jsonl or use --trust-self-report for synthetic reports',
    );
  }
}

let comparison = null;
if (args.baselineReportPath) {
  const baselineReport = readJson(args.baselineReportPath);
  const baselineInspection = inspectRunReport(baselineReport, {
    manifest,
    registry,
    allowPartial: args.allowPartial,
    skipBlocked: args.skipBlocked,
    strictOutcomes: false,
    loadEvidence: (caseId, run) => {
      const baselineDir = args.baselineReportPath
        ? (path.isAbsolute(args.baselineReportPath) ? path.dirname(args.baselineReportPath) : path.dirname(path.join(root, args.baselineReportPath)))
        : root;
      const evidence = loadIndependentEvidence(baselineDir, evidenceIdFor(run, caseId));
      return evidence.available ? evidence : undefined;
    },
    trustSelfReport: args.trustSelfReport,
  });
  failures.push(...baselineInspection.issues.map((issue) => `baseline: ${issue}`));
  // Re-score both sides on the fair comparison model so the uplift gate
  // measures behaviorally verifiable axes only (no schema-filling红利).
  const forgeFairScore = scoreReport(manifest, inspection, fairComparisonScoringModel, { trustSelfReport: args.trustSelfReport });
  const baselineFairScore = scoreReport(manifest, baselineInspection, fairComparisonScoringModel, { trustSelfReport: args.trustSelfReport });
  const statisticalGate = ciGate({
    forgeSamples: scoreSamples(forgeFairScore),
    baselineSamples: scoreSamples(baselineFairScore),
    allowZeroVariance:
      repeatedSamplesHaveDistinctEvidence(report) &&
      repeatedSamplesHaveDistinctEvidence(baselineReport),
  });
  // Keep the full-model score in the normal report, but gate and comparison
  // output on the same fair score model.
  comparison = compareReports({
    baselineReport,
    baselineScore: baselineFairScore,
    baselineInspection,
    forgeReport: report,
    forgeScore: forgeFairScore,
    forgeInspection: inspection,
    minScoreRatio: args.minScoreRatio,
  });
  comparison.scoring_model = 'fair-comparison (artifacts, verification, scope_control)';
  comparison.statistical_gate = {
    passed: statisticalGate.passed,
    issues: statisticalGate.issues,
    forge: {
      n: statisticalGate.forge.n,
      mean: roundScore(statisticalGate.forge.mean),
      ci_low: roundScore(statisticalGate.forge.ci_low),
      ci_high: roundScore(statisticalGate.forge.ci_high),
      zero_variance: statisticalGate.forge.zero_variance,
    },
    baseline: {
      n: statisticalGate.baseline.n,
      mean: roundScore(statisticalGate.baseline.mean),
      ci_low: roundScore(statisticalGate.baseline.ci_low),
      ci_high: roundScore(statisticalGate.baseline.ci_high),
      zero_variance: statisticalGate.baseline.zero_variance,
    },
  };
  writeJsonReport(args.compareOutPath, comparison);

  if (!comparisonHasRepeats(report) || !comparisonHasRepeats(baselineReport)) {
    failures.push('Forge vs baseline comparison requires repeated samples per selected case; single-run comparisons are not statistically measurable');
  }
  if (!statisticalGate.passed) {
    failures.push(
      `Forge statistical gate failed: ${statisticalGate.issues.join('; ') || 'Forge lower confidence bound did not exceed baseline upper bound'}`,
    );
  }

  if (comparison.uplift.score_ratio === null) {
    // baseline fair-comparison score is 0: not comparable, cannot auto-pass.
    // (scoreRatio returns null for a zero baseline so Infinity can no longer
    // mint an auto-pass.)
    failures.push(
      'baseline fair-comparison score is 0; Forge vs baseline is not comparable, cannot auto-pass (a zero baseline cannot establish uplift)',
    );
  } else if (!comparison.uplift.score_ratio_passed) {
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
const independentChecks = score.evidence_sources?.[SOURCE.INDEPENDENT] ?? 0;
const selfReportChecks = score.evidence_sources?.[SOURCE.SELF_REPORT] ?? 0;
console.log(`Forge skills-suite report passed (${score.scoredCases} cases${blockedSuffix}, ${score.passedChecks}/${score.totalChecks} oracle checks${diskSuffix}).`);
console.log(
  `Score: ${score.score}/100 (${score.grade}); axes: ${printableAxisScores(score)}; ` +
    `evidence ${independentChecks}/${score.totalChecks} independent (${selfReportChecks} self-report)`,
);
if (comparison) {
  console.log(
    `Forge vs no-Forge (fair-comparison): ${comparison.forge.score}/100 vs ${comparison.baseline.score}/100 ` +
      `(${formatRatio(comparison.uplift.score_ratio)}, required ${comparison.min_score_ratio}x); ` +
      `pass rate ${comparison.forge.pass_rate}% vs ${comparison.baseline.pass_rate}%.`,
  );
  if (args.compareOutPath) console.log(`Comparison report written to ${args.compareOutPath}`);
}
if (args.scoreOutPath) console.log(`Score report written to ${args.scoreOutPath}`);
