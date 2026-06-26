#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { loadBenchmarkContract } from './lib/benchmark-contract.mjs';
import { findCodexBin } from './lib/codex-bin.mjs';
import { markdownTableCell, truncateList } from './lib/benchmark-helpers.mjs';
import { promptForCase } from './lib/benchmark-prompts.mjs';
import {
  createCaseRun,
  createRunReport,
  evaluateOracleChecks,
  inspectRun,
} from './lib/run-report.mjs';
import { loadRegistry } from './lib/registry.mjs';

const root = process.cwd();

function parseArgs(argv) {
  const args = {
    caseIds: [],
    mode: 'forge',
    output: null,
    runId: new Date().toISOString().replace(/[:.]/g, '-'),
    maxCases: null,
    repeats: 1,
    seed: null,
    temperature: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--case') {
      args.caseIds.push(argv[index + 1]);
      index += 1;
    } else if (arg === '--output') {
      args.output = argv[index + 1];
      index += 1;
    } else if (arg === '--run-id') {
      args.runId = argv[index + 1];
      index += 1;
    } else if (arg === '--max-cases') {
      args.maxCases = Number.parseInt(argv[index + 1], 10);
      index += 1;
    } else if (arg === '--runs' || arg === '--repeats') {
      args.repeats = Number.parseInt(argv[index + 1], 10);
      index += 1;
      if (!Number.isInteger(args.repeats) || args.repeats <= 0) {
        throw new Error(`${arg} must be a positive integer`);
      }
    } else if (arg === '--seed') {
      args.seed = argv[index + 1];
      index += 1;
      if (!args.seed) throw new Error('--seed requires a value');
    } else if (arg === '--temperature') {
      args.temperature = argv[index + 1];
      index += 1;
      if (!args.temperature) throw new Error('--temperature requires a value');
    } else if (arg === '--mode') {
      args.mode = argv[index + 1];
      index += 1;
      if (!['forge', 'no-forge'].includes(args.mode)) {
        throw new Error('--mode must be forge or no-forge');
      }
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return args;
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('last message did not contain a JSON object');
  }
}

function errorMessageFromEvents(eventsPath) {
  try {
    const lines = fs.readFileSync(eventsPath, 'utf8').trim().split(/\r?\n/).filter(Boolean);
    for (const line of lines.reverse()) {
      const event = JSON.parse(line);
      if (event.type === 'turn.failed' && event.error?.message) return event.error.message;
      if (event.type === 'error' && event.message) return event.message;
    }
  } catch {
    return null;
  }
  return null;
}

function runLabel(run) {
  return typeof run.repeat_index === 'number' ? `${run.case_id}#${run.repeat_index}` : run.case_id;
}

function generateSummary(report, manifest, reportPath) {
  const manifestById = new Map(manifest.cases.map((testCase) => [testCase.id, testCase]));
  const counts = { pass: 0, fail: 0, blocked: 0 };
  let passedChecks = 0;
  let totalChecks = 0;
  const rows = [];

  for (const run of report.cases) {
    counts[run.status] = (counts[run.status] ?? 0) + 1;
    const testCase = manifestById.get(run.case_id);
    const checkResults = testCase ? evaluateOracleChecks(testCase, run) : [];
    const casePassedChecks = checkResults.filter((result) => result.passed).length;
    passedChecks += casePassedChecks;
    totalChecks += checkResults.length;

    const view = inspectRun(run);

    rows.push([
      runLabel(run),
      run.status,
      `${casePassedChecks}/${checkResults.length}`,
      truncateList(view.triggeredSkills),
      truncateList(view.artifacts),
      truncateList(view.changeUnits, 2),
      truncateList(view.commands, 2),
      truncateList(view.decisions),
      view.firstEvidence,
    ]);
  }

  const blockedNote = counts.blocked > 0
    ? '\n\nBlocked cases are not evidence of skill failure or skill effectiveness; inspect their evidence and event logs.'
    : '';
  const scorerReportPath = path.relative(root, reportPath);

  return `# Forge Skills Suite Report

Run: \`${report.run_id}\`  
Started: ${report.started_at ?? '-'}  
Runner: ${report.runner ?? '-'}

## Result

- Total cases: ${report.cases.length}
- Pass: ${counts.pass}
- Fail: ${counts.fail}
- Blocked: ${counts.blocked}
- Oracle checks: ${passedChecks}/${totalChecks}${blockedNote}

## Cases

| Case | Status | Oracle | Skills | Artifacts | CU | Commands | Decisions | First evidence |
|---|---:|---:|---|---|---|---|---|---|
${rows.map((row) => `| ${row.map(markdownTableCell).join(' | ')} |`).join('\n')}

## Scoring

Use the machine scorer for the authoritative pass/fail result:

\`\`\`bash
node scripts/evaluate-skills.mjs --report ${scorerReportPath}
\`\`\`

If external conditions blocked some cases, score completed cases only:

\`\`\`bash
node scripts/evaluate-skills.mjs --skip-blocked --report ${scorerReportPath}
\`\`\`
`;
}

