import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

import {
  createEffectivenessReport,
  parseEffectivenessReport,
} from './effectiveness-report.mjs';
import {
  createEvidenceEnvelope,
  verifyEvidenceEnvelope,
} from './evidence-envelope.mjs';

const RECEIPT_CONTRACT = 'forge-effectiveness-run-receipt';
const RECEIPT_VERSION = 1;
const RUNNER_IDENTITY = Object.freeze({ name: 'forge-effectiveness-runner', version: '1' });
const GIT_ISOLATION_POLICY = Object.freeze({
  GIT_CONFIG_GLOBAL: 'os.devNull',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_OPTIONAL_LOCKS: '0',
  GIT_TERMINAL_PROMPT: '0',
  GIT_NO_REPLACE_OBJECTS: '1',
});
const RESERVED_ENV = new Set([
  'CODEX_HOME',
  'FORGE_ATTEMPT_ID',
  'GIT_DIR',
  'GIT_INDEX_FILE',
  'GIT_WORK_TREE',
  ...Object.keys(GIT_ISOLATION_POLICY),
  'HOME',
  'OLDPWD',
  'PWD',
  'TEMP',
  'TMP',
  'TMPDIR',
  'XDG_CACHE_HOME',
  'XDG_CONFIG_HOME',
  'XDG_DATA_HOME',
]);
const INHERITED_ENV = [
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'PATH',
  'PATHEXT',
  'SYSTEMROOT',
  'TERM',
  'TZ',
  'WINDIR',
];
const DEFAULT_LIMITS = Object.freeze({
  timeoutMs: 10 * 60 * 1000,
  maxStdoutBytes: 8 * 1024 * 1024,
  maxStderrBytes: 2 * 1024 * 1024,
  maxCapturedWorkspaceBytes: 512 * 1024 * 1024,
  maxCapturedWorkspaceEntries: 50_000,
  maxDiffBytes: 64 * 1024 * 1024,
  gitOperationTimeoutMs: 2 * 60 * 1000,
  killGraceMs: 1_000,
});

function gitIsolationEnvironment() {
  return {
    ...GIT_ISOLATION_POLICY,
    GIT_CONFIG_GLOBAL: os.devNull,
  };
}

