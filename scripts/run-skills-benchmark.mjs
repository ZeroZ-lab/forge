#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function findCodexBin() {
  if (process.env.CODEX_BIN) return process.env.CODEX_BIN;
  const candidates = [
    '/Applications/Codex.app/Contents/Resources/codex',
    spawnSync('zsh', ['-lc', 'command -v codex'], { encoding: 'utf8' }).stdout.trim(),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function parseArgs(argv) {
  const args = {
    caseIds: [],
    output: null,
    runId: new Date().toISOString().replace(/[:.]/g, '-'),
    maxCases: null,
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

function promptForCase(testCase, fixture) {
  return `你正在运行 Forge skills-suite benchmark。必须真实使用已安装的 Forge skills，而不是只做静态判断。

工作边界：
- 只在当前临时工作目录内创建或修改文件。
- 不要编辑 Forge 仓库本身。
- 可以创建这个 fixture 需要的 docs/src/tests 文件。
- 能运行验证命令时必须运行；不能运行时在 evidence 说明原因。
- 最终只输出一个 JSON object，不要 Markdown，不要解释。

Benchmark case:
${JSON.stringify({
  id: testCase.id,
  title: testCase.title,
  expected_skills: testCase.expected_skills,
  expected_artifacts: testCase.expected_artifacts,
  required_evidence: testCase.required_evidence,
  forbidden_behaviors: testCase.forbidden_behaviors,
  oracle_checks: testCase.oracle_checks,
}, null, 2)}

Fixture:
${fixture}

最终 JSON object 必须符合：
{
  "case_id": "${testCase.id}",
  "status": "pass" | "fail" | "blocked",
  "triggered_skills": ["forge-..."],
  "artifacts": ["path/or/dir"],
  "commands_run": ["exact command"],
  "decisions": ["decision_id"],
  "forbidden_behaviors": [],
  "evidence": ["short evidence strings"],
  "notes": "short note"
}

只有真实执行或明确遵循了对应 skill 协议，才能把 skill 放进 triggered_skills。`;
}

function runCase({ codexBin, runDir, testCase }) {
  const caseDir = path.join(runDir, 'workspaces', testCase.id);
  fs.mkdirSync(caseDir, { recursive: true });

  const fixture = fs.readFileSync(path.join(root, testCase.fixture), 'utf8');
  const prompt = promptForCase(testCase, fixture);
  const lastMessagePath = path.join(runDir, `${testCase.id}.last.txt`);
  const eventsPath = path.join(runDir, `${testCase.id}.events.jsonl`);
  const stderrPath = path.join(runDir, `${testCase.id}.stderr.log`);
  const stdoutFd = fs.openSync(eventsPath, 'w');
  const stderrFd = fs.openSync(stderrPath, 'w');

  const result = spawnSync(
    codexBin,
    [
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
      prompt,
    ],
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
    return {
      case_id: testCase.id,
      status: 'blocked',
      triggered_skills: [],
      artifacts: [],
      commands_run: [],
      decisions: [],
      forbidden_behaviors: [],
      evidence: [`codex exec failed: ${result.error.message}`],
      notes: `See ${stderrPath}`,
    };
  }

  if (result.status !== 0) {
    const errorMessage = errorMessageFromEvents(eventsPath);
    return {
      case_id: testCase.id,
      status: 'blocked',
      triggered_skills: [],
      artifacts: [],
      commands_run: [],
      decisions: [],
      forbidden_behaviors: [],
      evidence: [errorMessage ?? `codex exec exited ${result.status}`],
      notes: `See ${stderrPath}`,
    };
  }

  try {
    return extractJsonObject(fs.readFileSync(lastMessagePath, 'utf8'));
  } catch (error) {
    return {
      case_id: testCase.id,
      status: 'fail',
      triggered_skills: [],
      artifacts: [],
      commands_run: [],
      decisions: [],
      forbidden_behaviors: [],
      evidence: [`could not parse final JSON: ${error.message}`],
      notes: `See ${lastMessagePath}`,
    };
  }
}

const args = parseArgs(process.argv.slice(2));
const codexBin = findCodexBin();
if (!codexBin) {
  console.error('Codex CLI not found. Set CODEX_BIN or install Codex CLI.');
  process.exit(1);
}

const manifest = readJson('evals/skills-suite/manifest.json');
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

const report = {
  version: 1,
  suite: 'forge',
  run_id: args.runId,
  runner: `codex exec (${codexBin})`,
  started_at: new Date().toISOString(),
  cases: [],
};

for (const testCase of cases) {
  console.error(`Running ${testCase.id}...`);
  const result = runCase({ codexBin, runDir, testCase });
  report.cases.push(result);
  fs.writeFileSync(path.join(runDir, 'report.partial.json'), JSON.stringify(report, null, 2));
  if (
    result.status === 'blocked' &&
    result.evidence.some((item) => /usage limit|try again/i.test(item))
  ) {
    const remaining = cases.slice(cases.indexOf(testCase) + 1);
    for (const skippedCase of remaining) {
      report.cases.push({
        case_id: skippedCase.id,
        status: 'blocked',
        triggered_skills: [],
        artifacts: [],
        commands_run: [],
        decisions: [],
        forbidden_behaviors: [],
        evidence: ['skipped after Codex usage limit blocked the run'],
        notes: `Previous blocked case: ${testCase.id}`,
      });
    }
    break;
  }
}

const outputPath = args.output
  ? path.resolve(root, args.output)
  : path.join(runDir, 'report.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log(outputPath);
