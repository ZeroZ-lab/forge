import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const RESULT_CONTRACT = 'forge-effectiveness-verifier-result';
const OBSERVATION_CONTRACT = 'forge-effectiveness-verifier-observation';
const RUN_CONTRACT = 'forge-effectiveness-verifier-run';
const SCHEMA_VERSION = 1;
const COMMAND_PURPOSES = new Set(['test', 'build', 'typecheck']);
const HOST_GUARANTEES = ['output-bound', 'timeout', 'workspace-isolation'];
const registeredAdapters = new WeakSet();
const registeredRuntimes = new WeakSet();

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

function assertJsonData(value, label, ancestors = new Set()) {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return;
  }
  if (!Array.isArray(value) && !isPlainObject(value)) {
    fail('invalid_verifier', `${label} must contain only JSON data`);
  }
  if (ancestors.has(value)) {
    fail('invalid_verifier', `${label} must not contain cycles`);
  }
  ancestors.add(value);
  for (const item of Array.isArray(value) ? value : Object.values(value)) {
    assertJsonData(item, label, ancestors);
  }
  ancestors.delete(value);
}

function cloneData(value, label) {
  let cloned;
  try {
    cloned = structuredClone(value);
  } catch (error) {
    fail('invalid_verifier', `${label} must contain only cloneable JSON data`, { cause: error });
  }
  assertJsonData(cloned, label);
  return cloned;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(compareText)
      .map((key) => [key, canonicalValue(value[key])]),
  );
}

function digestBuffer(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function digestJson(value) {
  return digestBuffer(JSON.stringify(canonicalValue(value)));
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort(compareText);
  const wanted = [...expected].sort(compareText);
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail('invalid_verifier', `${label} fields must be exactly: ${wanted.join(', ')}`);
  }
}

function assertId(value, label) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) {
    fail('invalid_verifier', `${label} must be a safe lowercase identifier`);
  }
}

