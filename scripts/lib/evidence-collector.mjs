/**
 * evidence-collector.mjs — Independent evidence layer.
 *
 * The skill-suite oracle must not trust the agent's self-filled JSON.
 * This module reads two tamper-proof sources written by the Codex runner:
 *
 *   1. `<runDir>/<caseId>.events.jsonl` — the codex event stream. The agent
 *      cannot edit it; it is written by the harness process. It records every
 *      command run (with exit code), every file change, every agent message,
 *      and token usage.
 *   2. `<runDir>/workspaces/<caseId>/` — the real on-disk workspace tree the
 *      agent produced.
 *
 * Output is a plain evidence object consumed by run-report.mjs evaluators.
 * Pure functions, zero external deps, mirrors run-report.mjs conventions.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Read newline-delimited JSON, skipping blank/undecodable lines. */
function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  const events = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      // malformed line — ignore, never throw on evidence read
    }
  }
  return events;
}

/** Walk a directory tree and return relative file paths. */
function walkTree(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTree(full, base));
    } else if (entry.isFile()) {
      out.push(path.relative(base, full));
    }
  }
  return out;
}

/**
 * Extract a skill name from a shell command that reads a SKILL.md.
 * Matches `sed/cat/rg/find ... <path>/skills/<name>/SKILL.md`.
 * Returns null when no skill read is recognizable.
 */
