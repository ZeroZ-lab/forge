import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const CONTRACT = 'forge-effectiveness-verifier-result';
const SCHEMA_VERSION = 1;
const COMMAND_PURPOSES = new Set(['test', 'build', 'typecheck', 'hidden_assertion']);
const registeredAdapters = new WeakSet();

export class EffectivenessVerifierError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'EffectivenessVerifierError';
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new EffectivenessVerifierError(code, message, options);
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
    fail('invalid_verifier', `${label} must contain only cloneable JSON data`, { cause: error });
  }
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail('invalid_verifier', `${label} fields must be exactly: ${wanted.join(', ')}`);
  }
}

function assertId(value, label) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) {
    fail('invalid_verifier', `${label} must be a safe lowercase identifier`);
  }
}

function assertDigest(value, label) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(value)) {
    fail('invalid_verifier', `${label} must be a lowercase sha256 digest`);
  }
}

function assertScope(scope) {
  if (
    !isPlainObject(scope) ||
    typeof scope.kind !== 'string' ||
    scope.kind.length === 0 ||
    !Array.isArray(scope.paths) ||
    scope.paths.some((item) => typeof item !== 'string' || item.length === 0)
  ) {
    fail('invalid_verifier', 'scope must contain kind and string paths');
  }
}

function hashBuffer(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function atomicWrite(filePath, content) {
  const temporary = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
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

function retain(evidenceDir, ref, content) {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
  atomicWrite(path.join(evidenceDir, ref), bytes);
  return { ref, digest: hashBuffer(bytes), bytes: bytes.length };
}

function registerAdapter(adapter) {
  if (adapter.command) Object.freeze(adapter.command);
  Object.freeze(adapter.scope.paths);
  Object.freeze(adapter.scope);
  Object.freeze(adapter);
  registeredAdapters.add(adapter);
  return adapter;
}

function createCallbackVerifierAdapter(input, kind, purpose) {
  if (!isPlainObject(input)) fail('invalid_verifier', `${kind} verifier must be an object`);
  assertExactKeys(
    input,
    ['id', 'definitionDigest', 'scope', 'verify'],
    `${kind} verifier`,
  );
  assertId(input.id, 'verifier id');
  assertDigest(input.definitionDigest, 'definitionDigest');
  assertScope(input.scope);
  if (typeof input.verify !== 'function') {
    fail('invalid_verifier', `${kind} verifier verify must be a function`);
  }
  return registerAdapter({
    kind,
    id: input.id,
    purpose,
    definitionDigest: input.definitionDigest,
    scope: cloneData(input.scope, 'scope'),
    verify: input.verify,
  });
}

export function createHiddenAssertionVerifierAdapter(input) {
  return createCallbackVerifierAdapter(input, 'hidden_assertion', 'hidden_assertion');
}

export function createDiffVerifierAdapter(input) {
  return createCallbackVerifierAdapter(input, 'diff', 'diff');
}

export function createCommandVerifierAdapter(input) {
  if (!isPlainObject(input)) fail('invalid_verifier', 'command verifier must be an object');
  assertExactKeys(
    input,
    ['id', 'purpose', 'definitionDigest', 'scope', 'command'],
    'command verifier',
  );
  assertId(input.id, 'verifier id');
  if (!COMMAND_PURPOSES.has(input.purpose)) {
    fail('invalid_verifier', 'command verifier purpose is unsupported');
  }
  assertDigest(input.definitionDigest, 'definitionDigest');
  assertScope(input.scope);
  if (
    !isPlainObject(input.command) ||
    typeof input.command.file !== 'string' ||
    input.command.file.length === 0 ||
    !Array.isArray(input.command.args) ||
    input.command.args.some((item) => typeof item !== 'string') ||
    !isPlainObject(input.command.env) ||
    Object.entries(input.command.env).some(([name, value]) =>
      !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || typeof value !== 'string')
  ) {
    fail('invalid_verifier', 'command verifier command is invalid');
  }
  assertExactKeys(input.command, ['file', 'args', 'env'], 'command');
  return registerAdapter({
    kind: 'command',
    id: input.id,
    purpose: input.purpose,
    definitionDigest: input.definitionDigest,
    scope: cloneData(input.scope, 'scope'),
    command: cloneData(input.command, 'command'),
  });
}

function assertRunSpec(spec) {
  if (!isPlainObject(spec)) fail('invalid_run', 'verifier run spec must be an object');
  if (
    typeof spec.workspaceDir !== 'string' ||
    typeof spec.evidenceDir !== 'string' ||
    !fs.statSync(spec.workspaceDir).isDirectory() ||
    !fs.statSync(spec.evidenceDir).isDirectory()
  ) {
    fail('invalid_run', 'workspaceDir and evidenceDir must be existing directories');
  }
  if (!isPlainObject(spec.verifierSet)) fail('invalid_run', 'verifierSet is required');
  assertId(spec.verifierSet.id, 'verifierSet.id');
  assertDigest(spec.verifierSet.digest, 'verifierSet.digest');
  if (!isPlainObject(spec.target) || !isPlainObject(spec.target.workspace)) {
    fail('invalid_run', 'target and target.workspace are required');
  }
  assertId(spec.target.attempt_id, 'target.attempt_id');
  if (typeof spec.target.objective_ref !== 'string' || spec.target.objective_ref.length === 0) {
    fail('invalid_run', 'target.objective_ref is required');
  }
  assertDigest(spec.target.objective_digest, 'target.objective_digest');
  if (
    typeof spec.target.workspace.isolation_id !== 'string' ||
    spec.target.workspace.isolation_id.length === 0
  ) {
    fail('invalid_run', 'target.workspace.isolation_id is required');
  }
  assertDigest(spec.target.workspace.snapshot_digest, 'target.workspace.snapshot_digest');
  if (!Array.isArray(spec.adapters) || spec.adapters.length === 0) {
    fail('invalid_run', 'at least one registered verifier adapter is required');
  }
  const ids = new Set();
  for (const adapter of spec.adapters) {
    if (!registeredAdapters.has(adapter)) {
      fail('untrusted_verifier', 'verifier adapters must be created by a trusted factory');
    }
    if (ids.has(adapter.id)) fail('invalid_run', `duplicate verifier id: ${adapter.id}`);
    ids.add(adapter.id);
  }
  if (
    !isPlainObject(spec.limits) ||
    !Number.isSafeInteger(spec.limits.timeoutMs) ||
    spec.limits.timeoutMs <= 0 ||
    !Number.isSafeInteger(spec.limits.maxOutputBytes) ||
    spec.limits.maxOutputBytes <= 0
  ) {
    fail('invalid_run', 'limits must contain positive timeoutMs and maxOutputBytes');
  }
}

function runCommand(adapter, spec) {
  const startedAt = new Date().toISOString();
  const startedMonotonic = performance.now();
  const execution = spawnSync(adapter.command.file, adapter.command.args, {
    cwd: spec.workspaceDir,
    env: { ...process.env, ...adapter.command.env },
    encoding: null,
    timeout: spec.limits.timeoutMs,
    maxBuffer: spec.limits.maxOutputBytes,
    windowsHide: true,
  });
  const stdout = Buffer.isBuffer(execution.stdout) ? execution.stdout : Buffer.alloc(0);
  const stderr = Buffer.isBuffer(execution.stderr) ? execution.stderr : Buffer.alloc(0);
  const stdoutRef = retain(spec.evidenceDir, `${adapter.id}.stdout.log`, stdout);
  const stderrRef = retain(spec.evidenceDir, `${adapter.id}.stderr.log`, stderr);
  let outcome;
  let reasonCode;
  if (execution.error?.code === 'ENOENT') {
    outcome = 'unavailable';
    reasonCode = 'command_not_found';
  } else if (execution.error) {
    outcome = 'infrastructure_error';
    reasonCode = execution.error.code === 'ETIMEDOUT'
      ? 'verifier_timeout'
      : execution.error.code === 'ENOBUFS'
        ? 'verifier_output_limit'
        : 'verifier_execution_failed';
  } else if (execution.status === 0 && execution.signal === null) {
    outcome = 'passed';
    reasonCode = 'command_passed';
  } else {
    outcome = 'task_failed';
    reasonCode = 'command_failed';
  }
  const durationMs = Math.max(
    0,
    Math.round((performance.now() - startedMonotonic) * 1000) / 1000,
  );
  return {
    startedAt,
    endedAt: new Date(Date.parse(startedAt) + durationMs).toISOString(),
    outcome,
    reasonCode,
    execution: {
      exit_code: Number.isInteger(execution.status) ? execution.status : null,
      signal: execution.signal ?? null,
      duration_ms: durationMs,
    },
    evidenceRefs: [
      { role: 'stdout', ...stdoutRef },
      { role: 'stderr', ...stderrRef },
    ],
  };
}

async function runCallback(adapter, spec) {
  const startedAt = new Date().toISOString();
  const startedMonotonic = performance.now();
  let response;
  let failed = false;
  try {
    response = await adapter.verify(Object.freeze({
      workspaceDir: fs.realpathSync(spec.workspaceDir),
      target: cloneData(spec.target, 'target'),
      scope: cloneData(adapter.scope, 'scope'),
    }));
    if (!isPlainObject(response) || typeof response.passed !== 'boolean') failed = true;
  } catch {
    failed = true;
  }
  const durationMs = Math.max(
    0,
    Math.round((performance.now() - startedMonotonic) * 1000) / 1000,
  );
  const passed = !failed && response.passed;
  return {
    startedAt,
    endedAt: new Date(Date.parse(startedAt) + durationMs).toISOString(),
    outcome: failed ? 'infrastructure_error' : passed ? 'passed' : 'task_failed',
    reasonCode: failed
      ? 'verifier_execution_failed'
      : adapter.kind === 'diff'
        ? passed ? 'diff_passed' : 'diff_failed'
        : passed ? 'assertion_passed' : 'assertion_failed',
    execution: {
      exit_code: null,
      signal: null,
      duration_ms: durationMs,
    },
    evidenceRefs: [],
  };
}

export async function runEffectivenessVerifierSet(spec) {
  assertRunSpec(spec);
  const target = cloneData(spec.target, 'target');
  const verifierSet = cloneData(spec.verifierSet, 'verifierSet');
  const results = [];
  for (const adapter of spec.adapters) {
    const observed = adapter.kind === 'command'
      ? runCommand(adapter, spec)
      : await runCallback(adapter, spec);
    const result = {
      schema_version: SCHEMA_VERSION,
      contract: CONTRACT,
      result_id: `${spec.target.attempt_id}.${adapter.id}`,
      verifier_set: verifierSet,
      verifier: {
        id: adapter.id,
        kind: adapter.kind,
        purpose: adapter.purpose,
        definition_digest: adapter.definitionDigest,
        scope: cloneData(adapter.scope, 'scope'),
      },
      target,
      scope: cloneData(adapter.scope, 'scope'),
      independence_level: 'independent_verifier',
      outcome: observed.outcome,
      reason_code: observed.reasonCode,
      started_at: observed.startedAt,
      ended_at: observed.endedAt,
      execution: observed.execution,
      evidence_refs: observed.evidenceRefs,
    };
    const content = Buffer.from(JSON.stringify(result));
    const reference = retain(
      spec.evidenceDir,
      `${adapter.id}.verifier-result.json`,
      content,
    );
    results.push({ result, reference });
  }
  return {
    contract: 'forge-effectiveness-verifier-run',
    schema_version: 1,
    verifier_set: cloneData(spec.verifierSet, 'verifierSet'),
    target: cloneData(spec.target, 'target'),
    results,
  };
}