function assertAttemptId(value) {
  if (
    typeof value !== 'string' ||
    value === '.' ||
    value === '..' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
  ) {
    fail('invalid_run', 'target.attempt_id is unsafe');
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

function deepFreeze(value) {
  if (Array.isArray(value)) {
    value.forEach(deepFreeze);
    return Object.freeze(value);
  }
  if (isPlainObject(value)) {
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }
  return value;
}

function freezeAdapter(definition) {
  const adapter = cloneData(definition, 'adapter definition');
  deepFreeze(adapter);
  registeredAdapters.add(adapter);
  return adapter;
}

export function createCommandVerifierAdapter(input) {
  if (!isPlainObject(input)) fail('invalid_verifier', 'command verifier must be an object');
  assertExactKeys(input, ['id', 'purpose', 'scope', 'command'], 'command verifier');
  assertId(input.id, 'verifier id');
  if (!COMMAND_PURPOSES.has(input.purpose)) {
    fail('invalid_verifier', 'command verifier purpose is unsupported');
  }
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
  const definition = {
    id: input.id,
    kind: 'command',
    purpose: input.purpose,
    scope: cloneData(input.scope, 'scope'),
    command: cloneData(input.command, 'command'),
  };
  definition.definition_digest = digestJson(definition);
  return freezeAdapter(definition);
}

export function createHiddenAssertionVerifierAdapter(input) {
  if (!isPlainObject(input)) fail('invalid_verifier', 'hidden assertion verifier must be an object');
  assertExactKeys(
    input,
    ['id', 'scope', 'oracleRef', 'oracleDigest'],
    'hidden assertion verifier',
  );
  assertId(input.id, 'verifier id');
  assertScope(input.scope);
  if (typeof input.oracleRef !== 'string' || input.oracleRef.length === 0) {
    fail('invalid_verifier', 'oracleRef must be a non-empty host-private reference');
  }
  assertDigest(input.oracleDigest, 'oracleDigest');
  const definition = {
    id: input.id,
    kind: 'hidden_assertion',
    purpose: 'hidden_assertion',
    scope: cloneData(input.scope, 'scope'),
    oracle_ref: input.oracleRef,
    oracle_digest: input.oracleDigest,
  };
  definition.definition_digest = digestJson(definition);
  return freezeAdapter(definition);
}

export function createDiffVerifierAdapter(input) {
  if (!isPlainObject(input)) fail('invalid_verifier', 'diff verifier must be an object');
  assertExactKeys(input, ['id', 'scope', 'policy'], 'diff verifier');
  assertId(input.id, 'verifier id');
  assertScope(input.scope);
  if (!isPlainObject(input.policy)) fail('invalid_verifier', 'diff policy must be an object');
  const definition = {
    id: input.id,
    kind: 'diff',
    purpose: 'diff',
    scope: cloneData(input.scope, 'scope'),
    policy: cloneData(input.policy, 'diff policy'),
  };
  definition.definition_digest = digestJson(definition);
  return freezeAdapter(definition);
}

function publicExecutor(executor) {
  return {
    id: executor.id,
    version: executor.version,
    definition_digest: digestJson(executor.definition),
  };
}

export function createEffectivenessVerifierRuntime(input) {
  if (!isPlainObject(input)) fail('invalid_runtime', 'verifier runtime must be an object');
  assertExactKeys(input, ['id', 'executor', 'adapters'], 'verifier runtime');
  assertId(input.id, 'verifier runtime id');
  if (!isPlainObject(input.executor)) fail('invalid_runtime', 'executor must be an object');
  assertExactKeys(input.executor, ['id', 'version', 'definition', 'execute'], 'executor');
  assertId(input.executor.id, 'executor id');
  if (typeof input.executor.version !== 'string' || input.executor.version.length === 0) {
    fail('invalid_runtime', 'executor version is required');
  }
  if (!isPlainObject(input.executor.definition) || typeof input.executor.execute !== 'function') {
    fail('invalid_runtime', 'executor definition and execute are required');
  }
  const definition = cloneData(input.executor.definition, 'executor definition');
  const guarantees = new Set(definition.guarantees ?? []);
  const missingGuarantee = HOST_GUARANTEES.find((item) => !guarantees.has(item));
  if (missingGuarantee) {
    fail('invalid_runtime', `executor is missing host guarantee: ${missingGuarantee}`);
  }
  if (!Array.isArray(input.adapters) || input.adapters.length === 0) {
    fail('invalid_runtime', 'at least one verifier adapter is required');
  }
  const ids = new Set();
  for (const adapter of input.adapters) {
    if (!registeredAdapters.has(adapter)) {
      fail('untrusted_verifier', 'verifier adapters must be created by a trusted factory');
    }
    if (ids.has(adapter.id)) fail('invalid_runtime', `duplicate verifier id: ${adapter.id}`);
    ids.add(adapter.id);
  }
  const executor = {
    ...publicExecutor({ ...input.executor, definition }),
    definition,
    execute: input.executor.execute,
  };
  deepFreeze(executor.definition);
  const adapterDefinitions = input.adapters.map((adapter) => cloneData(adapter, 'adapter'));
  const verifierSet = {
    id: input.id,
    digest: digestJson({
      contract: 'forge-effectiveness-verifier-set',
      version: 1,
      id: input.id,
      executor: publicExecutor({ ...input.executor, definition }),
      adapters: adapterDefinitions,
    }),
  };
  const runtime = Object.freeze({
    verifierSet: Object.freeze(verifierSet),
    executor: Object.freeze(executor),
    adapters: Object.freeze([...input.adapters]),
  });
  registeredRuntimes.add(runtime);
  return runtime;
}

export function isEffectivenessVerifierRuntime(value) {
  return registeredRuntimes.has(value);
}

function assertTarget(target) {
  if (!isPlainObject(target) || !isPlainObject(target.workspace)) {
    fail('invalid_run', 'target and target.workspace are required');
  }
  assertAttemptId(target.attempt_id);
  if (typeof target.objective_ref !== 'string' || target.objective_ref.length === 0) {
    fail('invalid_run', 'target.objective_ref is required');
  }
  assertDigest(target.objective_digest, 'target.objective_digest');
  const workspace = target.workspace;
  assertExactKeys(
    workspace,
    [
      'isolation_id',
      'base_snapshot_digest',
      'final_snapshot_digest',
      'diff_ref',
      'diff_digest',
    ],
    'target.workspace',
  );
  if (typeof workspace.isolation_id !== 'string' || workspace.isolation_id.length === 0) {
    fail('invalid_run', 'target.workspace.isolation_id is required');
  }
  assertDigest(workspace.base_snapshot_digest, 'target.workspace.base_snapshot_digest');
  assertDigest(workspace.final_snapshot_digest, 'target.workspace.final_snapshot_digest');
  if (typeof workspace.diff_ref !== 'string' || path.basename(workspace.diff_ref) !== workspace.diff_ref) {
    fail('invalid_run', 'target.workspace.diff_ref must be a basename');
  }
  assertDigest(workspace.diff_digest, 'target.workspace.diff_digest');
}

function assertRunSpec(spec) {
  if (!isPlainObject(spec)) fail('invalid_run', 'verifier run spec must be an object');
  if (!registeredRuntimes.has(spec.runtime)) {
    fail('untrusted_runtime', 'runtime must be created by the verifier runtime factory');
  }
  for (const [field, label] of [
    ['workspaceDir', 'workspaceDir'],
    ['evidenceDir', 'evidenceDir'],
  ]) {
    if (typeof spec[field] !== 'string' || !fs.existsSync(spec[field])) {
      fail('invalid_run', `${label} must be an existing directory`);
    }
    const stat = fs.lstatSync(spec[field]);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      fail('invalid_run', `${label} must be a non-linked directory`);
    }
  }
  assertTarget(spec.target);
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

function atomicWriteNew(filePath, content) {
  if (fs.existsSync(filePath)) fail('evidence_collision', `evidence already exists: ${path.basename(filePath)}`);
  const temporary = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, content);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.linkSync(temporary, filePath);
    fs.unlinkSync(temporary);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    fs.rmSync(temporary, { force: true });
  }
}