export class EffectivenessRunnerError extends Error {
  constructor(code, message, { stage = 'preflight', receipt = null, cause = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'EffectivenessRunnerError';
    this.code = code;
    this.stage = stage;
    this.receipt = receipt;
  }
}

function fail(code, message, options) {
  throw new EffectivenessRunnerError(code, message, options);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneData(value, label) {
  try {
    const cloned = structuredClone(value);
    JSON.stringify(cloned);
    return cloned;
  } catch (error) {
    fail('invalid_spec', `${label} must contain only cloneable JSON data`, { cause: error });
  }
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(compareText)
      .map((key) => [key, stableValue(value[key])]),
  );
}

function sha256Buffer(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function sha256Json(value) {
  return sha256Buffer(JSON.stringify(stableValue(value)));
}

function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(64 * 1024);
  const descriptor = fs.openSync(filePath, 'r');
  try {
    let bytesRead;
    do {
      bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(descriptor);
  }
  return `sha256:${hash.digest('hex')}`;
}

function fileReference(filePath) {
  return {
    ref: path.basename(filePath),
    digest: hashFile(filePath),
    bytes: fs.statSync(filePath).size,
  };
}

function atomicWrite(filePath, content) {
  const temporary = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`,
  );
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, content);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, filePath);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    fs.rmSync(temporary, { force: true });
  }
}

function atomicWriteJson(filePath, value) {
  atomicWrite(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function pathIsWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolvePhysicalCandidate(candidate) {
  let existing = path.resolve(candidate);
  const missing = [];
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) {
      fail('evidence_unavailable', `no existing ancestor for ${candidate}`);
    }
    missing.unshift(path.basename(existing));
    existing = parent;
  }
  return path.resolve(fs.realpathSync(existing), ...missing);
}

function assertSeparateEvidenceRoot(sourceDir, evidenceRoot) {
  if (pathIsWithin(sourceDir, evidenceRoot) || pathIsWithin(evidenceRoot, sourceDir)) {
    fail('overlapping_roots', 'evidence root and source repository must be physically separate');
  }
}

function runGit(
  cwd,
  args,
  {
    encoding = 'utf8',
    allowFailure = false,
    maxBuffer = 64 * 1024 * 1024,
    timeout,
  } = {},
) {
  const safeArgs = [
    '-c',
    'core.fsmonitor=false',
    '-c',
    `core.hooksPath=${os.devNull}`,
    ...args,
  ];
  const result = spawnSync('git', safeArgs, {
    cwd,
    encoding,
    env: {
      ...Object.fromEntries(
        INHERITED_ENV.filter((name) => process.env[name] !== undefined)
          .map((name) => [name, process.env[name]]),
      ),
      ...gitIsolationEnvironment(),
    },
    maxBuffer,
    timeout,
  });
  if (result.error) {
    if (allowFailure) return result;
    if (result.error.code === 'ETIMEDOUT') {
      fail('git_timeout', `git ${args[0] ?? ''} exceeded its operation timeout`, {
        stage: 'capture',
        cause: result.error,
      });
    }
    if (result.error.code === 'ENOBUFS') {
      fail('git_output_limit', `git ${args[0] ?? ''} exceeded its output limit`, {
        stage: 'capture',
        cause: result.error,
      });
    }
    fail('git_unavailable', `git ${args[0] ?? ''} could not run: ${result.error.message}`, {
      stage: 'preflight',
      cause: result.error,
    });
  }
  if (result.status !== 0 && !allowFailure) {
    const stderr = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString('utf8')
      : String(result.stderr ?? '');
    fail('git_failed', `git ${args[0] ?? ''} exited ${result.status}: ${stderr.trim().slice(0, 1000)}`);
  }
  return result;
}

function captureSourceGuard(sourceDir, limits, command) {
  const gitOptions = { timeout: limits.gitOperationTimeoutMs };
  const head = runGit(sourceDir, ['rev-parse', 'HEAD'], gitOptions).stdout.trim();
  const tree = runGit(sourceDir, ['rev-parse', 'HEAD^{tree}'], gitOptions).stdout.trim();
  const status = runGit(
    sourceDir,
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
    { encoding: null, ...gitOptions },
  ).stdout;
  const refs = runGit(
    sourceDir,
    ['for-each-ref', '--format=%(refname)%00%(objectname)%00%(symref)'],
    { encoding: null, ...gitOptions },
  ).stdout;
  const index = runGit(
    sourceDir,
    ['ls-files', '--stage', '-z'],
    { encoding: null, ...gitOptions },
  ).stdout;
  const worktree = captureWorkspaceManifest(sourceDir, limits);
  const sensitiveMaterialDetected = workspaceContainsSensitiveMaterial(
    sourceDir,
    worktree,
    command,
  );
  const worktreeDigest = sensitiveMaterialDetected ? null : worktree.digest;
  return {
    head,
    tree,
    dirty: status.length > 0,
    status_digest: sha256Buffer(status),
    refs_digest: sha256Buffer(refs),
    index_digest: sha256Buffer(index),
    worktree_digest: worktreeDigest,
    sensitive_material_detected: sensitiveMaterialDetected,
    digest: sha256Json({
      head,
      tree,
      status: sha256Buffer(status),
      refs: sha256Buffer(refs),
      index: sha256Buffer(index),
      worktree: worktreeDigest ?? 'credential_material_detected',
    }),
  };
}

function assertSourceRepository(sourceDir, expectedRevision, limits, command) {
  const gitOptions = { timeout: limits.gitOperationTimeoutMs };
  const topLevel = runGit(
    sourceDir,
    ['rev-parse', '--show-toplevel'],
    gitOptions,
  ).stdout.trim();
  if (fs.realpathSync(topLevel) !== sourceDir) {
    fail('invalid_source', 'source.dir must be the Git repository root');
  }
  const guard = captureSourceGuard(sourceDir, limits, command);
  if (guard.sensitive_material_detected) {
    fail(
      'credential_material_detected',
      'source repository contains configured credential material',
    );
  }
  if (guard.dirty) {
    fail('dirty_source', 'source repository must have no tracked or untracked changes');
  }
  if (expectedRevision !== undefined && expectedRevision !== guard.head) {
    fail(
      'revision_mismatch',
      `source revision ${guard.head} does not match requested revision ${expectedRevision}`,
    );
  }
  const indexText = runGit(sourceDir, ['ls-files', '--stage'], gitOptions).stdout;
  if (/^160000 /m.test(indexText)) {
    fail('unsupported_gitlink', 'source repository contains a submodule gitlink');
  }
  return guard;
}

function validatePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail('invalid_limits', `${label} must be a positive safe integer`);
  }
  return value;
}

function validateSpec(rawSpec) {
  if (!isPlainObject(rawSpec)) fail('invalid_spec', 'runner spec must be an object');
  const buildReportInput = rawSpec.buildReportInput;
  if (typeof buildReportInput !== 'function') {
    fail('invalid_spec', 'buildReportInput must be a function');
  }
  const signal = rawSpec.signal;
  const { buildReportInput: _build, signal: _signal, ...dataSpec } = rawSpec;
  const spec = cloneData(dataSpec, 'runner spec');

  if (
    typeof spec.attemptId !== 'string' ||
    spec.attemptId === '.' ||
    spec.attemptId === '..' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(spec.attemptId)
  ) {
    fail('invalid_attempt_id', `unsafe attempt id: ${String(spec.attemptId)}`);
  }
  if (!isPlainObject(spec.source) || typeof spec.source.dir !== 'string' || typeof spec.source.ref !== 'string' || spec.source.ref.length === 0) {
    fail('invalid_spec', 'source.dir and source.ref are required strings');
  }
  if (typeof spec.evidenceRoot !== 'string' || spec.evidenceRoot.length === 0) {
    fail('invalid_spec', 'evidenceRoot must be a non-empty path');
  }
  if (!isPlainObject(spec.command) || typeof spec.command.file !== 'string' || spec.command.file.length === 0) {
    fail('invalid_spec', 'command.file must be a non-empty string');
  }
  if (!Array.isArray(spec.command.args) || spec.command.args.some((item) => typeof item !== 'string')) {
    fail('invalid_spec', 'command.args must be an array of strings');
  }
  if (
    typeof spec.command.definitionDigest !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/.test(spec.command.definitionDigest)
  ) {
    fail('invalid_spec', 'command.definitionDigest must be a lowercase sha256 digest');
  }
  const commandEnv = spec.command.env ?? {};
  if (
    !isPlainObject(commandEnv) ||
    Object.entries(commandEnv).some(([name, value]) =>
      !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || typeof value !== 'string')
  ) {
    fail('invalid_spec', 'command.env must contain only string environment variables');
  }
  const reserved = Object.keys(commandEnv).find((name) => RESERVED_ENV.has(name));
  if (reserved) fail('reserved_environment', `command.env cannot override ${reserved}`);
  const sensitiveValues = spec.command.sensitiveValues ?? [];
  if (!Array.isArray(sensitiveValues) || sensitiveValues.some((value) => typeof value !== 'string')) {
    fail('invalid_spec', 'command.sensitiveValues must be an array of strings');
  }
  if (spec.command.label !== undefined && (typeof spec.command.label !== 'string' || spec.command.label.length === 0)) {
    fail('invalid_spec', 'command.label must be a non-empty string when supplied');
  }
  if (typeof spec.contractRoot !== 'string' || !isPlainObject(spec.experimentPlan)) {
    fail('invalid_spec', 'contractRoot and experimentPlan are required');
  }
  if (typeof spec.armId !== 'string' || spec.armId.length === 0) {
    fail('invalid_spec', 'armId must be a non-empty string');
  }
  if (
    !isPlainObject(spec.experimentPlan.arms) ||
    !Object.hasOwn(spec.experimentPlan.arms, spec.armId)
  ) {
    fail('unknown_arm', `experiment plan does not define arm ${spec.armId}`);
  }
  const selectedArm = spec.experimentPlan.arms[spec.armId];
  if (
    !isPlainObject(selectedArm) ||
    typeof selectedArm.definition_digest !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/.test(selectedArm.definition_digest) ||
    !isPlainObject(selectedArm.capability_policy)
  ) {
    fail('invalid_experiment_plan', `experiment plan arm ${spec.armId} is incomplete`);
  }
  if (signal !== undefined && (signal === null || typeof signal.aborted !== 'boolean' || typeof signal.addEventListener !== 'function')) {
    fail('invalid_spec', 'signal must be an AbortSignal');
  }

  const limits = { ...DEFAULT_LIMITS, ...(spec.limits ?? {}) };
  for (const key of Object.keys(DEFAULT_LIMITS)) validatePositiveInteger(limits[key], `limits.${key}`);
  const unknownLimit = Object.keys(spec.limits ?? {}).find((key) => !Object.hasOwn(DEFAULT_LIMITS, key));
  if (unknownLimit) fail('invalid_limits', `unsupported limit: ${unknownLimit}`);
  spec.limits = limits;
  spec.command.env = commandEnv;
  spec.command.sensitiveValues = sensitiveValues;
  return { spec, buildReportInput, signal };
}

function symlinkEscapes(rootDir, linkPath, target) {
  const lexicalTarget = path.resolve(path.dirname(linkPath), target);
  if (!pathIsWithin(rootDir, lexicalTarget)) return true;
  try {
    return !pathIsWithin(rootDir, fs.realpathSync(linkPath));
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function captureWorkspaceManifest(workspaceDir, limits) {
  const canonicalWorkspaceDir = fs.realpathSync(workspaceDir);
  const entries = [];
  let totalBytes = 0;
  let totalEntries = 0;
  let fileCount = 0;

  function visit(directory, relativeDirectory = '') {
    const children = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => compareText(left.name, right.name));
    for (const child of children) {
      if (relativeDirectory === '' && child.name === '.git') continue;
      totalEntries += 1;
      if (totalEntries > limits.maxCapturedWorkspaceEntries) {
        fail('workspace_limit', `workspace capture exceeds ${limits.maxCapturedWorkspaceEntries} entries`, {
          stage: 'capture',
        });
      }
      const relativePath = relativeDirectory
        ? path.posix.join(relativeDirectory.split(path.sep).join('/'), child.name)
        : child.name;
      const fullPath = path.join(directory, child.name);
      const stat = fs.lstatSync(fullPath);
      if (stat.isDirectory()) {
        entries.push({
          path: relativePath,
          type: 'directory',
          mode: stat.mode & 0o777,
          bytes: 0,
        });
        visit(fullPath, path.join(relativeDirectory, child.name));
        continue;
      }
      const mode = stat.mode & 0o777;
      if (stat.isFile()) {
        fileCount += 1;
        totalBytes += stat.size;
        if (totalBytes > limits.maxCapturedWorkspaceBytes) {
          fail('workspace_limit', `workspace capture exceeds ${limits.maxCapturedWorkspaceBytes} bytes`, {
            stage: 'capture',
          });
        }
        entries.push({
          path: relativePath,
          type: 'file',
          mode,
          bytes: stat.size,
          digest: hashFile(fullPath),
        });
      } else if (stat.isSymbolicLink()) {
        fileCount += 1;
        const target = fs.readlinkSync(fullPath);
        if (symlinkEscapes(canonicalWorkspaceDir, fullPath, target)) {
          fail('external_symlink', `workspace symlink escapes isolation: ${relativePath}`, {
            stage: 'capture',
          });
        }
        totalBytes += Buffer.byteLength(target);
        if (totalBytes > limits.maxCapturedWorkspaceBytes) {
          fail('workspace_limit', `workspace capture exceeds ${limits.maxCapturedWorkspaceBytes} bytes`, {
            stage: 'capture',
          });
        }
        entries.push({
          path: relativePath,
          type: 'symlink',
          mode,
          bytes: Buffer.byteLength(target),
          target,
          digest: sha256Buffer(target),
        });
      } else {
        fail('non_regular_file', `workspace contains non-regular file: ${relativePath}`, {
          stage: 'capture',
        });
      }
    }
  }

  visit(workspaceDir);
  entries.sort((left, right) => compareText(left.path, right.path));
  return {
    entries,
    entry_count: totalEntries,
    file_count: fileCount,
    total_bytes: totalBytes,
    digest: sha256Json(entries),
  };
}

function compareManifests(initial, final) {
  const initialByPath = new Map(initial.entries.map((entry) => [entry.path, entry]));
  const finalByPath = new Map(final.entries.map((entry) => [entry.path, entry]));
  const paths = [...new Set([...initialByPath.keys(), ...finalByPath.keys()])].sort(compareText);
  const changes = [];
  for (const relativePath of paths) {
    const before = initialByPath.get(relativePath);
    const after = finalByPath.get(relativePath);
    if (!before) {
      changes.push({ path: relativePath, change: 'added', artifact: after });
    } else if (!after) {
      changes.push({ path: relativePath, change: 'deleted', previous: before });
    } else if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes.push({ path: relativePath, change: 'modified', previous: before, artifact: after });
    }
  }
  return changes;
}

function inheritedEnvironmentSnapshot() {
  return Object.fromEntries(
    INHERITED_ENV.filter((name) => process.env[name] !== undefined)
      .map((name) => [name, process.env[name]]),
  );
}

function isolatedEnvironment(runtimeDir, commandEnv, inheritedEnvironment) {
  const homeDir = path.join(runtimeDir, 'home');
  const tempDir = path.join(runtimeDir, 'tmp');
  const codexHome = path.join(runtimeDir, 'codex');
  const xdgRoot = path.join(runtimeDir, 'xdg');
  for (const directory of [homeDir, tempDir, codexHome, xdgRoot]) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  return {
    ...inheritedEnvironment,
    ...commandEnv,
    CODEX_HOME: codexHome,
    ...gitIsolationEnvironment(),
    HOME: homeDir,
    TEMP: tempDir,
    TMP: tempDir,
    TMPDIR: tempDir,
    XDG_CACHE_HOME: path.join(xdgRoot, 'cache'),
    XDG_CONFIG_HOME: path.join(xdgRoot, 'config'),
    XDG_DATA_HOME: path.join(xdgRoot, 'data'),
  };
}

function sendProcessTreeSignal(child, signal) {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== 'ESRCH' && error.code !== 'EPERM') throw error;
  }
}

async function waitForProcessTreeExit(child, timeoutMs) {
  if (!child?.pid || process.platform === 'win32') return true;
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    try {
      process.kill(-child.pid, 0);
    } catch (error) {
      if (error.code === 'ESRCH') return true;
      // Darwin can return EPERM for a just-reaped detached process group even
      // after the runner successfully delivered SIGKILL to that same group.
      if (error.code === 'EPERM') return true;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return false;
}

async function terminateRemainingProcessGroup(child, graceMs) {
  if (!child?.pid || process.platform === 'win32') return true;
  if (await waitForProcessTreeExit(child, 1)) return true;
  sendProcessTreeSignal(child, 'SIGTERM');
  if (await waitForProcessTreeExit(child, graceMs)) return true;
  sendProcessTreeSignal(child, 'SIGKILL');
  return waitForProcessTreeExit(child, Math.max(250, graceMs));
}

function createOutputCapture(filePath, limit, onLimit) {
  const descriptor = fs.openSync(filePath, 'wx', 0o600);
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  let retainedBytes = 0;
  let truncated = false;
  let closed = false;
  return {
    write(chunk) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      hash.update(buffer);
      const remaining = Math.max(0, limit - retainedBytes);
      if (remaining > 0) {
        const retained = buffer.subarray(0, remaining);
        fs.writeSync(descriptor, retained);
        retainedBytes += retained.length;
      }
      if (buffer.length > remaining) {
        truncated = true;
        onLimit();
      }
    },
    close() {
      if (closed) return;
      closed = true;
      fs.fsyncSync(descriptor);
      fs.closeSync(descriptor);
    },
    summary() {
      if (!closed) this.close();
      return {
        observed_digest: `sha256:${hash.digest('hex')}`,
        observed_bytes: bytes,
        retained_bytes: retainedBytes,
        truncated,
      };
    },
  };
}

async function executeCommand({ command, environment, workspaceDir, captureDir, limits, signal }) {
  fs.mkdirSync(captureDir, { recursive: true, mode: 0o700 });
  const stdoutPath = path.join(captureDir, 'stdout.log');
  const stderrPath = path.join(captureDir, 'stderr.log');
  let requestedStop = null;
  let child = null;
  let escalationTimer = null;
  let escalationPromise = null;
  let deadlineTimer = null;
  let processClosed = false;
  const startedAt = new Date().toISOString();
  const startedMonotonic = performance.now();

  function requestStop(termination, detail) {
    if (requestedStop || processClosed) return;
    requestedStop = { termination, detail };
    if (!child?.pid) return;
    sendProcessTreeSignal(child, 'SIGTERM');
    escalationPromise = new Promise((resolve) => {
      escalationTimer = setTimeout(() => {
        sendProcessTreeSignal(child, 'SIGKILL');
        resolve();
      }, limits.killGraceMs);
    });
  }

  const stdout = createOutputCapture(stdoutPath, limits.maxStdoutBytes, () => {
    requestStop('cancelled', 'stdout_limit_exceeded');
  });
  const stderr = createOutputCapture(stderrPath, limits.maxStderrBytes, () => {
    requestStop('cancelled', 'stderr_limit_exceeded');
  });

  const abortListener = () => requestStop('cancelled', 'abort_signal');
  if (signal?.aborted) requestStop('cancelled', 'abort_signal');
  else signal?.addEventListener('abort', abortListener, { once: true });

  let exitCode = null;
  let exitSignal = null;
  let spawnError = null;
  try {
    if (!requestedStop) {
      await new Promise((resolve) => {
        try {
          child = spawn(command.file, command.args, {
            cwd: workspaceDir,
            env: environment,
            detached: process.platform !== 'win32',
            stdio: ['ignore', 'pipe', 'pipe'],
          });
        } catch (error) {
          spawnError = error;
          resolve();
          return;
        }

        child.stdout.on('data', (chunk) => stdout.write(chunk));
        child.stderr.on('data', (chunk) => stderr.write(chunk));
        child.once('error', (error) => {
          spawnError = error;
        });
        child.once('close', (code, closeSignal) => {
          processClosed = true;
          exitCode = code;
          exitSignal = closeSignal;
          resolve();
        });
        deadlineTimer = setTimeout(
          () => requestStop('timeout', 'deadline_exceeded'),
          limits.timeoutMs,
        );
      });
      if (requestedStop && escalationPromise) {
        await escalationPromise;
        const stopped = await waitForProcessTreeExit(child, Math.max(250, limits.killGraceMs));
        if (!stopped) {
          requestedStop = {
            termination: 'infrastructure_error',
            detail: 'process_tree_cleanup_failed',
          };
        }
      }
      const descendantsStopped = await terminateRemainingProcessGroup(child, limits.killGraceMs);
      if (!descendantsStopped) {
        requestedStop = {
          termination: 'infrastructure_error',
          detail: 'process_tree_cleanup_failed',
        };
      }
    }
  } finally {
    clearTimeout(deadlineTimer);
    clearTimeout(escalationTimer);
    signal?.removeEventListener('abort', abortListener);
    stdout.close();
    stderr.close();
  }

  const durationMs = Math.max(0, Math.round((performance.now() - startedMonotonic) * 1000) / 1000);
  const endedAt = new Date(Date.parse(startedAt) + durationMs).toISOString();
  let termination;
  let detail;
  if (requestedStop) {
    ({ termination, detail } = requestedStop);
  } else if (spawnError) {
    termination = 'infrastructure_error';
    detail = 'spawn_failed';
    exitCode = null;
    exitSignal = null;
  } else if (exitCode === 0 && exitSignal === null) {
    termination = 'completed';
    detail = 'process_completed';
  } else {
    termination = 'process_error';
    detail = exitSignal ? 'process_signalled' : 'nonzero_exit';
  }

  return {
    startedAt,
    endedAt,
    durationMs,
    termination,
    detail,
    processTermination: termination,
    processDetail: detail,
    exitCode,
    signal: exitSignal,
    spawnError: spawnError
      ? {
          code: String(spawnError.code ?? 'UNKNOWN'),
          message: `process launch failed with ${String(spawnError.code ?? 'UNKNOWN')}`,
        }
      : null,
    stdout: stdout.summary(),
    stderr: stderr.summary(),
  };
}

function processSensitiveValues(command) {
  const inferred = Object.entries(command.env)
    .filter(([name]) => /(?:AUTH|CREDENTIAL|KEY|PASSWORD|SECRET|TOKEN)/i.test(name))
    .map(([, value]) => value);
  return [...new Set([...inferred, ...command.sensitiveValues])]
    .filter((value) => typeof value === 'string' && value.length > 0);
}

function redactSensitiveStrings(command, values) {
  const sensitiveValues = processSensitiveValues(command)
    .sort((left, right) => right.length - left.length || compareText(left, right));
  if (sensitiveValues.length === 0) return [...values];
  const pattern = new RegExp(
    sensitiveValues
      .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|'),
    'gu',
  );
  return values.map((value) => value.replace(pattern, '<sensitive>'));
}

function containsSensitiveMaterial(command, ...values) {
  const sensitiveBuffers = processSensitiveValues(command).map((value) => Buffer.from(value));
  return sensitiveBuffers.some((sensitive) =>
    values.some((value) => Buffer.from(value).includes(sensitive)));
}

function valueContainsSensitiveMaterial(command, value) {
  const sensitiveValues = processSensitiveValues(command);
  function visit(current) {
    if (typeof current === 'string') {
      return sensitiveValues.some((sensitive) => current.includes(sensitive));
    }
    if (Array.isArray(current)) return current.some(visit);
    if (!isPlainObject(current)) return false;
    return Object.entries(current).some(([key, child]) => visit(key) || visit(child));
  }
  return visit(value);
}

function fileContainsSensitiveMaterial(filePath, sensitiveBuffers) {
  if (sensitiveBuffers.length === 0) return false;
  const maximumLength = Math.max(...sensitiveBuffers.map((value) => value.length));
  const descriptor = fs.openSync(filePath, 'r');
  const chunk = Buffer.allocUnsafe(64 * 1024);
  let carry = Buffer.alloc(0);
  try {
    while (true) {
      const bytesRead = fs.readSync(descriptor, chunk, 0, chunk.length, null);
      if (bytesRead === 0) return false;
      const window = Buffer.concat([carry, chunk.subarray(0, bytesRead)]);
      if (sensitiveBuffers.some((sensitive) => window.includes(sensitive))) return true;
      const carryLength = Math.min(window.length, Math.max(0, maximumLength - 1));
      carry = Buffer.from(window.subarray(window.length - carryLength));
    }
  } finally {
    fs.closeSync(descriptor);
  }
}

function workspaceContainsSensitiveMaterial(workspaceDir, manifest, command) {
  if (valueContainsSensitiveMaterial(command, manifest.entries)) return true;
  const sensitiveBuffers = processSensitiveValues(command).map((value) => Buffer.from(value));
  return manifest.entries
    .filter((entry) => entry.type === 'file')
    .some((entry) =>
      fileContainsSensitiveMaterial(path.join(workspaceDir, entry.path), sensitiveBuffers));
}

function assertCommandDoesNotExposeProtectedRoots(command, roots) {
  const exposedValues = [...command.args, ...Object.values(command.env)];
  for (const root of roots) {
    if (exposedValues.some((value) => value.includes(root))) {
      fail(
        'protected_path_exposure',
        'command args and environment must not expose source or evidence root paths',
      );
    }
  }
}

function assertPersistentMetadataHasNoSensitiveMaterial(spec) {
  const metadata = {
    attempt_id: spec.attemptId,
    arm_id: spec.armId,
    source_ref: spec.source.ref,
    executable: path.basename(spec.command.file),
    definition_digest: spec.command.definitionDigest,
    label: spec.command.label ?? null,
  };
  if (valueContainsSensitiveMaterial(spec.command, metadata)) {
    fail('sensitive_metadata', 'persistent runner metadata contains credential material');
  }
}

function promoteProcessOutput(command, commandResult, captureDir, evidenceDir) {
  const stdoutSource = path.join(captureDir, 'stdout.log');
  const stderrSource = path.join(captureDir, 'stderr.log');
  const sensitiveConfigured = processSensitiveValues(command).length > 0;
  const leaked = containsSensitiveMaterial(
    command,
    fs.readFileSync(stdoutSource),
    fs.readFileSync(stderrSource),
  );
  const unverifiable = sensitiveConfigured &&
    (commandResult.stdout.truncated || commandResult.stderr.truncated);
  if (leaked || unverifiable) {
    commandResult.termination = 'infrastructure_error';
    commandResult.detail = leaked
      ? 'credential_material_detected'
      : 'credential_material_unverifiable';
    commandResult.stdout = {
      ...commandResult.stdout,
      observed_digest: null,
      retained_bytes: 0,
      truncated: true,
      retention: 'rejected_credential_material',
    };
    commandResult.stderr = {
      ...commandResult.stderr,
      observed_digest: null,
      retained_bytes: 0,
      truncated: true,
      retention: 'rejected_credential_material',
    };
    fs.rmSync(stdoutSource, { force: true });
    fs.rmSync(stderrSource, { force: true });
    return;
  }

  atomicWrite(path.join(evidenceDir, 'stdout.log'), fs.readFileSync(stdoutSource));
  atomicWrite(path.join(evidenceDir, 'stderr.log'), fs.readFileSync(stderrSource));
  commandResult.stdout.retention = 'retained';
  commandResult.stderr.retention = 'retained';
}

function cloneRepository(sourceDir, revision, workspaceDir, captureGitDir, limits) {
  runGit(path.dirname(workspaceDir), [
    'clone',
    '--depth=1',
    '--quiet',
    '--no-local',
    '--no-checkout',
    '--no-tags',
    '--single-branch',
    '--',
    sourceDir,
    workspaceDir,
  ], { timeout: limits.gitOperationTimeoutMs });
  runGit(workspaceDir, ['remote', 'remove', 'origin'], {
    timeout: limits.gitOperationTimeoutMs,
  });
  runGit(workspaceDir, ['checkout', '--quiet', '--detach', revision], {
    timeout: limits.gitOperationTimeoutMs,
  });
  const actual = runGit(workspaceDir, ['rev-parse', 'HEAD'], {
    timeout: limits.gitOperationTimeoutMs,
  }).stdout.trim();
  if (actual !== revision) fail('clone_revision_mismatch', 'isolated clone revision mismatch');
  runGit(path.dirname(captureGitDir), [
    'clone',
    '--bare',
    '--depth=1',
    '--quiet',
    '--no-local',
    '--no-tags',
    '--single-branch',
    '--',
    sourceDir,
    captureGitDir,
  ], { timeout: limits.gitOperationTimeoutMs });
  runGit(
    path.dirname(captureGitDir),
    [`--git-dir=${captureGitDir}`, 'remote', 'remove', 'origin'],
    { timeout: limits.gitOperationTimeoutMs },
  );
  const captureRevision = runGit(
    path.dirname(captureGitDir),
    [`--git-dir=${captureGitDir}`, 'rev-parse', revision],
    { timeout: limits.gitOperationTimeoutMs },
  ).stdout.trim();
  if (captureRevision !== revision) {
    fail('clone_revision_mismatch', 'capture repository revision mismatch');
  }
}

function removeNestedGitMetadata(workspaceDir) {
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.name.toLowerCase() === '.git') {
        fs.rmSync(entryPath, { recursive: true, force: true });
      } else if (entry.isDirectory()) {
        visit(entryPath);
      }
    }
  }
  visit(workspaceDir);
}

function captureDelta(
  workspaceDir,
  captureGitDir,
  baseRevision,
  initialManifest,
  evidenceDir,
  limits,
  command,
) {
  removeNestedGitMetadata(workspaceDir);
  const finalManifest = captureWorkspaceManifest(workspaceDir, limits);
  if (workspaceContainsSensitiveMaterial(workspaceDir, finalManifest, command)) {
    fail('credential_material_detected', 'workspace capture contains credential material', {
      stage: 'capture',
    });
  }
  const captureGit = (...args) => runGit(
    workspaceDir,
    [
      `--git-dir=${captureGitDir}`,
      `--work-tree=${workspaceDir}`,
      ...args,
    ],
    { timeout: limits.gitOperationTimeoutMs },
  );
  captureGit('add', '-A', '-f', '--', '.');
  const finalTree = captureGit('write-tree').stdout.trim();
  const diff = runGit(
    workspaceDir,
    [
      `--git-dir=${captureGitDir}`,
      `--work-tree=${workspaceDir}`,
      'diff',
      '--cached',
      '--binary',
      '--no-ext-diff',
      '--no-textconv',
      '--no-renames',
      baseRevision,
      '--',
    ],
    {
      encoding: null,
      maxBuffer: limits.maxDiffBytes,
      timeout: limits.gitOperationTimeoutMs,
    },
  ).stdout;
  const summary = {
    schema_version: 1,
    initial_snapshot_digest: initialManifest.digest,
    final_snapshot_digest: finalManifest.digest,
    final_tree: `git-tree:${finalTree}`,
    initial: {
      file_count: initialManifest.file_count,
      total_bytes: initialManifest.total_bytes,
    },
    final: {
      file_count: finalManifest.file_count,
      total_bytes: finalManifest.total_bytes,
    },
    changes: compareManifests(initialManifest, finalManifest),
    artifacts: finalManifest.entries,
  };
  const summaryBytes = Buffer.from(`${JSON.stringify(summary, null, 2)}\n`);
  if (
    containsSensitiveMaterial(command, diff, summaryBytes) ||
    valueContainsSensitiveMaterial(command, summary)
  ) {
    fail('credential_material_detected', 'workspace capture contains credential material', {
      stage: 'capture',
    });
  }
  const diffPath = path.join(evidenceDir, 'diff.patch');
  atomicWrite(diffPath, diff);
  const summaryPath = path.join(evidenceDir, 'artifacts.json');
  atomicWrite(summaryPath, summaryBytes);
  return {
    finalManifest,
    finalTree: `git-tree:${finalTree}`,
    changes: summary.changes,
    diff: fileReference(diffPath),
    summary: fileReference(summaryPath),
  };
}

function lifecycleEvents(attemptId, attemptStartedAt, commandResult, delta) {
  return [
    {
      type: 'runner.attempt_started',
      attempt_id: attemptId,
      observed_at: attemptStartedAt,
    },
    {
      type: 'runner.process_finished',
      attempt_id: attemptId,
      observed_at: commandResult.endedAt,
      termination: commandResult.processTermination,
      detail: commandResult.processDetail,
      exit_code: commandResult.exitCode,
      signal: commandResult.signal,
    },
    {
      type: 'runner.workspace_captured',
      attempt_id: attemptId,
      observed_at: delta.capturedAt,
      capture_status: delta.captureComplete ? 'completed' : 'failed',
      final_snapshot_digest: delta.finalManifest?.digest ?? null,
      changed_artifacts: delta.changes.length,
    },
  ];
}

function commandReceipt(spec, result) {
  return {
    schema_version: 1,
    label: spec.command.label ?? path.basename(spec.command.file),
    executable: path.basename(spec.command.file),
    definition_digest: spec.command.definitionDigest,
    argv_digest: sha256Json(redactSensitiveStrings(spec.command, spec.command.args)),
    working_directory: 'isolated-workspace',
    started_at: result.startedAt,
    ended_at: result.endedAt,
    duration_ms: result.durationMs,
    termination: result.processTermination,
    termination_detail: result.processDetail,
    exit_code: result.exitCode,
    signal: result.signal,
    spawn_error: result.spawnError,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function createRunnerReport(receipt, reportInput, experimentPlan, contractRoot) {
  if (!isPlainObject(reportInput) || !isPlainObject(reportInput.experiment)) {
    throw new Error('buildReportInput must return an object with experiment');
  }
  for (const field of ['schema_version', 'contract', 'report_id', 'execution']) {
    if (Object.hasOwn(reportInput, field)) throw new Error(`${field} is runner-owned`);
  }
  const input = cloneData(reportInput, 'report input');
  if (Object.hasOwn(input.experiment, 'workspace')) throw new Error('experiment.workspace is runner-owned');
  if (Object.hasOwn(input.experiment, 'capability_policy')) {
    throw new Error('experiment.capability_policy is plan-owned');
  }
  if (!isPlainObject(input.experiment.reproduction)) {
    throw new Error('experiment.reproduction is required');
  }
  if (Object.hasOwn(input.experiment.reproduction, 'request_fingerprint')) {
    throw new Error('experiment.reproduction.request_fingerprint is runner-owned');
  }
  if (!isPlainObject(input.experiment.arm) || typeof input.experiment.arm.id !== 'string') {
    throw new Error('experiment.arm.id is required');
  }
  if (input.experiment.arm.id !== receipt.experiment_arm.id) {
    throw new Error('experiment.arm.id does not match the prelaunch arm binding');
  }
  if (Object.hasOwn(input.experiment.arm, 'definition_digest')) {
    throw new Error('experiment.arm.definition_digest is plan-owned');
  }
  const plannedArm = experimentPlan.arms?.[receipt.experiment_arm.id];
  if (!plannedArm) throw new Error(`experiment plan does not define arm ${receipt.experiment_arm.id}`);
  if (
    plannedArm.definition_digest !== receipt.experiment_arm.definition_digest ||
    sha256Json(plannedArm.capability_policy) !== receipt.experiment_arm.capability_policy_digest
  ) {
    throw new Error('experiment plan no longer matches the prelaunch arm binding');
  }
  if (!Array.isArray(input.events) || !Array.isArray(input.evidence) || !Array.isArray(input.costs)) {
    throw new Error('events, evidence, and costs must be arrays');
  }
  if (!isPlainObject(input.final_result)) throw new Error('final_result is required');
  if (
    receipt.execution.termination !== 'completed' &&
    input.final_result.submission_status === 'submitted'
  ) {
    throw new Error('a non-completed process cannot publish a submitted result');
  }
  if (input.costs.some((item) => item?.metric === 'wall_time_ms')) {
    throw new Error('wall_time_ms is runner-owned');
  }
  if (input.events.some((event) => event?.actor === 'runner')) {
    throw new Error('event actor runner is runner-owned');
  }
  if (input.events.some((event) => event?.actor === 'verifier')) {
    throw new Error('verifier events are unavailable before B07');
  }
  if (input.evidence.some((item) => String(item?.producer_ref ?? '').startsWith('runner:'))) {
    throw new Error('runner evidence producer identity is runner-owned');
  }
  if (
    input.evidence.some((item) =>
      item?.source_kind === 'independent_verifier' || Object.hasOwn(item ?? {}, 'envelope_ref'))
  ) {
    throw new Error('independent verifier and Evidence Envelope claims are unavailable in B04');
  }
  if ((input.final_result.verifier_result_refs ?? []).length > 0) {
    throw new Error('verifier_result_refs are unavailable before B07');
  }
  if (input.costs.some((item) => item?.acquisition?.kind === 'runner')) {
    throw new Error('cost acquisition kind runner is runner-owned');
  }
  const reservedIdPrefix = `${receipt.attempt_id}.runner-`;
  if (
    input.events.some((event) => String(event?.id ?? '').startsWith(reservedIdPrefix)) ||
    input.evidence.some((item) => String(item?.id ?? '').startsWith(reservedIdPrefix))
  ) {
    throw new Error('runner id namespace is runner-owned');
  }

  const objectiveId = input.experiment.objective?.id;
  const maximumSequence = input.events.reduce(
    (maximum, event) => Math.max(maximum, Number.isInteger(event?.sequence) ? event.sequence : -1),
    -1,
  );
  const commandEventId = `${receipt.attempt_id}.runner-command`;
  const commandEvidenceId = `${receipt.attempt_id}.runner-command-evidence`;
  const workspaceEventId = `${receipt.attempt_id}.runner-workspace`;
  const workspaceEvidenceId = `${receipt.attempt_id}.runner-workspace-evidence`;
  const processSucceeded = receipt.command.termination === 'completed';
  const captureSucceeded = receipt.workspace.capture_complete;
  const sourceGuardSucceeded = receipt.source_guard.unchanged;
  input.events.push(
    {
      id: commandEventId,
      sequence: maximumSequence + 1,
      type: 'command',
      actor: 'runner',
      observed_at: receipt.command.ended_at,
      status: processSucceeded
        ? 'succeeded'
        : receipt.command.termination === 'process_error'
          ? 'failed'
          : 'blocked',
      summary: `Captured top-level process termination: ${receipt.command.termination}.`,
      details_ref: receipt.artifacts.command.ref,
      evidence_refs: [commandEvidenceId],
    },
    {
      id: workspaceEventId,
      sequence: maximumSequence + 2,
      type: 'observation',
      actor: 'runner',
      observed_at: receipt.workspace.captured_at,
      status: captureSucceeded && sourceGuardSucceeded ? 'succeeded' : 'failed',
      summary: !captureSucceeded
        ? 'Final workspace capture failed; no complete delta is claimed.'
        : sourceGuardSucceeded
          ? 'Captured the final workspace delta and artifact manifest.'
          : 'Captured the complete final workspace delta, but the post-run source guard failed; the attempt is not comparable.',
      details_ref: receipt.artifacts.summary.ref,
      evidence_refs: [workspaceEvidenceId],
    },
  );
  input.evidence.push(
    {
      id: commandEvidenceId,
      source_kind: 'tool_output',
      locator: receipt.artifacts.command.ref,
      digest: receipt.artifacts.command.digest,
      producer_ref: `runner:${RUNNER_IDENTITY.name}@${RUNNER_IDENTITY.version}`,
      event_id: commandEventId,
      objective_ref: objectiveId,
    },
    {
      id: workspaceEvidenceId,
      source_kind: 'tool_output',
      locator: receipt.artifacts.summary.ref,
      digest: receipt.artifacts.summary.digest,
      producer_ref: `runner:${RUNNER_IDENTITY.name}@${RUNNER_IDENTITY.version}`,
      event_id: workspaceEventId,
      objective_ref: objectiveId,
    },
  );

  input.final_result.artifact_refs = [
    ...new Set([
      ...(input.final_result.artifact_refs ?? []),
      ...(receipt.artifacts.diff ? [receipt.artifacts.diff.ref] : []),
      receipt.artifacts.summary.ref,
    ]),
  ];
  input.costs.push({
    metric: 'wall_time_ms',
    value: receipt.execution.duration_ms,
    unit: 'ms',
    acquisition: {
      kind: 'runner',
      source_ref: receipt.artifacts.attempt.ref,
      quality: 'observed',
    },
  });

  const report = createEffectivenessReport(
    {
      ...input,
      experiment: {
        ...input.experiment,
        arm: {
          id: input.experiment.arm.id,
          definition_digest: plannedArm.definition_digest,
        },
        reproduction: {
          ...input.experiment.reproduction,
          request_fingerprint: receipt.configuration_digest,
        },
        workspace: {
          source_ref: receipt.source.source_ref,
          base_revision: receipt.source.base_revision,
          snapshot_digest: receipt.source.snapshot_digest,
          isolation_id: receipt.workspace.isolation_id,
          ...(receipt.workspace.final_revision
            ? { final_revision: receipt.workspace.final_revision }
            : {}),
          ...(receipt.workspace.final_snapshot_digest
            ? { final_snapshot_digest: receipt.workspace.final_snapshot_digest }
            : {}),
          ...(receipt.artifacts.diff ? { diff_ref: receipt.artifacts.diff.ref } : {}),
        },
        capability_policy: cloneData(plannedArm.capability_policy, 'planned capability policy'),
      },
      execution: {
        runner: cloneData(RUNNER_IDENTITY, 'runner identity'),
        started_at: receipt.execution.started_at,
        ended_at: receipt.execution.ended_at,
        termination: receipt.execution.termination,
        ...(receipt.execution.termination === 'completed'
          ? {}
          : { termination_detail_ref: receipt.artifacts.attempt.ref }),
      },
    },
    { rootDir: contractRoot, experimentPlan },
  );
  const accepted = parseEffectivenessReport(report, { rootDir: contractRoot, experimentPlan });
  const envelopes = [];

  function envelopeInput(evidenceId, kind, result, artifactReference) {
    const evidence = accepted.evidence.find((item) => item.id === evidenceId);
    const event = accepted.events.find((item) => item.id === evidence.event_id);
    return {
      issuer_ref: evidence.producer_ref,
      source_level: evidence.source_kind,
      target: {
        report_id: accepted.report_id,
        comparison_group_id: accepted.experiment.comparison_group_id,
        arm_id: accepted.experiment.arm.id,
        repeat_index: accepted.experiment.reproduction.repeat_index,
        request_fingerprint: accepted.experiment.reproduction.request_fingerprint,
        objective_ref: accepted.experiment.objective.id,
        objective_digest: accepted.experiment.objective.digest,
        result_ref: evidence.id,
      },
      action: {
        event_id: event.id,
        type: event.type,
        actor: event.actor,
        status: event.status,
        observed_at: event.observed_at,
      },
      workspace: cloneData(accepted.experiment.workspace, 'envelope workspace'),
      issued_at: accepted.execution.ended_at,
      evidence: {
        kind,
        locator: artifactReference.ref,
        digest: artifactReference.digest,
        bytes: artifactReference.bytes,
        result,
      },
    };
  }

  if (
    /^sha256:[0-9a-f]{64}$/.test(receipt.command.stdout.observed_digest ?? '') &&
    /^sha256:[0-9a-f]{64}$/.test(receipt.command.stderr.observed_digest ?? '')
  ) {
    envelopes.push({
      artifactKey: 'command_envelope',
      evidenceId: commandEvidenceId,
      envelope: createEvidenceEnvelope(
        envelopeInput(
          commandEvidenceId,
          'command',
          {
            exit_code: receipt.command.exit_code,
            termination: receipt.command.termination,
            stdout_digest: receipt.command.stdout.observed_digest,
            stderr_digest: receipt.command.stderr.observed_digest,
          },
          receipt.artifacts.command,
        ),
        { rootDir: contractRoot },
      ),
    });
  }
  envelopes.push({
    artifactKey: 'workspace_envelope',
    evidenceId: workspaceEvidenceId,
    envelope: createEvidenceEnvelope(
      envelopeInput(
        workspaceEvidenceId,
        'artifact',
        {
          artifact_id: 'workspace-artifact-manifest',
          artifact_digest: receipt.artifacts.summary.digest,
        },
        receipt.artifacts.summary,
      ),
      { rootDir: contractRoot },
    ),
  });

  for (const item of envelopes) {
    item.ref = `${item.envelope.content_digest.slice('sha256:'.length)}.evidence-envelope.json`;
    accepted.evidence.find((evidence) => evidence.id === item.evidenceId).envelope_ref = item.ref;
  }
  return {
    report: parseEffectivenessReport(accepted, { rootDir: contractRoot, experimentPlan }),
    envelopes,
  };
}

function assertSearchPathIsIsolated(searchPath, protectedRoots) {
  if (searchPath === '') return;
  for (const component of searchPath.split(path.delimiter)) {
    if (component.length === 0 || !path.isAbsolute(component)) {
      fail('unisolated_search_path', 'command PATH must contain only absolute non-empty entries');
    }
    const lexical = path.resolve(component);
    const physical = resolvePhysicalCandidate(lexical);
    if (
      protectedRoots.some((root) =>
        pathIsWithin(root, lexical) || pathIsWithin(root, physical))
    ) {
      fail('protected_path_exposure', 'command PATH exposes a protected repository path');
    }
  }
}

function freezeCommandPlan(command, sourceDir, protectedRoots) {
  const inheritedEnvironment = inheritedEnvironmentSnapshot();
  const effectiveSearchEnvironment = { ...inheritedEnvironment, ...command.env };
  const request = command.file;
  const searchPath = effectiveSearchEnvironment.PATH ?? '';
  assertSearchPathIsIsolated(searchPath, protectedRoots);
  let candidate = null;
  let scope = 'external';
  let workspaceRelative = null;
  if (path.isAbsolute(request)) {
    candidate = path.resolve(request);
    if (protectedRoots.some((root) => pathIsWithin(root, candidate))) {
      fail(
        'protected_path_exposure',
        'absolute command.file cannot execute from the source repository; use a repo-relative path',
      );
    }
  } else if (request.includes('/') || request.includes('\\')) {
    candidate = path.resolve(sourceDir, request);
    if (!pathIsWithin(sourceDir, candidate)) {
      fail('protected_path_exposure', 'repo-relative command.file cannot escape the source repository');
    }
    scope = 'workspace';
    workspaceRelative = path.relative(sourceDir, candidate);
  } else {
    candidate = searchPath
      .split(path.delimiter)
      .filter(Boolean)
      .map((directory) => path.join(directory, request))
      .find((filePath) => fs.existsSync(filePath)) ?? null;
    if (
      candidate &&
      protectedRoots.some((root) => pathIsWithin(root, path.resolve(candidate)))
    ) {
      fail(
        'protected_path_exposure',
        'PATH cannot resolve command.file from the source repository',
      );
    }
  }
  if (!candidate || !fs.existsSync(candidate)) {
    return {
      spawnFile: request,
      scope,
      workspaceRelative,
      inheritedEnvironment,
      identity: {
        name: path.basename(request),
        availability: 'missing',
        scope,
        request_digest: sha256Buffer(request),
      },
    };
  }
  const realPath = fs.realpathSync(candidate);
  if (
    scope === 'external' &&
    protectedRoots.some((root) => pathIsWithin(root, realPath))
  ) {
    fail('protected_path_exposure', 'command.file resolves into a protected repository path');
  }
  const stat = fs.statSync(realPath);
  if (!stat.isFile()) {
    return {
      spawnFile: request,
      scope,
      workspaceRelative,
      inheritedEnvironment,
      identity: {
        name: path.basename(request),
        availability: 'not_regular',
        scope,
        request_digest: sha256Buffer(request),
      },
    };
  }
  return {
    spawnFile: scope === 'workspace' ? request : realPath,
    scope,
    workspaceRelative,
    inheritedEnvironment,
    identity: {
      name: path.basename(realPath),
      availability: 'available',
      scope,
      bytes: stat.size,
      digest: hashFile(realPath),
    },
  };
}

function commandFileForWorkspace(commandPlan, workspaceDir) {
  return commandPlan.scope === 'workspace'
    ? path.join(workspaceDir, commandPlan.workspaceRelative)
    : commandPlan.spawnFile;
}

function redactedCommandConfiguration(command, commandPlan) {
  const redact = (value) => redactSensitiveStrings(command, [value])[0];
  const effectiveEnvironment = Object.fromEntries(
    Object.entries({ ...commandPlan.inheritedEnvironment, ...command.env })
      .map(([name, value]) => [name, redact(value)]),
  );
  return {
    argv: redactSensitiveStrings(command, command.args),
    effective_environment: effectiveEnvironment,
    sensitive_policy: {
      inferred_environment_keys: Object.keys(command.env)
        .filter((name) => /(?:AUTH|CREDENTIAL|KEY|PASSWORD|SECRET|TOKEN)/i.test(name))
        .sort(compareText),
      caller_declared_values: command.sensitiveValues.length,
    },
  };
}

function createConfigurationDigest(spec, sourceGuard, commandPlan) {
  const commandConfiguration = redactedCommandConfiguration(spec.command, commandPlan);
  const plannedArm = spec.experimentPlan.arms[spec.armId];
  return sha256Json({
    command: {
      executable: commandPlan.identity,
      definition_digest: spec.command.definitionDigest,
      argv_digest: sha256Json(commandConfiguration.argv),
      effective_environment_digest: sha256Json({
        values: commandConfiguration.effective_environment,
        isolated_paths: ['CODEX_HOME', 'HOME', 'TEMP', 'TMP', 'TMPDIR', 'XDG_CACHE_HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME'],
        fixed_policy: GIT_ISOLATION_POLICY,
      }),
      sensitive_policy: commandConfiguration.sensitive_policy,
      label: spec.command.label ?? null,
    },
    limits: spec.limits,
    experiment_arm: {
      id: spec.armId,
      definition_digest: plannedArm.definition_digest,
      capability_policy_digest: sha256Json(plannedArm.capability_policy),
    },
    source: {
      ref: spec.source.ref,
      revision: sourceGuard.head,
      tree: sourceGuard.tree,
    },
  });
}

function writeReceipt(evidenceDir, receipt) {
  atomicWriteJson(path.join(evidenceDir, 'receipt.json'), receipt);
}

function writeAttemptAndReceipt(evidenceDir, receipt) {
  const attemptPath = path.join(evidenceDir, 'attempt.json');
  atomicWriteJson(attemptPath, {
    schema_version: 1,
    attempt_id: receipt.attempt_id,
    experiment_arm: receipt.experiment_arm,
    execution: receipt.execution,
    workspace: receipt.workspace,
    source_guard: receipt.source_guard,
    cleanup: receipt.cleanup,
  });
  receipt.artifacts.attempt = fileReference(attemptPath);
  writeReceipt(evidenceDir, receipt);
}

function verifyRetainedRunnerEvidence(evidenceDir, receipt) {
  const canonicalEvidenceDir = fs.realpathSync(evidenceDir);
  const expectedEntries = new Set(['receipt.json']);
  for (const [name, reference] of Object.entries(receipt.artifacts)) {
    if (reference === null) continue;
    if (!isPlainObject(reference) || typeof reference.ref !== 'string') {
      throw new Error(`runner artifact ${name} has no reference`);
    }
    if (path.basename(reference.ref) !== reference.ref) {
      throw new Error(`runner artifact ${name} escaped the evidence directory`);
    }
    expectedEntries.add(reference.ref);
    const artifactPath = path.join(evidenceDir, reference.ref);
    const stat = fs.lstatSync(artifactPath);
    if (!stat.isFile()) throw new Error(`runner artifact ${name} is not a regular file`);
    if (!pathIsWithin(canonicalEvidenceDir, fs.realpathSync(artifactPath))) {
      throw new Error(`runner artifact ${name} escaped the evidence directory`);
    }
    if (stat.size !== reference.bytes || hashFile(artifactPath) !== reference.digest) {
      throw new Error(`runner artifact ${name} failed retained-integrity verification`);
    }
  }
  const receiptPath = path.join(evidenceDir, 'receipt.json');
  if (!fs.lstatSync(receiptPath).isFile()) {
    throw new Error('retained receipt is not a regular file');
  }
  const onDiskReceipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  if (sha256Json(onDiskReceipt) !== sha256Json(receipt)) {
    throw new Error('retained receipt failed integrity verification');
  }
  const unexpectedEntries = fs.readdirSync(evidenceDir)
    .filter((name) => !expectedEntries.has(name));
  if (unexpectedEntries.length > 0) {
    for (const name of unexpectedEntries) {
      fs.rmSync(path.join(evidenceDir, name), { recursive: true, force: true });
    }
    throw new Error(`unexpected retained evidence entries: ${unexpectedEntries.join(', ')}`);
  }
}

function reportFailure(error, receipt) {
  return new EffectivenessRunnerError(
    'report_rejected',
    `effectiveness report rejected: ${error.message}`,
    { stage: 'report', receipt, cause: error },
  );
}

export async function runIsolatedEffectivenessAttempt(rawSpec) {
  const { spec, buildReportInput, signal } = validateSpec(rawSpec);
  const contractRoot = fs.realpathSync(path.resolve(spec.contractRoot));
  const sourceDir = fs.realpathSync(path.resolve(spec.source.dir));
  const evidenceRootLexical = path.resolve(spec.evidenceRoot);
  const projectedEvidenceRoot = resolvePhysicalCandidate(evidenceRootLexical);
  assertSeparateEvidenceRoot(sourceDir, projectedEvidenceRoot);
  const sourceBefore = assertSourceRepository(
    sourceDir,
    spec.source.revision,
    spec.limits,
    spec.command,
  );
  const protectedRoots = [
    sourceDir,
    path.resolve(spec.source.dir),
    projectedEvidenceRoot,
    evidenceRootLexical,
  ];
  assertCommandDoesNotExposeProtectedRoots(spec.command, protectedRoots);
  assertPersistentMetadataHasNoSensitiveMaterial(spec);
  const commandPlan = freezeCommandPlan(spec.command, sourceDir, protectedRoots);
  assertCommandDoesNotExposeProtectedRoots(
    { args: [], env: commandPlan.inheritedEnvironment },
    protectedRoots,
  );
  const configurationDigest = createConfigurationDigest(spec, sourceBefore, commandPlan);

  fs.mkdirSync(evidenceRootLexical, { recursive: true, mode: 0o700 });
  const evidenceRoot = fs.realpathSync(evidenceRootLexical);
  assertSeparateEvidenceRoot(sourceDir, evidenceRoot);
  const evidenceDir = path.join(evidenceRoot, spec.attemptId);
  try {
    fs.mkdirSync(evidenceDir, { mode: 0o700 });
  } catch (error) {
    if (error.code === 'EEXIST') {
      fail('evidence_collision', `evidence already exists for ${spec.attemptId}`);
    }
    fail('evidence_unavailable', `cannot create evidence directory: ${error.message}`, {
      cause: error,
    });
  }
  if (!pathIsWithin(evidenceRoot, fs.realpathSync(evidenceDir))) {
    fs.rmSync(evidenceDir, { recursive: true, force: true });
    fail('evidence_escape', 'attempt evidence directory escaped the evidence root');
  }

  const attemptStartedAt = new Date().toISOString();
  const attemptStartedMonotonic = performance.now();
  const capsuleDir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'forge-effectiveness-attempt-')),
  );
  fs.chmodSync(capsuleDir, 0o700);
  const workspaceDir = path.join(capsuleDir, 'workspace');
  const runtimeDir = path.join(capsuleDir, 'runtime');
  const captureGitDir = path.join(runtimeDir, 'capture.git');
  fs.mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
  const paths = { workspaceDir, runtimeDir };
  let initialManifest;
  let commandResult;
  let delta;
  let receipt;
  let launched = false;
  try {
    cloneRepository(sourceDir, sourceBefore.head, workspaceDir, captureGitDir, spec.limits);
    initialManifest = captureWorkspaceManifest(workspaceDir, spec.limits);
    if (workspaceContainsSensitiveMaterial(workspaceDir, initialManifest, spec.command)) {
      fail(
        'credential_material_detected',
        'initial workspace contains configured credential material',
        { stage: 'isolation' },
      );
    }
    launched = true;
    commandResult = await executeCommand({
      command: {
        ...spec.command,
        file: commandFileForWorkspace(commandPlan, workspaceDir),
      },
      environment: isolatedEnvironment(
        runtimeDir,
        spec.command.env,
        commandPlan.inheritedEnvironment,
      ),
      workspaceDir,
      captureDir: path.join(runtimeDir, 'process-output'),
      limits: spec.limits,
      signal,
    });
    promoteProcessOutput(
      spec.command,
      commandResult,
      path.join(runtimeDir, 'process-output'),
      evidenceDir,
    );
    try {
      delta = {
        ...captureDelta(
          workspaceDir,
          captureGitDir,
          sourceBefore.head,
          initialManifest,
          evidenceDir,
          spec.limits,
          spec.command,
        ),
        captureComplete: true,
      };
    } catch (error) {
      commandResult.termination = 'infrastructure_error';
      commandResult.detail = error instanceof EffectivenessRunnerError
        ? error.code
        : 'capture_failed';
      const summaryPath = path.join(evidenceDir, 'artifacts.json');
      atomicWriteJson(summaryPath, {
        schema_version: 1,
        capture_status: 'failed',
        initial_snapshot_digest: initialManifest.digest,
        error: {
          code: commandResult.detail,
          message: 'final workspace capture failed; no final snapshot or diff is claimed',
        },
        initial: {
          file_count: initialManifest.file_count,
          total_bytes: initialManifest.total_bytes,
        },
        changes: [],
        artifacts: [],
      });
      delta = {
        captureComplete: false,
        finalManifest: null,
        finalTree: null,
        changes: [],
        diff: null,
        summary: fileReference(summaryPath),
      };
    }
    delta.capturedAt = new Date(
      Date.parse(attemptStartedAt) + Math.max(0, performance.now() - attemptStartedMonotonic),
    ).toISOString();

    const commandDocument = commandReceipt(spec, commandResult);
    const commandPath = path.join(evidenceDir, 'command.json');
    atomicWriteJson(commandPath, commandDocument);
    const eventsPath = path.join(evidenceDir, 'events.jsonl');
    atomicWrite(
      eventsPath,
      `${lifecycleEvents(spec.attemptId, attemptStartedAt, commandResult, delta)
        .map((event) => JSON.stringify(event))
        .join('\n')}\n`,
    );

    let sourceAfter = null;
    let sourceGuardError = null;
    try {
      sourceAfter = captureSourceGuard(sourceDir, spec.limits, spec.command);
    } catch (error) {
      sourceGuardError = {
        code: error instanceof EffectivenessRunnerError ? error.code : 'source_guard_failed',
        message: 'post-run source guard could not be captured',
      };
    }
    const sourceUnchanged = sourceAfter !== null && sourceBefore.digest === sourceAfter.digest;
    if (!sourceUnchanged) {
      commandResult.termination = 'infrastructure_error';
      commandResult.detail = sourceAfter === null
        ? 'source_guard_failed'
        : 'source_repository_changed';
    }
    receipt = {
      schema_version: RECEIPT_VERSION,
      contract: RECEIPT_CONTRACT,
      attempt_id: spec.attemptId,
      configuration_digest: configurationDigest,
      experiment_arm: {
        id: spec.armId,
        definition_digest: spec.experimentPlan.arms[spec.armId].definition_digest,
        capability_policy_digest: sha256Json(
          spec.experimentPlan.arms[spec.armId].capability_policy,
        ),
      },
      source: {
        source_ref: spec.source.ref,
        base_revision: sourceBefore.head,
        tree: `git-tree:${sourceBefore.tree}`,
        snapshot_digest: initialManifest.digest,
      },
      workspace: {
        isolation_id: `isolation-${crypto.randomUUID()}`,
        captured_at: delta.capturedAt,
        final_revision: delta.finalTree,
        final_snapshot_digest: delta.finalManifest?.digest ?? null,
        changed_artifacts: delta.changes.length,
        capture_complete: delta.captureComplete,
      },
      execution: {
        runner: cloneData(RUNNER_IDENTITY, 'runner identity'),
        started_at: commandResult.startedAt,
        ended_at: commandResult.endedAt,
        duration_ms: commandResult.durationMs,
        termination: commandResult.termination,
        detail: commandResult.detail,
        limits: cloneData(spec.limits, 'limits'),
      },
      command: commandDocument,
      source_guard: {
        before: sourceBefore.digest,
        after: sourceAfter?.digest ?? null,
        unchanged: sourceUnchanged,
        ...(sourceGuardError ? { error: sourceGuardError } : {}),
      },
      cleanup: {
        capsule_removed: false,
      },
      artifacts: {
        events: fileReference(eventsPath),
        command: fileReference(commandPath),
        stdout: commandResult.stdout.retention === 'retained'
          ? fileReference(path.join(evidenceDir, 'stdout.log'))
          : null,
        stderr: commandResult.stderr.retention === 'retained'
          ? fileReference(path.join(evidenceDir, 'stderr.log'))
          : null,
        diff: delta.diff,
        summary: delta.summary,
      },
    };
  } catch (error) {
    if (!launched) {
      fs.rmSync(capsuleDir, { recursive: true, force: true });
      fs.rmSync(evidenceDir, { recursive: true, force: true });
      if (error instanceof EffectivenessRunnerError) throw error;
      fail('isolation_failed', `attempt isolation failed: ${error.message}`, {
        stage: 'isolation',
        cause: error,
      });
    }
    fs.rmSync(capsuleDir, { recursive: true, force: true });
    if (error instanceof EffectivenessRunnerError) throw error;
    fail('capture_failed', `attempt capture failed: ${error.message}`, {
      stage: 'capture',
      cause: error,
    });
  }

  try {
    fs.rmSync(capsuleDir, { recursive: true, force: true });
  } catch (error) {
    receipt.execution.termination = 'infrastructure_error';
    receipt.execution.detail = 'cleanup_failed';
    receipt.cleanup.error = String(error.message);
  }
  receipt.cleanup.capsule_removed = !fs.existsSync(capsuleDir);
  if (!receipt.cleanup.capsule_removed) {
    receipt.cleanup.capsule_path = capsuleDir;
    receipt.execution.termination = 'infrastructure_error';
    receipt.execution.detail = 'cleanup_failed';
  }
  const attemptDurationMs = Math.max(
    0,
    Math.round((performance.now() - attemptStartedMonotonic) * 1000) / 1000,
  );
  receipt.execution.started_at = attemptStartedAt;
  receipt.execution.ended_at = new Date(
    Date.parse(attemptStartedAt) + attemptDurationMs,
  ).toISOString();
  receipt.execution.duration_ms = attemptDurationMs;
  writeAttemptAndReceipt(evidenceDir, receipt);

  let report;
  try {
    let reportInput;
    let adapterError = null;
    try {
      reportInput = await buildReportInput(
        cloneData(receipt, 'receipt'),
        {
          artifacts: cloneData(receipt.artifacts, 'artifact references'),
        },
      );
      if (valueContainsSensitiveMaterial(spec.command, reportInput)) {
        throw new Error('report input contains credential material');
      }
    } catch (error) {
      adapterError = error;
    }

    let retainedEvidenceError = null;
    try {
      verifyRetainedRunnerEvidence(evidenceDir, receipt);
    } catch (error) {
      retainedEvidenceError = error;
    }

    let sourceAdapterFailure = null;
    if (receipt.source_guard.unchanged) {
      let sourceAfterAdapter = null;
      try {
        sourceAfterAdapter = captureSourceGuard(
          sourceDir,
          spec.limits,
          spec.command,
        );
      } catch (error) {
        sourceAdapterFailure = {
          code: 'source_guard_failed_after_report_adaptation',
          message: 'source guard could not be captured after report adaptation',
          cause: error,
        };
      }
      if (
        sourceAdapterFailure === null &&
        sourceAfterAdapter.digest !== sourceBefore.digest
      ) {
        sourceAdapterFailure = {
          code: 'source_repository_changed_during_report_adaptation',
          message: 'source repository changed during report adaptation',
        };
      }
      if (sourceAdapterFailure !== null) {
        receipt.source_guard.after = sourceAfterAdapter?.digest ?? null;
        receipt.source_guard.unchanged = false;
        receipt.source_guard.error = {
          code: sourceAdapterFailure.code,
          message: sourceAdapterFailure.message,
        };
        receipt.execution.termination = 'infrastructure_error';
        receipt.execution.detail = sourceAdapterFailure.code;
        const finalDurationMs = Math.max(
          0,
          Math.round((performance.now() - attemptStartedMonotonic) * 1000) / 1000,
        );
        receipt.execution.ended_at = new Date(
          Date.parse(attemptStartedAt) + finalDurationMs,
        ).toISOString();
        receipt.execution.duration_ms = finalDurationMs;
        writeAttemptAndReceipt(evidenceDir, receipt);
      }
    }

    if (adapterError !== null) throw adapterError;
    if (retainedEvidenceError !== null) throw retainedEvidenceError;
    if (sourceAdapterFailure !== null) {
      verifyRetainedRunnerEvidence(evidenceDir, receipt);
      if (isPlainObject(reportInput)) {
        reportInput.final_result = {
          submission_status: 'no_output',
          artifact_refs: [],
          verifier_result_refs: [],
        };
      }
    }
    const runnerReport = createRunnerReport(
      receipt,
      reportInput,
      spec.experimentPlan,
      contractRoot,
    );
    report = runnerReport.report;
    for (const item of runnerReport.envelopes) {
      const envelopePath = path.join(evidenceDir, item.ref);
      atomicWriteJson(envelopePath, item.envelope);
      receipt.artifacts[item.artifactKey] = fileReference(envelopePath);
    }
    writeReceipt(evidenceDir, receipt);
    for (const item of runnerReport.envelopes) {
      verifyEvidenceEnvelope(receipt.artifacts[item.artifactKey], {
        rootDir: contractRoot,
        evidenceRoot: evidenceDir,
        report,
        evidenceId: item.evidenceId,
      });
    }
    verifyRetainedRunnerEvidence(evidenceDir, receipt);
    atomicWriteJson(path.join(evidenceDir, 'report.json'), report);
  } catch (error) {
    fs.rmSync(path.join(evidenceDir, 'report.json'), { force: true });
    throw reportFailure(error, receipt);
  }

  return {
    receipt,
    report,
    evidenceDir,
    paths,
  };
}