function runCase({ codexBin, mode, runDir, testCase, publishedSkillNames, repeatIndex, repeats, seed, temperature }) {
  const evidenceId = repeats > 1 ? `${testCase.id}.r${repeatIndex}` : testCase.id;
  const caseDir = path.join(runDir, 'workspaces', evidenceId);
  fs.mkdirSync(caseDir, { recursive: true });

  const fixture = fs.readFileSync(path.join(root, testCase.fixture), 'utf8');
  const prompt = promptForCase(testCase, fixture, mode, publishedSkillNames);
  const lastMessagePath = path.join(runDir, `${evidenceId}.last.txt`);
  const eventsPath = path.join(runDir, `${evidenceId}.events.jsonl`);
  const stderrPath = path.join(runDir, `${evidenceId}.stderr.log`);
  const stdoutFd = fs.openSync(eventsPath, 'w');
  const stderrFd = fs.openSync(stderrPath, 'w');
  const codexArgs = [
    '-a',
    'never',
    'exec',
    '--json',
    '-C',
    caseDir,
    '--skip-git-repo-check',
    '-s',
    'workspace-write',
    '--output-last-message',
    lastMessagePath,
  ];
  if (seed) codexArgs.push('--seed', String(seed));
  if (temperature) codexArgs.push('--temperature', String(temperature));
  codexArgs.push(prompt);

  const result = spawnSync(
    codexBin,
    codexArgs,
    {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', stdoutFd, stderrFd],
      timeout: 10 * 60 * 1000,
    },
  );

  fs.closeSync(stdoutFd);
  fs.closeSync(stderrFd);

  if (result.error) {
    return createCaseRun(testCase.id, 'blocked', {
      evidence_id: evidenceId,
      ...(repeats > 1 ? { repeat_index: repeatIndex } : {}),
      evidence: [`codex exec failed: ${result.error.message}`],
      notes: `See ${stderrPath}`,
    });
  }

  if (result.status !== 0) {
    const errorMessage = errorMessageFromEvents(eventsPath);
    return createCaseRun(testCase.id, 'blocked', {
      evidence_id: evidenceId,
      ...(repeats > 1 ? { repeat_index: repeatIndex } : {}),
      evidence: [errorMessage ?? `codex exec exited ${result.status}`],
      notes: `See ${stderrPath}`,
    });
  }

  try {
    const parsed = extractJsonObject(fs.readFileSync(lastMessagePath, 'utf8'));
    return {
      ...parsed,
      case_id: testCase.id,
      evidence_id: evidenceId,
      ...(repeats > 1 ? { repeat_index: repeatIndex } : {}),
    };
  } catch (error) {
    return createCaseRun(testCase.id, 'fail', {
      evidence_id: evidenceId,
      ...(repeats > 1 ? { repeat_index: repeatIndex } : {}),
      evidence: [`could not parse final JSON: ${error.message}`],
      notes: `See ${lastMessagePath}`,
    });
  }
}