function retain(rootDir, ref, value) {
  const bytes = Buffer.from(JSON.stringify(value));
  atomicWriteNew(path.join(rootDir, ref), bytes);
  return { ref, digest: digestBuffer(bytes), bytes: bytes.length };
}

function safeInfrastructureObservation(adapter) {
  return adapter.kind === 'command'
    ? {
        kind: 'command',
        status: 'infrastructure_error',
        exit_code: null,
        signal: null,
        stdout_digest: digestBuffer(''),
        stderr_digest: digestBuffer(''),
      }
    : { kind: adapter.kind === 'diff' ? 'diff' : 'assertion', status: 'infrastructure_error' };
}

function normalizeObservation(adapter, input) {
  if (!isPlainObject(input)) return safeInfrastructureObservation(adapter);
  if (adapter.kind === 'command') {
    const statuses = new Set([
      'completed',
      'command_not_found',
      'timeout',
      'output_limit',
      'infrastructure_error',
    ]);
    try {
      assertExactKeys(
        input,
        ['kind', 'status', 'exit_code', 'signal', 'stdout_digest', 'stderr_digest'],
        'command observation',
      );
      if (
        input.kind !== 'command' ||
        !statuses.has(input.status) ||
        (input.exit_code !== null && !Number.isInteger(input.exit_code)) ||
        (input.signal !== null && typeof input.signal !== 'string')
      ) {
        return safeInfrastructureObservation(adapter);
      }
      assertDigest(input.stdout_digest, 'stdout_digest');
      assertDigest(input.stderr_digest, 'stderr_digest');
      return cloneData(input, 'command observation');
    } catch {
      return safeInfrastructureObservation(adapter);
    }
  }
  const expectedKind = adapter.kind === 'diff' ? 'diff' : 'assertion';
  if (
    !isPlainObject(input) ||
    !Object.hasOwn(input, 'kind') ||
    !Object.hasOwn(input, 'status') ||
    Object.keys(input).length !== 2 ||
    input.kind !== expectedKind ||
    !['passed', 'failed', 'unavailable', 'infrastructure_error'].includes(input.status)
  ) {
    return safeInfrastructureObservation(adapter);
  }
  return { kind: expectedKind, status: input.status };
}

function outcomeFor(adapter, observation) {
  if (adapter.kind === 'command') {
    if (observation.status === 'command_not_found') return ['unavailable', 'command_not_found'];
    if (observation.status === 'timeout') return ['infrastructure_error', 'verifier_timeout'];
    if (observation.status === 'output_limit') return ['infrastructure_error', 'verifier_output_limit'];
    if (observation.status === 'infrastructure_error') {
      return ['infrastructure_error', 'verifier_execution_failed'];
    }
    return observation.exit_code === 0
      ? ['passed', 'command_passed']
      : ['task_failed', 'command_failed'];
  }
  if (observation.status === 'unavailable') return ['unavailable', 'verifier_unavailable'];
  if (observation.status === 'infrastructure_error') {
    return ['infrastructure_error', 'verifier_execution_failed'];
  }
  const noun = adapter.kind === 'diff' ? 'diff' : 'assertion';
  return observation.status === 'passed'
    ? ['passed', `${noun}_passed`]
    : ['task_failed', `${noun}_failed`];
}

function publicVerifier(adapter) {
  return {
    id: adapter.id,
    kind: adapter.kind,
    purpose: adapter.purpose,
    definition_digest: adapter.definition_digest,
    scope: cloneData(adapter.scope, 'scope'),
  };
}

function sameData(left, right) {
  return JSON.stringify(canonicalValue(left)) === JSON.stringify(canonicalValue(right));
}