const SKILL_READ_RE = /skills\/([^/'"]+)\/SKILL\.md/;

function extractSkillFromCommand(command) {
  if (typeof command !== 'string') return null;
  const match = command.match(SKILL_READ_RE);
  return match ? match[1] : null;
}

/**
 * Load independent evidence for a single case run.
 *
 * @param {string} runDir    Absolute path to the run directory (sibling of report.json).
 * @param {string} caseId    The benchmark case id.
 * @returns {object} evidence object with commands / files / skills / messages / usage.
 */
export function loadIndependentEvidence(runDir, caseId) {
  const eventsPath = path.join(runDir, `${caseId}.events.jsonl`);
  const workspaceDir = path.join(runDir, 'workspaces', caseId);
  const events = readJsonl(eventsPath);

  const commands = [];
  const filesChanged = [];
  const messages = [];
  const skillsRead = new Set();
  let tokenUsage = null;

  for (const event of events) {
    if (event.type !== 'item.completed') continue;
    const item = event.item;
    if (!item || typeof item !== 'object') continue;

    if (item.type === 'command_execution') {
      commands.push({
        command: typeof item.command === 'string' ? item.command : '',
        exitCode: typeof item.exit_code === 'number' ? item.exit_code : null,
        status: typeof item.status === 'string' ? item.status : null,
      });
      const skill = extractSkillFromCommand(item.command);
      if (skill && item.exit_code === 0) skillsRead.add(skill);
    } else if (item.type === 'file_change') {
      for (const change of item.changes ?? []) {
        if (change && typeof change.path === 'string') {
          filesChanged.push({ path: change.path, kind: change.kind ?? 'update' });
        }
      }
    } else if (item.type === 'agent_message') {
      messages.push({
        text: typeof item.text === 'string' ? item.text : '',
        isFinalReport: false,
      });
    }
  }

  // The last agent_message is the self-filled JSON report (what the agent
  // claims at the end). transcript_contains must NOT match against it —
  // only against in-process reasoning messages. This separates "the agent
  // reasoned about X mid-task" from "the agent repeated keyword X in its
  // final self-report".
  if (messages.length > 0) {
    messages[messages.length - 1].isFinalReport = true;
  }

  // turn-level token usage (sum across turns)
  let inputTokens = 0;
  let outputTokens = 0;
  let reasoningTokens = 0;
  let sawUsage = false;
  for (const event of events) {
    if (event.type === 'turn.completed' && event.usage) {
      sawUsage = true;
      inputTokens += event.usage.input_tokens ?? 0;
      outputTokens += event.usage.output_tokens ?? 0;
      reasoningTokens += event.usage.reasoning_output_tokens ?? 0;
    }
  }
  if (sawUsage) {
    tokenUsage = {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      reasoning_output_tokens: reasoningTokens,
    };
  }

  const workspaceFiles = walkTree(workspaceDir);

  // "available" means we have the behavioral stream (events.jsonl). A bare
  // workspace tree alone is not behavioral evidence — it cannot testify about
  // which commands ran or which skills were read. Callers that only stage
  // workspace files (synthetic disk tests) therefore fall back to self-report.
  const hasEvents = events.length > 0;

  return {
    runDir,
    caseId,
    eventsPath,
    workspaceDir,
    available: hasEvents,
    commands,
    filesChanged,
    messages,
    skillsRead: [...skillsRead],
    workspaceFiles,
    tokenUsage,
  };
}

/**
 * Resolve a relative artifact path to an absolute disk path, preferring the
 * run workspace then falling back to the repo root. Mirrors verify-disk logic.
 */
export function resolveWorkspacePath(evidence, relativePath, repoRoot) {
  const inWorkspace = path.join(evidence.workspaceDir, relativePath);
  if (fs.existsSync(inWorkspace)) return inWorkspace;
  if (repoRoot) {
    const inRepo = path.join(repoRoot, relativePath);
    if (fs.existsSync(inRepo)) return inRepo;
  }
  return null;
}

/**
 * Glob match an expected path against an actual relative path.
 * `*` is a wildcard, trailing `/` is a prefix, bare name is a basename.
 * Kept consistent with run-report.mjs pathMatch semantics.
 */
export function evidencePathMatch(expected, actual) {
  if (typeof expected !== 'string' || typeof actual !== 'string') return false;
  // normalize separators
  const norm = (s) => s.replace(/\\/g, '/');
  const exp = norm(expected);
  const act = norm(actual);

  if (exp.includes('*')) {
    const re = new RegExp(`^${exp.split('*').map((p) => p.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')).join('.*')}$`);
    return re.test(act);
  }
  if (exp.endsWith('/')) return act.startsWith(exp);
  if (!exp.includes('/')) return act.split('/').at(-1) === exp;
  return exp === act;
}

/**
 * Was a command (by substring match) actually run in the independent event stream?
 * Optionally require a non-null exit code (i.e. it really executed).
 */
export function commandWasRun(evidence, commandFragment, { requireExitCode = false } = {}) {
  if (!evidence || !Array.isArray(evidence.commands)) return false;
  const frag = typeof commandFragment === 'string' ? commandFragment.trim() : '';
  if (frag.length === 0) return false;
  return evidence.commands.some((entry) => {
    if (!entry.command.includes(frag)) return false;
    if (requireExitCode && entry.exitCode === null) return false;
    return true;
  });
}

/** Does the workspace tree (independent) contain a path matching `expected`? */
export function workspaceHasArtifact(evidence, expected) {
  if (!evidence || !Array.isArray(evidence.workspaceFiles)) return false;
  return evidence.workspaceFiles.some((actual) => evidencePathMatch(expected, actual));
}

/** Does the event stream record a file_change matching `expected`? */
export function fileChangeRecorded(evidence, expected) {
  if (!evidence || !Array.isArray(evidence.filesChanged)) return false;
  return evidence.filesChanged.some(({ path: changed }) => evidencePathMatch(expected, changed));
}

/** Did the agent read a given skill's SKILL.md in the event stream? */
export function skillWasRead(evidence, skillName) {
  if (!evidence || !Array.isArray(evidence.skillsRead)) return false;
  return evidence.skillsRead.includes(skillName);
}

/**
 * Did an in-process agent_message (NOT the final self-report) mention a phrase?
 * This backs the `transcript_contains` oracle: it distinguishes "the agent
 * reasoned about X during the task" from "the agent echoed X in its final JSON".
 * Without independent evidence, returns null (caller falls back to self-report).
 */
export function transcriptContains(evidence, phrase) {
  if (!evidence || !evidence.available) return null;
  if (typeof phrase !== 'string' || phrase.length === 0) return false;
  const processMessages = (evidence.messages ?? []).filter((m) => !m.isFinalReport);
  return processMessages.some((m) => typeof m.text === 'string' && m.text.includes(phrase));
}