const args = parseArgs(process.argv.slice(2));
const codexBin = findCodexBin();
if (!codexBin) {
  console.error('Codex CLI not found. Set CODEX_BIN or install Codex CLI.');
  process.exit(1);
}

const registry = loadRegistry(root);
// Blinding: the Forge arm learns ONLY the published skill NAMES (registry), never
// the per-case expected_skills/oracle_checks. Oracle answers stay in the manifest.
const publishedSkillNames = registry.skills.map((skill) => skill.name);
const { manifest } = loadBenchmarkContract(root, registry);
let cases = manifest.cases;
if (args.caseIds.length > 0) {
  const selected = new Set(args.caseIds);
  cases = cases.filter((testCase) => selected.has(testCase.id));
}
if (Number.isInteger(args.maxCases) && args.maxCases > 0) {
  cases = cases.slice(0, args.maxCases);
}
if (cases.length === 0) {
  console.error('No benchmark cases selected.');
  process.exit(1);
}

const runDir = path.join(root, '.eval-runs', 'skills-suite', args.runId);
fs.mkdirSync(runDir, { recursive: true });

const report = createRunReport({
  runId: args.runId,
  runner: `codex exec ${args.mode} (${codexBin}), repeats=${args.repeats}`,
  cases: [],
});

let stopAfterUsageLimit = false;
for (const testCase of cases) {
  if (stopAfterUsageLimit) break;
  for (let repeatIndex = 0; repeatIndex < args.repeats; repeatIndex += 1) {
    console.error(`Running ${testCase.id}${args.repeats > 1 ? `#${repeatIndex}` : ''}...`);
    const result = runCase({
      codexBin,
      mode: args.mode,
      runDir,
      testCase,
      publishedSkillNames,
      repeatIndex,
      repeats: args.repeats,
      seed: args.seed,
      temperature: args.temperature,
    });
    report.cases.push(result);
    fs.writeFileSync(path.join(runDir, 'report.partial.json'), JSON.stringify(report, null, 2));
    if (
      result.status === 'blocked' &&
      result.evidence.some((item) => /usage limit|try again/i.test(item))
    ) {
      const remaining = cases.slice(cases.indexOf(testCase) + 1);
      for (const skippedCase of remaining) {
        for (let skippedRepeat = 0; skippedRepeat < args.repeats; skippedRepeat += 1) {
          report.cases.push(createCaseRun(skippedCase.id, 'blocked', {
            evidence_id: args.repeats > 1 ? `${skippedCase.id}.r${skippedRepeat}` : skippedCase.id,
            ...(args.repeats > 1 ? { repeat_index: skippedRepeat } : {}),
            evidence: ['skipped after Codex usage limit blocked the run'],
            notes: `Previous blocked case: ${testCase.id}`,
          }));
        }
      }
      for (let skippedRepeat = repeatIndex + 1; skippedRepeat < args.repeats; skippedRepeat += 1) {
        report.cases.push(createCaseRun(testCase.id, 'blocked', {
          evidence_id: args.repeats > 1 ? `${testCase.id}.r${skippedRepeat}` : testCase.id,
          ...(args.repeats > 1 ? { repeat_index: skippedRepeat } : {}),
          evidence: ['skipped after Codex usage limit blocked the run'],
          notes: `Previous blocked repeat: ${testCase.id}#${repeatIndex}`,
        }));
      }
      stopAfterUsageLimit = true;
      break;
    }
  }
}

const outputPath = args.output
  ? path.resolve(root, args.output)
  : path.join(runDir, 'report.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

const summaryPath = path.join(path.dirname(outputPath), 'summary.md');
fs.writeFileSync(summaryPath, generateSummary(report, manifest, outputPath));

console.log(outputPath);
console.log(summaryPath);