function decodeResult(input) {
  if (typeof input !== 'string' && !Buffer.isBuffer(input)) return cloneData(input, 'result');
  const bytes = Buffer.isBuffer(input) ? input.length : Buffer.byteLength(input);
  if (bytes > 1024 * 1024) fail('invalid_result', 'verifier result exceeds 1 MiB');
  try {
    return JSON.parse(String(input));
  } catch (error) {
    fail('invalid_result', 'verifier result is not valid JSON', { cause: error });
  }
}

export function parseEffectivenessVerifierResult(input, options = {}) {
  const result = decodeResult(input);
  if (!isPlainObject(result)) fail('invalid_result', 'verifier result must be an object');
  assertExactKeys(
    result,
    [
      'schema_version',
      'contract',
      'result_id',
      'verifier_set',
      'executor',
      'verifier',
      'target',
      'scope',
      'independence_level',
      'outcome',
      'reason_code',
      'started_at',
      'ended_at',
      'evidence_refs',
    ],
    'verifier result',
  );
  if (result.schema_version !== SCHEMA_VERSION || result.contract !== RESULT_CONTRACT) {
    fail('invalid_result', 'verifier result contract or version is unsupported');
  }
  if (typeof result.result_id !== 'string' || result.result_id.length === 0) {
    fail('invalid_result', 'result_id is required');
  }
  if (!isPlainObject(result.verifier_set)) fail('invalid_result', 'verifier_set is required');
  assertExactKeys(result.verifier_set, ['id', 'digest'], 'verifier_set');
  assertId(result.verifier_set.id, 'verifier_set.id');
  assertDigest(result.verifier_set.digest, 'verifier_set.digest');
  if (!isPlainObject(result.executor)) fail('invalid_result', 'executor is required');
  assertExactKeys(result.executor, ['id', 'version', 'definition_digest'], 'executor');
  assertId(result.executor.id, 'executor.id');
  if (typeof result.executor.version !== 'string' || result.executor.version.length === 0) {
    fail('invalid_result', 'executor.version is required');
  }
  assertDigest(result.executor.definition_digest, 'executor.definition_digest');
  if (!isPlainObject(result.verifier)) fail('invalid_result', 'verifier is required');
  assertExactKeys(
    result.verifier,
    ['id', 'kind', 'purpose', 'definition_digest', 'scope'],
    'verifier',
  );
  assertId(result.verifier.id, 'verifier.id');
  if (!['command', 'hidden_assertion', 'diff'].includes(result.verifier.kind)) {
    fail('invalid_result', 'verifier.kind is unsupported');
  }
  const validPurpose = result.verifier.kind === 'command'
    ? COMMAND_PURPOSES.has(result.verifier.purpose)
    : result.verifier.purpose === result.verifier.kind;
  if (!validPurpose) {
    fail('invalid_result', 'verifier purpose does not match verifier.kind');
  }
  assertDigest(result.verifier.definition_digest, 'verifier.definition_digest');
  assertScope(result.verifier.scope);
  assertTarget(result.target);
  assertScope(result.scope);
  if (!sameData(result.scope, result.verifier.scope)) {
    fail('invalid_result', 'scope does not match verifier.scope');
  }
  if (result.independence_level !== 'independent_verifier') {
    fail('invalid_result', 'independence_level must be independent_verifier');
  }
  const reasons = new Map([
    ['command_passed', 'passed'],
    ['command_failed', 'task_failed'],
    ['command_not_found', 'unavailable'],
    ['verifier_timeout', 'infrastructure_error'],
    ['verifier_output_limit', 'infrastructure_error'],
    ['verifier_execution_failed', 'infrastructure_error'],
    ['verifier_unavailable', 'unavailable'],
    ['assertion_passed', 'passed'],
    ['assertion_failed', 'task_failed'],
    ['diff_passed', 'passed'],
    ['diff_failed', 'task_failed'],
  ]);
  if (reasons.get(result.reason_code) !== result.outcome) {
    fail('invalid_result', 'outcome and reason_code are inconsistent');
  }
  const startedAt = Date.parse(result.started_at);
  const endedAt = Date.parse(result.ended_at);
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) {
    fail('invalid_result', 'verifier timestamps are invalid');
  }
  if (!Array.isArray(result.evidence_refs) || result.evidence_refs.length === 0) {
    fail('invalid_result', 'at least one evidence reference is required');
  }
  for (const reference of result.evidence_refs) {
    if (!isPlainObject(reference)) fail('invalid_result', 'evidence reference is invalid');
    assertExactKeys(reference, ['role', 'ref', 'digest', 'bytes'], 'evidence reference');
    if (
      typeof reference.role !== 'string' ||
      reference.role.length === 0 ||
      typeof reference.ref !== 'string' ||
      path.basename(reference.ref) !== reference.ref ||
      !Number.isSafeInteger(reference.bytes) ||
      reference.bytes < 0
    ) {
      fail('invalid_result', 'evidence reference fields are invalid');
    }
    assertDigest(reference.digest, 'evidence reference digest');
  }
  if (
    result.evidence_refs.length !== 1 ||
    result.evidence_refs[0].role !== 'host_observation'
  ) {
    fail('invalid_result', 'evidence_refs must contain exactly one host_observation');
  }
  if (options.runtime !== undefined) {
    if (!registeredRuntimes.has(options.runtime)) {
      fail('invalid_result', 'runtime is not trusted');
    }
    const adapter = options.runtime.adapters.find((item) => item.id === result.verifier.id);
    if (
      !sameData(result.verifier_set, options.runtime.verifierSet) ||
      !sameData(result.executor, {
        id: options.runtime.executor.id,
        version: options.runtime.executor.version,
        definition_digest: options.runtime.executor.definition_digest,
      }) ||
      adapter === undefined ||
      !sameData(result.verifier, publicVerifier(adapter))
    ) {
      fail('invalid_result', 'verifier result does not match the trusted runtime');
    }
  }
  if (options.target !== undefined && !sameData(result.target, options.target)) {
    fail('invalid_result', 'verifier result target does not match expected target');
  }
  return result;
}

