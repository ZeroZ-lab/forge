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
 * Strip a shell wrapper (`/bin/zsh -lc "..."`, `sh -c '...'`) to recover the
 * inner command. Returns the original string when no wrapper is present.
 * Best-effort: only the verb needs to be reliable, so we do not fully
 * tokenise shell quoting.
 */
function shellUnwrap(command) {
  if (typeof command !== 'string') return '';
  const m = command.match(/^\s*(?:\S*\/(?:zsh|sh|bash|fish)|zsh|sh|bash|fish)\s+-l?c\s+(["'])([\s\S]*)\1\s*$/);
  return m ? m[2] : command;
}

/** First token (verb) of a command, after shell-unwrap. */
function commandVerb(command) {
  const inner = shellUnwrap(command).trim();
  return inner.split(/\s+/)[0] ?? '';
}

/**
 * Skill path on the plugin standard layout: `skills/<name>/SKILL.md`.
 * Captures <name>. Unanchored so it matches absolute plugin-cache paths.
 */
const SKILL_PATH_RE = /skills\/([^/'"]+)\/SKILL\.md/;

/**
 * Extract a skill name from a command that references its SKILL.md path.
 * Pure extractor — does NOT decide whether the skill was actually read.
 * Read verification lives in {@link isRealSkillRead}; a command-string regex
 * + exit 0 is NOT sufficient (echo skills/codegen/SKILL.md is a cheat).
 */
function extractSkillFromCommand(command) {
  if (typeof command !== 'string') return null;
  const match = command.match(SKILL_PATH_RE);
  return match ? match[1] : null;
}

// Verbs that retrieve file CONTENT (a real read). `find`/`ls` only locate a
// path; `echo`/`printf` only print — none fetch the SKILL.md body.
const READ_VERBS = /^(cat|sed|head|tail|awk|less|more|nl|bat|rg|grep)\b/;

/**
 * Did a command_execution item actually READ a skill's SKILL.md?
 * A real read event is a content-retrieval verb on the standard skill path
 * with exit 0 AND non-empty aggregated_output (proof the body was fetched).
 * `echo skills/codegen/SKILL.md` prints the path string, never the body, and
 * is rejected (echo is not a read verb). A file_change touching the SKILL.md
 * path (see loadIndependentEvidence) also counts as a real read event.
 */
function isRealSkillRead(item) {
  if (!item || typeof item !== 'object') return false;
  const command = typeof item.command === 'string' ? item.command : '';
  if (!SKILL_PATH_RE.test(command)) return false;
  if (item.exit_code !== 0) return false;
  if (!READ_VERBS.test(commandVerb(command))) return false;
  const out = typeof item.aggregated_output === 'string' ? item.aggregated_output : '';
  return out.length > 0;
}

// Verbs that recite a fragment (print) instead of executing it. Used by
// isWrapperCommand to defeat echo-cheats against command_reported.
const PRINT_VERBS = /^(echo|cat|printf|print|puts|tee)\b/;

/**
 * Is `command` a wrapper that merely prints `frag` (echo/cat/printf, a
 * heredoc, or a quoted-arg dump) instead of executing it? Such commands must
 * NOT satisfy command_reported — `echo "node --test"` is not running tests.
 */
function isWrapperCommand(command, frag) {
  const inner = shellUnwrap(command);
  if (PRINT_VERBS.test(commandVerb(inner))) return true;
  if (/<<-?\s*['"]?[A-Za-z_][A-Za-z0-9_]*['"]?/.test(inner)) return true;
  if (frag) {
    // fragment appears ONLY inside a quoted string (quoted-arg wrapper):
    // strip all quoted substrings; if the fragment vanishes it was quoted,
    // i.e. recited as data rather than executed as a command token.
    const stripped = inner
      .replace(/"(?:\\.|[^"\\])*"/g, '')
      .replace(/'(?:\\.|[^'\\])*'/g, '');
    if (!stripped.includes(frag) && inner.includes(frag)) return true;
  }
  return false;
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
        stdout: typeof item.aggregated_output === 'string' ? item.aggregated_output : '',
      });
      // A real read event (content-retrieval verb + exit 0 + non-empty
      // aggregated_output), NOT a command-string regex + exit 0. echo/find
      // cheats that merely name the SKILL.md path are rejected by isRealSkillRead.
      if (isRealSkillRead(item)) {
        const skill = extractSkillFromCommand(item.command);
        if (skill) skillsRead.add(skill);
      }
    } else if (item.type === 'file_change') {
      for (const change of item.changes ?? []) {
        if (change && typeof change.path === 'string') {
          filesChanged.push({ path: change.path, kind: change.kind ?? 'update' });
          // a file_change touching the SKILL.md path is a real read event too
          // (handles staged-disk tests where a read is represented as a touch)
          const skillMatch = change.path.match(SKILL_PATH_RE);
          if (skillMatch) skillsRead.add(skillMatch[1]);
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
 *
 * Hardened against echo-cheats: a command counts only when it is NOT a
 * print/heredoc/quoted-arg wrapper (`echo "node --test"` must not satisfy
 * command_reported) AND it left an observable effect — non-empty stdout with
 * exit 0, OR the run recorded at least one file_change on disk. An echo-only
 * or no-op command with neither output nor file change is not behavioral
 * evidence that the command actually did anything.
 *
 * Optionally require exit 0 (not merely a non-null exit) with requireExitCode.
 */
export function commandWasRun(evidence, commandFragment, { requireExitCode = false } = {}) {
  if (!evidence || !Array.isArray(evidence.commands)) return false;
  const frag = typeof commandFragment === 'string' ? commandFragment.trim() : '';
  if (frag.length === 0) return false;
  const runHasFileChange = Array.isArray(evidence.filesChanged) && evidence.filesChanged.length > 0;
  return evidence.commands.some((entry) => {
    if (!entry.command.includes(frag)) return false;
    if (isWrapperCommand(entry.command, frag)) return false;
    if (requireExitCode && entry.exitCode !== 0) return false;
    const hasOutput = typeof entry.stdout === 'string' && entry.stdout.length > 0;
    const ranClean = entry.exitCode === 0 && hasOutput;
    if (!ranClean && !runHasFileChange) return false;
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
 * A structured self-report echo: text is a JSON object (the final report or a
 * mid-task stuffing blob). Free-form reasoning text is NOT a structured echo.
 * Used to separate "the agent reasoned about X" from "the agent echoed X in a
 * structured blob".
 */
function isStructuredEcho(text) {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!(t.startsWith('{') && t.endsWith('}'))) return false;
  try {
    const v = JSON.parse(t);
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  } catch {
    return false;
  }
}

/**
 * Did an in-process reasoning message (NOT the final self-report, NOT a
 * structured echo) mention a phrase? This backs the `transcript_contains`
 * oracle: it distinguishes "the agent reasoned about X during the task" from
 * "the agent echoed X in its final JSON or a mid-task stuffing blob". A phrase
 * appearing only in a non-reasoning (structured) message does NOT count.
 * Without independent evidence, returns null (caller falls back to self-report).
 */
const ARROW_RE = /[→⇒⇨➜⟶➔]/g;
const normalizeArrows = (s) => (typeof s === 'string' ? s.replace(ARROW_RE, '->') : s);

export function transcriptContains(evidence, phrase) {
  if (!evidence || !evidence.available) return null;
  if (typeof phrase !== 'string' || phrase.length === 0) return false;
  // Normalize Unicode arrows (→ ⇒ ⇨ …) to ASCII `->` on both sides so an oracle
  // phrase like "detail -> codegen -> review" still matches a transcript where
  // the agent reasoned with "detail → codegen → review" (the form used in
  // AGENTS.md and the published skills).
  const needle = normalizeArrows(phrase);
  const reasoning = (evidence.messages ?? []).filter(
    (m) => !m.isFinalReport && typeof m.text === 'string' && !isStructuredEcho(m.text),
  );
  return reasoning.some((m) => normalizeArrows(m.text).includes(needle));
}