export async function runEffectivenessVerifierSet(spec) {
  assertRunSpec(spec);
  const evidenceRoot = fs.realpathSync(spec.evidenceDir);
  const workspaceDir = fs.realpathSync(spec.workspaceDir);
  const target = cloneData(spec.target, 'target');
  const results = [];
  for (const adapter of spec.runtime.adapters) {
    const startedAt = new Date().toISOString();
    const startedMonotonic = performance.now();
    let rawObservation;
    try {
      rawObservation = await spec.runtime.executor.execute(Object.freeze({
        adapter,
        workspaceDir,
        target: cloneData(target, 'target'),
        limits: cloneData(spec.limits, 'limits'),
      }));
    } catch {
      rawObservation = safeInfrastructureObservation(adapter);
    }
    const observation = normalizeObservation(adapter, rawObservation);
    const [outcome, reasonCode] = outcomeFor(adapter, observation);
    const durationMs = Math.max(
      0,
      Math.round((performance.now() - startedMonotonic) * 1000) / 1000,
    );
    const endedAt = new Date(Date.parse(startedAt) + durationMs).toISOString();
    const verifier = publicVerifier(adapter);
    const observationDocument = {
      schema_version: SCHEMA_VERSION,
      contract: OBSERVATION_CONTRACT,
      verifier_set: cloneData(spec.runtime.verifierSet, 'verifier set'),
      executor: {
        id: spec.runtime.executor.id,
        version: spec.runtime.executor.version,
        definition_digest: spec.runtime.executor.definition_digest,
      },
      verifier,
      target,
      started_at: startedAt,
      ended_at: endedAt,
      observation,
    };
    const observationReference = retain(
      evidenceRoot,
      `${adapter.id}.verifier-observation.json`,
      observationDocument,
    );
    const result = {
      schema_version: SCHEMA_VERSION,
      contract: RESULT_CONTRACT,
      result_id: `${target.attempt_id}.${adapter.id}`,
      verifier_set: cloneData(spec.runtime.verifierSet, 'verifier set'),
      executor: {
        id: spec.runtime.executor.id,
        version: spec.runtime.executor.version,
        definition_digest: spec.runtime.executor.definition_digest,
      },
      verifier,
      target,
      scope: cloneData(adapter.scope, 'scope'),
      independence_level: 'independent_verifier',
      outcome,
      reason_code: reasonCode,
      started_at: startedAt,
      ended_at: endedAt,
      evidence_refs: [{ role: 'host_observation', ...observationReference }],
    };
    parseEffectivenessVerifierResult(result, { runtime: spec.runtime, target });
    const reference = retain(
      evidenceRoot,
      `${adapter.id}.verifier-result.json`,
      result,
    );
    results.push({ result, observation_reference: observationReference, reference });
  }
  return {
    schema_version: SCHEMA_VERSION,
    contract: RUN_CONTRACT,
    verifier_set: cloneData(spec.runtime.verifierSet, 'verifier set'),
    target,
    results,
  };
}
