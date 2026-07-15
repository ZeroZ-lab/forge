import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { loadEffectivenessContract } from './effectiveness-contract.mjs';
import {
  createEffectivenessReport,
  parseEffectivenessReport,
} from './effectiveness-report.mjs';
import {
  referenceEvidenceEnvelope,
  verifyEvidenceEnvelope,
} from './evidence-envelope.mjs';
import {
  isEffectivenessVerifierRuntime,
  parseEffectivenessVerifierObservation,
  parseEffectivenessVerifierResult,
} from './effectiveness-verifier.mjs';
import { runIsolatedEffectivenessAttempt } from './effectiveness-runner.mjs';
import { loadRegistry } from './registry.mjs';

export const EFFECTIVENESS_ARM_IDS = Object.freeze([
  'no-forge',
  'kernel-only',
  'adaptive-full',
  'legacy-chain',
]);

const REQUIRED_HOST_GUARANTEES = Object.freeze([
  'filesystem_isolation',
  'network_policy',
  'process_tree_containment',
  'live_cpu_limit',
  'live_memory_limit',
  'live_disk_limit',
]);
const CONTROL_CONTEXT_ENV = 'FORGE_EFFECTIVENESS_COMMON_CONTEXT';
const ARM_CONTEXT_ENV = 'FORGE_EFFECTIVENESS_ARM_CONTEXT';
const RUNTIME_RECEIPT_PREFIX = 'FORGE_EFFECTIVENESS_RUNTIME_RECEIPT ';
const CAPABILITY_KINDS = new Set(['skill', 'tool', 'connector', 'subagent', 'other']);
const LIMIT_FIELDS = Object.freeze([
  'timeoutMs',
  'maxStdoutBytes',
  'maxStderrBytes',
  'maxCapturedWorkspaceBytes',
  'maxCapturedWorkspaceEntries',
  'maxDiffBytes',
  'gitOperationTimeoutMs',
  'killGraceMs',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalValue(value, seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error('definition must not contain cycles');
    seen.add(value);
    const result = value.map((item) => canonicalValue(item, seen));
    seen.delete(value);
    return result;
  }
  if (!isPlainObject(value)) throw new Error('definition must contain only JSON data');
  if (seen.has(value)) throw new Error('definition must not contain cycles');
  seen.add(value);
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] === undefined) throw new Error(`definition field ${key} is undefined`);
    result[key] = canonicalValue(value[key], seen);
  }
  seen.delete(value);
  return result;
}

function cloneData(value, label) {
  try {
    return structuredClone(value);
  } catch (error) {
    throw new EffectivenessExperimentError(
      'INVALID_EXPERIMENT',
      `${label} must be cloneable JSON data: ${error.message}`,
      { cause: error },
    );
  }
}

function digestJson(value) {
  const canonical = JSON.stringify(canonicalValue(value));
  return `sha256:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
}

function digestBuffer(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function atomicWriteJson(filePath, value) {
  const temporary = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`,
  );
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, filePath);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    fs.rmSync(temporary, { force: true });
  }
}

function fileReference(filePath) {
  const content = fs.readFileSync(filePath);
  return {
    ref: path.basename(filePath),
    digest: digestBuffer(content),
    bytes: content.length,
  };
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
      throw new EffectivenessExperimentError(
        'INVALID_EXPERIMENT',
        `no existing ancestor for ${candidate}`,
      );
    }
    missing.unshift(path.basename(existing));
    existing = parent;
  }
  return path.resolve(fs.realpathSync(existing), ...missing);
}

function assertSeparateEvidenceRoot(sourceDir, evidenceRoot) {
  const source = fs.realpathSync(sourceDir);
  const evidence = resolvePhysicalCandidate(evidenceRoot);
  if (pathIsWithin(source, evidence) || pathIsWithin(evidence, source)) {
    throw new EffectivenessExperimentError(
      'INVALID_EXPERIMENT',
      'evidence root and source repository must be physically separate',
    );
  }
}

function digestDirectory(rootDir) {
  const hash = crypto.createHash('sha256');
  function visit(directory, relativeDirectory = '') {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => compareText(left.name, right.name));
    for (const entry of entries) {
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        hash.update(`directory\0${relativePath}\0`);
        visit(fullPath, relativePath);
      } else if (entry.isFile()) {
        hash.update(`file\0${relativePath}\0`);
        hash.update(fs.readFileSync(fullPath));
        hash.update('\0');
      } else if (entry.isSymbolicLink()) {
        hash.update(`symlink\0${relativePath}\0${fs.readlinkSync(fullPath)}\0`);
      } else {
        throw new EffectivenessExperimentError(
          'INVALID_EXPERIMENT',
          `unsupported published skill entry: ${relativePath}`,
        );
      }
    }
  }
  visit(rootDir);
  return `sha256:${hash.digest('hex')}`;
}

function capabilityKey(capability) {
  return `${capability.kind}\u0000${capability.id}\u0000${capability.version ?? ''}`;
}

function normalizeCapabilities(capabilities, label) {
  if (!Array.isArray(capabilities)) {
    throw new EffectivenessExperimentError('INVALID_EXPERIMENT', `${label} must be an array`);
  }
  const seen = new Set();
  return capabilities
    .map((capability) => {
      if (
        !isPlainObject(capability) ||
        !CAPABILITY_KINDS.has(capability.kind) ||
        typeof capability.id !== 'string' ||
        capability.id.length === 0 ||
        (capability.version !== undefined &&
          (typeof capability.version !== 'string' || capability.version.length === 0))
      ) {
        throw new EffectivenessExperimentError(
          'INVALID_EXPERIMENT',
          `${label} contains an invalid capability descriptor`,
        );
      }
      const normalized = {
        kind: capability.kind,
        id: capability.id,
        ...(capability.version === undefined ? {} : { version: capability.version }),
      };
      const key = capabilityKey(normalized);
      if (seen.has(key)) {
        throw new EffectivenessExperimentError(
          'INVALID_EXPERIMENT',
          `${label} contains duplicate capability ${capability.id}`,
        );
      }
      seen.add(key);
      return normalized;
    })
    .sort((left, right) => compareText(capabilityKey(left), capabilityKey(right)));
}

function validRetainedReference(armDir, reference) {
  if (
    !isPlainObject(reference) ||
    !isDeepStrictEqual(Object.keys(reference).sort(compareText), ['bytes', 'digest', 'ref']) ||
    typeof reference.ref !== 'string' ||
    path.basename(reference.ref) !== reference.ref ||
    !/^sha256:[0-9a-f]{64}$/.test(reference.digest) ||
    !Number.isSafeInteger(reference.bytes) ||
    reference.bytes < 0
  ) {
    return false;
  }
  const artifactPath = path.join(armDir, reference.ref);
  try {
    const stat = fs.lstatSync(artifactPath);
    return stat.isFile() &&
      pathIsWithin(fs.realpathSync(armDir), fs.realpathSync(artifactPath)) &&
      stat.size === reference.bytes &&
      digestBuffer(fs.readFileSync(artifactPath)) === reference.digest;
  } catch {
    return false;
  }
}

function hasValidEvidenceEnvelopes(report, armDir, rootDir, options = {}) {
  try {
    const runnerEvidence = report.evidence.filter((evidence) =>
      evidence.producer_ref.startsWith('runner:'));
    const verifierEvidence = report.evidence.filter((evidence) =>
      evidence.source_kind === 'independent_verifier');
    if (
      runnerEvidence.length === 0 ||
      runnerEvidence.some((evidence) => typeof evidence.envelope_ref !== 'string') ||
      (options.requireVerifiers === true &&
        report.execution.termination === 'completed' &&
        verifierEvidence.length === 0) ||
      (options.requireVerifiers === true &&
        verifierEvidence.some((evidence) => typeof evidence.envelope_ref !== 'string'))
    ) {
      return false;
    }
    for (const evidence of report.evidence.filter((item) => item.envelope_ref !== undefined)) {
      verifyEvidenceEnvelope(
        referenceEvidenceEnvelope(evidence.envelope_ref, { evidenceRoot: armDir }),
        {
          rootDir,
          evidenceRoot: armDir,
          report,
          evidenceId: evidence.id,
        },
      );
      if (
        options.requireVerifiers === true &&
        evidence.source_kind === 'independent_verifier'
      ) {
        const resultPath = path.join(armDir, evidence.locator);
        const stat = fs.lstatSync(resultPath);
        if (
          path.basename(evidence.locator) !== evidence.locator ||
          !stat.isFile() ||
          stat.size > 1024 * 1024 ||
          !pathIsWithin(fs.realpathSync(armDir), fs.realpathSync(resultPath))
        ) {
          return false;
        }
        const result = parseEffectivenessVerifierResult(fs.readFileSync(resultPath));
        if (
          result.evidence_refs.some(({ role: _role, ...reference }) =>
            !validRetainedReference(armDir, reference))
        ) {
          return false;
        }
        const observationReference = result.evidence_refs[0];
        parseEffectivenessVerifierObservation(
          fs.readFileSync(path.join(armDir, observationReference.ref)),
          { result },
        );
        const event = report.events.find((item) => item.id === evidence.event_id);
        const diffPath = path.join(armDir, result.target.workspace.diff_ref);
        const expectedStatus = result.outcome === 'passed'
          ? 'succeeded'
          : result.outcome === 'unavailable'
            ? 'blocked'
            : 'failed';
        if (
          !isDeepStrictEqual(result.verifier_set, report.experiment.verifier_set) ||
          result.target.attempt_id !== report.experiment.arm.id ||
          result.target.objective_ref !== report.experiment.objective.id ||
          result.target.objective_digest !== report.experiment.objective.digest ||
          result.target.workspace.isolation_id !== report.experiment.workspace.isolation_id ||
          result.target.workspace.base_snapshot_digest !== report.experiment.workspace.snapshot_digest ||
          result.target.workspace.final_snapshot_digest !== report.experiment.workspace.final_snapshot_digest ||
          result.target.workspace.diff_ref !== report.experiment.workspace.diff_ref ||
          !fs.lstatSync(diffPath).isFile() ||
          result.target.workspace.diff_digest !== digestBuffer(fs.readFileSync(diffPath)) ||
          evidence.producer_ref !== `verifier:${result.executor.id}@${result.executor.version}/${result.verifier.id}` ||
          event?.actor !== 'verifier' ||
          event?.status !== expectedStatus ||
          event?.observed_at !== result.ended_at ||
          event?.details_ref !== evidence.locator ||
          !report.final_result.verifier_result_refs.includes(evidence.id)
        ) {
          return false;
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

function hasValidGroupSeal(groupDir, comparisonGroupId, rootDir, experimentPlan) {
  const sealPath = path.join(groupDir, 'group.json');
  try {
    if (!fs.lstatSync(groupDir).isDirectory() || !fs.lstatSync(sealPath).isFile()) return false;
    const seal = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
    if (
      !isPlainObject(seal) ||
      !isDeepStrictEqual(
        Object.keys(seal).sort(compareText),
        [
          'common_context_digest',
          'comparison_group_id',
          'contract',
          'host_policy_digest',
          'reports',
          'version',
        ],
      ) ||
      seal.contract !== 'forge-effectiveness-comparison-group' ||
      ![1, 2, 3].includes(seal.version) ||
      seal.comparison_group_id !== comparisonGroupId ||
      !/^sha256:[0-9a-f]{64}$/.test(seal.common_context_digest) ||
      !/^sha256:[0-9a-f]{64}$/.test(seal.host_policy_digest) ||
      !Array.isArray(seal.reports) ||
      seal.reports.length !== EFFECTIVENESS_ARM_IDS.length
    ) {
      return false;
    }
    for (let index = 0; index < EFFECTIVENESS_ARM_IDS.length; index += 1) {
      const armId = EFFECTIVENESS_ARM_IDS[index];
      const entry = seal.reports[index];
      const armDir = path.join(groupDir, armId);
      if (
        !isPlainObject(entry) ||
        entry.arm !== armId ||
        typeof entry.report_id !== 'string' ||
        !/^sha256:[0-9a-f]{64}$/.test(entry.digest) ||
        !fs.lstatSync(armDir).isDirectory() ||
        !pathIsWithin(fs.realpathSync(groupDir), fs.realpathSync(armDir))
      ) {
        return false;
      }
      const reportPath = path.join(armDir, 'report.json');
      if (!fs.lstatSync(reportPath).isFile()) return false;
      const report = parseEffectivenessReport(fs.readFileSync(reportPath, 'utf8'), {
        rootDir,
        experimentPlan,
      });
      const requiresRuntime = report.experiment.model.availability === 'available';
      const expectedEntryFields = [
        'arm',
        'digest',
        'host_enforcement',
        'report_id',
        ...(requiresRuntime ? ['runtime_receipt'] : []),
      ].sort(compareText);
      if (
        !isDeepStrictEqual(Object.keys(entry).sort(compareText), expectedEntryFields) ||
        report.report_id !== entry.report_id ||
        report.experiment.arm.id !== armId ||
        digestJson(report) !== entry.digest ||
        !validRetainedReference(armDir, entry.host_enforcement) ||
        (requiresRuntime && !validRetainedReference(armDir, entry.runtime_receipt))
      ) {
        return false;
      }
      if (seal.version === 1 && report.evidence.some((evidence) => evidence.envelope_ref !== undefined)) {
        return false;
      }
      if (
        seal.version >= 2 &&
        !hasValidEvidenceEnvelopes(report, armDir, rootDir, {
          requireVerifiers: seal.version >= 3,
        })
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function quarantineIncompleteFinal(evidenceRoot, finalGroupDir, comparisonGroupId) {
  const root = fs.realpathSync(evidenceRoot);
  const finalStat = fs.lstatSync(finalGroupDir);
  if (!finalStat.isDirectory() || !pathIsWithin(root, fs.realpathSync(finalGroupDir))) {
    throw new EffectivenessExperimentError(
      'EVIDENCE_COLLISION',
      `comparison group path is not a recoverable evidence directory: ${comparisonGroupId}`,
    );
  }
  const suffix = crypto.randomBytes(6).toString('hex');
  const groupFile = path.join(finalGroupDir, 'group.json');
  if (fs.existsSync(groupFile)) {
    fs.renameSync(groupFile, path.join(finalGroupDir, `rejected-group-${suffix}.json`));
  }
  const incompleteGroupDir = path.join(
    evidenceRoot,
    `${comparisonGroupId}.incomplete-recovered-${suffix}`,
  );
  fs.renameSync(finalGroupDir, incompleteGroupDir);
  return incompleteGroupDir;
}

function makeArmPlan(armId, armDefinition, exposed) {
  const policyWithoutDigest = {
    id: armId,
    exposed,
  };
  const capabilityPolicy = {
    id: armId,
    digest: digestJson({
      contract: 'forge-effectiveness-capability-policy',
      version: 1,
      ...policyWithoutDigest,
    }),
    exposed,
  };
  return {
    definition_digest: digestJson({
      contract: 'forge-effectiveness-arm',
      version: 1,
      id: armId,
      definition: armDefinition,
      capability_policy: capabilityPolicy,
    }),
    capability_policy: capabilityPolicy,
  };
}

function effectiveArmDefinitions(rootDir, armDefinitions, packageVersion) {
  return {
    ...armDefinitions,
    'adaptive-full': {
      ...armDefinitions['adaptive-full'],
      package_version: packageVersion,
      published_skills_digest: digestDirectory(path.join(rootDir, 'plugins', 'forge', 'skills')),
    },
  };
}

export class EffectivenessExperimentError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'EffectivenessExperimentError';
    this.code = code;
  }
}

export function createEffectivenessExperimentPlan({ rootDir, baseCapabilities = [] }) {
  if (typeof rootDir !== 'string' || rootDir.length === 0) {
    throw new EffectivenessExperimentError('INVALID_EXPERIMENT', 'rootDir is required');
  }
  const { manifest, armDefinitions } = loadEffectivenessContract(rootDir);
  if (!isDeepStrictEqual(manifest.modes, EFFECTIVENESS_ARM_IDS)) {
    throw new EffectivenessExperimentError(
      'INVALID_EXPERIMENT',
      'effectiveness contract does not define the required four arms',
    );
  }

  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const base = normalizeCapabilities(baseCapabilities, 'baseCapabilities');
  const reservedBase = base.find((capability) => /^forge:/i.test(capability.id));
  if (reservedBase) {
    throw new EffectivenessExperimentError(
      'INVALID_EXPERIMENT',
      `baseCapabilities cannot use the reserved Forge namespace: ${reservedBase.id}`,
    );
  }
  const kernel = { kind: 'other', id: 'forge:kernel', version: armDefinitions['kernel-only'].kernel_version };
  const adaptiveSkills = loadRegistry(rootDir).skills.map((skill) => ({
    kind: 'skill',
    id: `forge:${skill.name}`,
    version: packageJson.version,
  }));
  const legacy = {
    kind: 'other',
    id: 'forge:legacy-chain',
    version: armDefinitions['legacy-chain'].baseline_version,
  };
  const effectiveDefinitions = effectiveArmDefinitions(rootDir, armDefinitions, packageJson.version);
  const exposures = {
    'no-forge': normalizeCapabilities(base, 'no-forge capabilities'),
    'kernel-only': normalizeCapabilities([...base, kernel], 'kernel-only capabilities'),
    'adaptive-full': normalizeCapabilities(
      [...base, kernel, ...adaptiveSkills],
      'adaptive-full capabilities',
    ),
    'legacy-chain': normalizeCapabilities([...base, legacy], 'legacy-chain capabilities'),
  };

  return {
    arms: Object.fromEntries(
      EFFECTIVENESS_ARM_IDS.map((armId) => [
        armId,
        makeArmPlan(armId, effectiveDefinitions[armId], exposures[armId]),
      ]),
    ),
  };
}

function assertIdentity(identity, label) {
  if (
    !isPlainObject(identity) ||
    !isDeepStrictEqual(
      Object.keys(identity).sort(compareText),
      ['id', 'provider', ...(identity?.revision === undefined ? [] : ['revision'])].sort(compareText),
    ) ||
    typeof identity.provider !== 'string' ||
    identity.provider.length === 0 ||
    typeof identity.id !== 'string' ||
    identity.id.length === 0 ||
    (identity.revision !== undefined &&
      (typeof identity.revision !== 'string' || identity.revision.length === 0))
  ) {
    throw new EffectivenessExperimentError(
      'INVALID_MODEL_SELECTION',
      `${label} must contain an explicit provider and model id`,
    );
  }
}

function sameRequestedIdentity(requested, actual) {
  return requested.provider === actual.provider &&
    requested.id === actual.id &&
    (requested.revision === undefined || requested.revision === actual.revision);
}

function assertHostSandbox(hostSandbox) {
  if (
    !isPlainObject(hostSandbox) ||
    typeof hostSandbox.id !== 'string' ||
    typeof hostSandbox.version !== 'string' ||
    typeof hostSandbox.prepareLaunch !== 'function' ||
    !isPlainObject(hostSandbox.definition) ||
    !isPlainObject(hostSandbox.resourcePolicy)
  ) {
    throw new EffectivenessExperimentError(
      'HOST_SANDBOX_UNAVAILABLE',
      'a versioned host sandbox adapter is required',
    );
  }
  const guarantees = new Set(hostSandbox.guarantees ?? []);
  const missing = REQUIRED_HOST_GUARANTEES.filter((guarantee) => !guarantees.has(guarantee));
  if (missing.length > 0) {
    throw new EffectivenessExperimentError(
      'HOST_SANDBOX_UNAVAILABLE',
      `host sandbox is missing required guarantees: ${missing.join(', ')}`,
    );
  }
  try {
    canonicalValue(hostSandbox.definition);
    canonicalValue(hostSandbox.resourcePolicy);
  } catch (error) {
    throw new EffectivenessExperimentError(
      'HOST_SANDBOX_UNAVAILABLE',
      `host sandbox definition is not auditable: ${error.message}`,
      { cause: error },
    );
  }
}

function assertExperimentPlan(plan) {
  if (!isPlainObject(plan?.arms) || !isDeepStrictEqual(Object.keys(plan.arms), EFFECTIVENESS_ARM_IDS)) {
    throw new EffectivenessExperimentError(
      'INVALID_EXPERIMENT',
      'experimentPlan must define exactly the four ordered effectiveness arms',
    );
  }
}

function assertGroupInputs(spec) {
  for (const [label, value] of [
    ['objective', spec.objective],
    ['fixture', spec.fixture],
  ]) {
    if (
      !isPlainObject(value) ||
      typeof value.id !== 'string' ||
      typeof value.source_ref !== 'string' ||
      typeof value.digest !== 'string'
    ) {
      throw new EffectivenessExperimentError(
        'INVALID_EXPERIMENT',
        `${label} must contain id, source_ref, and digest`,
      );
    }
  }
  for (const [label, value] of [
    ['budget', spec.budget],
    ['verifierSet', spec.verifierSet],
  ]) {
    if (!isPlainObject(value) || typeof value.id !== 'string' || typeof value.digest !== 'string') {
      throw new EffectivenessExperimentError(
        'INVALID_EXPERIMENT',
        `${label} must contain id and digest`,
      );
    }
  }
  if (
    !isPlainObject(spec.source) ||
    typeof spec.source.dir !== 'string' ||
    typeof spec.source.ref !== 'string' ||
    typeof spec.evidenceRoot !== 'string' ||
    !isPlainObject(spec.limits)
  ) {
    throw new EffectivenessExperimentError(
      'INVALID_EXPERIMENT',
      'source, evidenceRoot, and limits are required',
    );
  }
  const allowedSourceFields = new Set(['dir', 'ref', 'revision']);
  const extraSource = Object.keys(spec.source).find((field) => !allowedSourceFields.has(field));
  if (
    extraSource ||
    spec.source.dir.length === 0 ||
    spec.source.ref.length === 0 ||
    (spec.source.revision !== undefined &&
      (typeof spec.source.revision !== 'string' || spec.source.revision.length === 0))
  ) {
    throw new EffectivenessExperimentError('INVALID_EXPERIMENT', 'source shape is invalid');
  }
  const limitKeys = Object.keys(spec.limits);
  const missingLimit = LIMIT_FIELDS.find((field) => !Object.hasOwn(spec.limits, field));
  const unknownLimit = limitKeys.find((field) => !LIMIT_FIELDS.includes(field));
  const invalidLimit = LIMIT_FIELDS.find(
    (field) => !Number.isSafeInteger(spec.limits[field]) || spec.limits[field] <= 0,
  );
  if (missingLimit || unknownLimit || invalidLimit) {
    throw new EffectivenessExperimentError(
      'INVALID_EXPERIMENT',
      `limits must contain exact positive values (${missingLimit ?? unknownLimit ?? invalidLimit})`,
    );
  }
}

function assertVerifierRuntime(verifierRuntime, verifierSet) {
  if (
    !isEffectivenessVerifierRuntime(verifierRuntime) ||
    !isPlainObject(verifierRuntime.verifierSet) ||
    !isDeepStrictEqual(verifierRuntime.verifierSet, verifierSet)
  ) {
    throw new EffectivenessExperimentError(
      'VERIFIER_UNAVAILABLE',
      'a trusted external verifier runtime matching verifierSet is required',
    );
  }
}

function unavailableObservation() {
  return {
    events: [],
    evidence: [],
    final_result: {
      submission_status: 'no_output',
      artifact_refs: [],
      verifier_result_refs: [],
    },
    costs: [
      {
        metric: 'turns',
        value: 0,
        unit: 'count',
        acquisition: {
          kind: 'tool',
          source_ref: 'scheduler:model-availability',
          quality: 'observed',
        },
      },
    ],
  };
}

function assertObservedResult(observed) {
  if (
    !isPlainObject(observed) ||
    !Array.isArray(observed.events) ||
    !Array.isArray(observed.evidence) ||
    !isPlainObject(observed.final_result) ||
    !Array.isArray(observed.costs)
  ) {
    throw new EffectivenessExperimentError(
      'INVALID_PROVIDER_OBSERVATION',
      'provider observation must contain events, evidence, final_result, and costs',
    );
  }
  if (Object.hasOwn(observed, 'runtime')) {
    throw new EffectivenessExperimentError(
      'INVALID_PROVIDER_OBSERVATION',
      'runtime identity must come from retained process evidence, not provider observation',
    );
  }
}

function readRuntimeReceipt({ evidenceDir, retainedEvidence, armId, expected }) {
  const reference = retainedEvidence?.artifacts?.stdout;
  if (
    !isPlainObject(reference) ||
    reference.ref !== 'stdout.log' ||
    typeof reference.digest !== 'string' ||
    !Number.isSafeInteger(reference.bytes)
  ) {
    throw new EffectivenessExperimentError(
      'INVALID_RUNTIME_RECEIPT',
      `retained stdout evidence is required for ${armId}`,
    );
  }
  const canonicalEvidenceDir = fs.realpathSync(evidenceDir);
  const receiptSourcePath = path.join(evidenceDir, reference.ref);
  const stat = fs.lstatSync(receiptSourcePath);
  if (
    !stat.isFile() ||
    !pathIsWithin(canonicalEvidenceDir, fs.realpathSync(receiptSourcePath))
  ) {
    throw new EffectivenessExperimentError(
      'INVALID_RUNTIME_RECEIPT',
      `runtime receipt source escaped retained evidence for ${armId}`,
    );
  }
  const content = fs.readFileSync(receiptSourcePath);
  if (content.length !== reference.bytes || digestBuffer(content) !== reference.digest) {
    throw new EffectivenessExperimentError(
      'INVALID_RUNTIME_RECEIPT',
      `runtime receipt source failed digest verification for ${armId}`,
    );
  }
  const receiptLines = content.toString('utf8')
    .split(/\r?\n/u)
    .filter((line) => line.startsWith(RUNTIME_RECEIPT_PREFIX));
  if (receiptLines.length !== 1) {
    throw new EffectivenessExperimentError(
      'INVALID_RUNTIME_RECEIPT',
      `exactly one process-emitted runtime receipt is required for ${armId}`,
    );
  }
  let runtime;
  try {
    runtime = JSON.parse(receiptLines[0].slice(RUNTIME_RECEIPT_PREFIX.length));
  } catch (error) {
    throw new EffectivenessExperimentError(
      'INVALID_RUNTIME_RECEIPT',
      `runtime receipt is not valid JSON for ${armId}`,
      { cause: error },
    );
  }
  assertIdentity(runtime?.actual_model, 'runtime actual model');
  if (
    runtime?.contract !== 'forge-effectiveness-runtime-transport' ||
    runtime?.version !== 1 ||
    runtime.common_context_digest !== expected.commonContextDigest ||
    runtime.arm_definition_digest !== expected.armDefinitionDigest ||
    runtime.capability_policy_digest !== expected.capabilityPolicyDigest
  ) {
    throw new EffectivenessExperimentError(
      'INVALID_RUNTIME_RECEIPT',
      `process-emitted runtime receipt does not match the launched context for ${armId}`,
    );
  }
  return {
    contract: 'forge-effectiveness-runtime-receipt',
    version: 1,
    arm_id: armId,
    actual_model: cloneData(runtime.actual_model, 'runtime actual model'),
    common_context_digest: runtime.common_context_digest,
    arm_definition_digest: runtime.arm_definition_digest,
    capability_policy_digest: runtime.capability_policy_digest,
    source: cloneData(reference, 'runtime receipt source'),
  };
}

async function resolveModel(modelProvider, requestedModel, modelParameters) {
  if (
    !isPlainObject(modelProvider) ||
    typeof modelProvider.id !== 'string' ||
    typeof modelProvider.version !== 'string' ||
    !isPlainObject(modelProvider.definition) ||
    typeof modelProvider.resolve !== 'function' ||
    typeof modelProvider.createLaunch !== 'function'
  ) {
    throw new EffectivenessExperimentError(
      'INVALID_MODEL_SELECTION',
      'a versioned model provider with resolve and createLaunch is required',
    );
  }
  try {
    canonicalValue(modelProvider.definition);
  } catch (error) {
    throw new EffectivenessExperimentError(
      'INVALID_MODEL_SELECTION',
      `model provider definition is not auditable: ${error.message}`,
      { cause: error },
    );
  }
  let resolved;
  try {
    resolved = await modelProvider.resolve({
      requested: cloneData(requestedModel, 'requestedModel'),
      parameters: cloneData(modelParameters, 'modelParameters'),
    });
  } catch (error) {
    throw new EffectivenessExperimentError(
      'MODEL_RESOLUTION_FAILED',
      `model resolution failed: ${error.message}`,
      { cause: error },
    );
  }
  if (resolved?.availability === 'unavailable') {
    if (typeof resolved.reason !== 'string' || resolved.reason.length === 0) {
      throw new EffectivenessExperimentError(
        'INVALID_MODEL_SELECTION',
        'unavailable model resolution requires a reason',
      );
    }
    return { availability: 'unavailable', unavailable_reason: resolved.reason };
  }
  if (resolved?.availability !== 'available') {
    throw new EffectivenessExperimentError(
      'INVALID_MODEL_SELECTION',
      'model resolution must be explicitly available or unavailable',
    );
  }
  assertIdentity(resolved.actual, 'resolved actual model');
  if (!sameRequestedIdentity(requestedModel, resolved.actual)) {
    return {
      availability: 'unavailable',
      unavailable_reason: `provider resolved a different model; fallback to ${resolved.actual.provider}/${resolved.actual.id} was rejected`,
    };
  }
  return { availability: 'available', actual: cloneData(resolved.actual, 'actual model') };
}

function modelCondition(requestedModel, resolution, parametersDigest) {
  return {
    requested: cloneData(requestedModel, 'requestedModel'),
    ...(resolution.availability === 'available'
      ? { actual: cloneData(resolution.actual, 'actual model') }
      : { unavailable_reason: resolution.unavailable_reason }),
    availability: resolution.availability,
    parameters_digest: parametersDigest,
  };
}

function validateControlledReportInputs(spec, experimentPlan, parametersDigest) {
  const armId = EFFECTIVENESS_ARM_IDS[0];
  createEffectivenessReport(
    {
      experiment: {
        comparison_group_id: spec.comparisonGroupId,
        objective: cloneData(spec.objective, 'objective'),
        arm: {
          id: armId,
          definition_digest: experimentPlan.arms[armId].definition_digest,
        },
        model: modelCondition(
          spec.requestedModel,
          { availability: 'unavailable', unavailable_reason: 'preflight validation only' },
          parametersDigest,
        ),
        fixture: cloneData(spec.fixture, 'fixture'),
        reproduction: {
          repeat_index: spec.repeatIndex,
          ...(spec.seed === undefined ? {} : { seed: spec.seed }),
        },
        workspace: {
          source_ref: spec.source.ref,
          base_revision: 'preflight-revision',
          snapshot_digest: `sha256:${'0'.repeat(64)}`,
          isolation_id: 'preflight-isolation',
        },
        budget: cloneData(spec.budget, 'budget'),
        verifier_set: cloneData(spec.verifierSet, 'verifierSet'),
        capability_policy: cloneData(
          experimentPlan.arms[armId].capability_policy,
          'capability policy',
        ),
      },
      execution: {
        runner: { name: 'forge-effectiveness-preflight', version: '1' },
        started_at: '2000-01-01T00:00:00.000Z',
        ended_at: '2000-01-01T00:00:00.001Z',
        termination: 'infrastructure_error',
        termination_detail_ref: 'preflight-only',
      },
      events: [
        {
          id: 'preflight-event',
          sequence: 0,
          type: 'observation',
          actor: 'tool',
          observed_at: '2000-01-01T00:00:00.000Z',
          status: 'observed',
          summary: 'Validated controlled comparison input without launching a model.',
          details_ref: 'preflight-only',
          evidence_refs: ['preflight-evidence'],
        },
      ],
      evidence: [
        {
          id: 'preflight-evidence',
          source_kind: 'tool_output',
          locator: 'preflight-only',
          digest: `sha256:${'1'.repeat(64)}`,
          producer_ref: 'tool:forge-effectiveness-preflight',
          event_id: 'preflight-event',
          objective_ref: spec.objective.id,
        },
      ],
      final_result: {
        submission_status: 'no_output',
        artifact_refs: [],
        verifier_result_refs: [],
      },
      costs: [
        {
          metric: 'wall_time_ms',
          value: 0,
          unit: 'ms',
          acquisition: {
            kind: 'runner',
            source_ref: 'preflight-only',
            quality: 'observed',
          },
        },
        {
          metric: 'turns',
          value: 0,
          unit: 'count',
          acquisition: {
            kind: 'tool',
            source_ref: 'preflight-only',
            quality: 'observed',
          },
        },
      ],
    },
    { rootDir: spec.rootDir, experimentPlan },
  );
}

function controlledReportInput(
  spec,
  armId,
  condition,
  parametersDigest,
  runtimeReceipt,
  observed,
) {
  assertObservedResult(observed);
  let reportCondition = condition;
  if (condition.availability === 'available') {
    if (!isPlainObject(runtimeReceipt)) {
      throw new EffectivenessExperimentError(
        'INVALID_RUNTIME_RECEIPT',
        `runtime receipt is required for ${armId}`,
      );
    }
    reportCondition = {
      availability: 'available',
      actual: cloneData(runtimeReceipt.actual_model, 'runtime actual model'),
    };
  }
  return {
    experiment: {
      comparison_group_id: spec.comparisonGroupId,
      objective: cloneData(spec.objective, 'objective'),
      arm: { id: armId },
      model: modelCondition(spec.requestedModel, reportCondition, parametersDigest),
      fixture: cloneData(spec.fixture, 'fixture'),
      reproduction: {
        repeat_index: spec.repeatIndex,
        ...(spec.seed === undefined ? {} : { seed: spec.seed }),
      },
      budget: cloneData(spec.budget, 'budget'),
      verifier_set: cloneData(spec.verifierSet, 'verifierSet'),
    },
    events: cloneData(observed.events, 'events'),
    evidence: cloneData(observed.evidence, 'evidence'),
    final_result: cloneData(observed.final_result, 'final_result'),
    costs: cloneData(observed.costs, 'costs'),
  };
}

function comparisonIssues(runs, spec) {
  const issues = [];
  const armIds = runs.map((run) => run.report?.experiment?.arm?.id);
  if (!isDeepStrictEqual(armIds, EFFECTIVENESS_ARM_IDS)) issues.push('arms');
  const isolationIds = new Set();
  for (const run of runs) {
    const report = run.report;
    const armId = report?.experiment?.arm?.id;
    if (report?.experiment?.comparison_group_id !== spec.comparisonGroupId) issues.push('comparison_group_id');
    for (const [field, expected] of [
      ['objective', spec.objective],
      ['fixture', spec.fixture],
      ['budget', spec.budget],
      ['verifier_set', spec.verifierSet],
    ]) {
      if (!isDeepStrictEqual(report?.experiment?.[field], expected)) issues.push(field);
    }
    if (!isDeepStrictEqual(report?.experiment?.model?.requested, spec.requestedModel)) {
      issues.push('requested model');
    }
    if (
      armId === undefined ||
      !isDeepStrictEqual(
        report?.experiment?.capability_policy,
        spec.experimentPlan.arms[armId]?.capability_policy,
      )
    ) {
      issues.push('capability exposure');
    }
    if (!isDeepStrictEqual(run.receipt?.execution?.limits, spec.limits)) issues.push('limits');
    if (run.receipt?.source?.source_ref !== spec.source.ref) issues.push('source_ref');
    const isolationId = report?.experiment?.workspace?.isolation_id;
    if (typeof isolationId !== 'string' || isolationIds.has(isolationId)) issues.push('isolation_id');
    isolationIds.add(isolationId);
  }
  const firstWorkspace = runs[0]?.report?.experiment?.workspace;
  for (const run of runs.slice(1)) {
    const workspace = run.report?.experiment?.workspace;
    for (const field of ['source_ref', 'base_revision', 'snapshot_digest']) {
      if (workspace?.[field] !== firstWorkspace?.[field]) issues.push(`workspace.${field}`);
    }
  }
  return [...new Set(issues)];
}

export async function runEffectivenessComparisonGroup(spec) {
  if (!isPlainObject(spec)) {
    throw new EffectivenessExperimentError('INVALID_EXPERIMENT', 'comparison group spec is required');
  }
  if (Object.hasOwn(spec, 'runAttempt')) {
    throw new EffectivenessExperimentError(
      'INVALID_EXPERIMENT',
      'runAttempt is scheduler-owned and cannot be replaced by callers',
    );
  }
  const experimentPlan = createEffectivenessExperimentPlan({
    rootDir: spec.rootDir,
    baseCapabilities: spec.baseCapabilities ?? [],
  });
  if (spec.experimentPlan !== undefined && !isDeepStrictEqual(spec.experimentPlan, experimentPlan)) {
    throw new EffectivenessExperimentError(
      'INVALID_EXPERIMENT',
      'experimentPlan does not match the current trusted four-arm definition',
    );
  }
  assertExperimentPlan(experimentPlan);
  const { armDefinitions: manifestArmDefinitions } = loadEffectivenessContract(spec.rootDir);
  const packageJson = JSON.parse(fs.readFileSync(path.join(spec.rootDir, 'package.json'), 'utf8'));
  const armDefinitions = effectiveArmDefinitions(
    spec.rootDir,
    manifestArmDefinitions,
    packageJson.version,
  );
  const trustedSpec = { ...spec, experimentPlan };
  assertIdentity(spec.requestedModel, 'requestedModel');
  assertHostSandbox(spec.hostSandbox);
  assertGroupInputs(spec);
  assertVerifierRuntime(spec.verifierRuntime, spec.verifierSet);
  if (!Number.isInteger(spec.repeatIndex) || spec.repeatIndex < 0) {
    throw new EffectivenessExperimentError('INVALID_EXPERIMENT', 'repeatIndex must be a non-negative integer');
  }
  if (
    typeof spec.comparisonGroupId !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(spec.comparisonGroupId)
  ) {
    throw new EffectivenessExperimentError('INVALID_EXPERIMENT', 'comparisonGroupId is unsafe');
  }
  const modelParameters = spec.modelParameters ?? {};
  const parametersDigest = digestJson({
    contract: 'forge-effectiveness-model-parameters',
    version: 1,
    parameters: modelParameters,
  });
  try {
    validateControlledReportInputs(trustedSpec, experimentPlan, parametersDigest);
  } catch (error) {
    throw new EffectivenessExperimentError(
      'INVALID_EXPERIMENT',
      `controlled report input is invalid: ${error.message}`,
      { cause: error },
    );
  }

  assertSeparateEvidenceRoot(spec.source.dir, spec.evidenceRoot);
  fs.mkdirSync(spec.evidenceRoot, { recursive: true });
  const finalGroupDir = path.join(spec.evidenceRoot, spec.comparisonGroupId);
  if (fs.existsSync(finalGroupDir)) {
    if (hasValidGroupSeal(
      finalGroupDir,
      spec.comparisonGroupId,
      spec.rootDir,
      experimentPlan,
    )) {
      throw new EffectivenessExperimentError(
        'EVIDENCE_COLLISION',
        `comparison group evidence already exists: ${spec.comparisonGroupId}`,
      );
    }
    quarantineIncompleteFinal(spec.evidenceRoot, finalGroupDir, spec.comparisonGroupId);
  }

  const resolution = await resolveModel(spec.modelProvider, spec.requestedModel, modelParameters);
  const hostDefinitionDigest = digestJson({
    contract: 'forge-effectiveness-host-sandbox',
    version: 1,
    id: spec.hostSandbox.id,
    adapter_version: spec.hostSandbox.version,
    guarantees: [...spec.hostSandbox.guarantees].sort(),
    definition: spec.hostSandbox.definition,
    resource_policy: spec.hostSandbox.resourcePolicy,
  });
  const requiredHostPolicyDigest = digestJson({
    contract: 'forge-effectiveness-host-policy',
    version: 1,
    host_definition_digest: hostDefinitionDigest,
    resource_policy: spec.hostSandbox.resourcePolicy,
    limits: spec.limits,
  });
  const providerDefinitionDigest = digestJson({
    contract: 'forge-effectiveness-model-provider',
    version: 1,
    id: spec.modelProvider.id,
    adapter_version: spec.modelProvider.version,
    definition: spec.modelProvider.definition,
  });
  const commonContext = {
    contract: 'forge-effectiveness-common-launch-context',
    version: 1,
    comparison_group_id: spec.comparisonGroupId,
    objective: cloneData(spec.objective, 'objective'),
    fixture: cloneData(spec.fixture, 'fixture'),
    source: {
      ref: spec.source.ref,
      ...(spec.source.revision === undefined ? {} : { revision: spec.source.revision }),
    },
    reproduction: {
      repeat_index: spec.repeatIndex,
      ...(spec.seed === undefined ? {} : { seed: spec.seed }),
    },
    budget: cloneData(spec.budget, 'budget'),
    verifier_set: cloneData(spec.verifierSet, 'verifierSet'),
    limits: cloneData(spec.limits, 'limits'),
    requested_model: cloneData(spec.requestedModel, 'requestedModel'),
    model_parameters_digest: parametersDigest,
    host_policy_digest: requiredHostPolicyDigest,
  };
  const commonContextDigest = digestJson(commonContext);
  const commonContextJson = JSON.stringify(canonicalValue(commonContext));
  const stagingRoot = fs.mkdtempSync(path.join(spec.evidenceRoot, '.comparison-staging-'));
  const stagingSuffix = path.basename(stagingRoot).slice('.comparison-staging-'.length);

  const prepared = [];
  async function disposePrepared() {
    const failures = [];
    for (const item of [...prepared].reverse()) {
      if (item.hostDisposed || typeof item.hostHandle?.dispose !== 'function') continue;
      try {
        await item.hostHandle.dispose();
        item.hostDisposed = true;
      } catch (error) {
        failures.push(`${item.armId}: ${error.message}`);
      }
    }
    return failures;
  }

  async function finalizeAttempt(item, receipt, report, evidenceDir) {
    const runnerConfigurationDigest = isPlainObject(receipt)
      ? receipt.configuration_digest
      : null;
    const enforcement = await item.hostHandle.finalize({
      receipt: receipt === null ? null : cloneData(receipt, 'receipt'),
      report: report === null ? null : cloneData(report, 'report'),
    });
    const expectedFields = [
      'appliedPolicyDigest',
      'armContextDigest',
      'commonContextDigest',
      'contained',
      'runnerConfigurationDigest',
    ];
    if (
      !isPlainObject(enforcement) ||
      !isDeepStrictEqual(Object.keys(enforcement).sort(compareText), expectedFields) ||
      enforcement.appliedPolicyDigest !== requiredHostPolicyDigest ||
      enforcement.contained !== true ||
      enforcement.runnerConfigurationDigest !== runnerConfigurationDigest ||
      enforcement.commonContextDigest !== commonContextDigest ||
      enforcement.armContextDigest !== item.armContextDigest
    ) {
      throw new EffectivenessExperimentError(
        'HOST_SANDBOX_UNAVAILABLE',
        `host sandbox could not prove containment for ${item.armId}`,
      );
    }
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { mode: 0o700 });
    if (
      !fs.lstatSync(evidenceDir).isDirectory() ||
      !pathIsWithin(fs.realpathSync(stagingRoot), fs.realpathSync(evidenceDir))
    ) {
      throw new EffectivenessExperimentError(
        'HOST_SANDBOX_UNAVAILABLE',
        `host sandbox receipt has no retained attempt directory for ${item.armId}`,
      );
    }
    const normalized = Object.fromEntries(
      expectedFields.map((field) => [field, enforcement[field]]),
    );
    const hostReceiptPath = path.join(evidenceDir, 'host-enforcement.json');
    atomicWriteJson(hostReceiptPath, normalized);
    return {
      receipt: normalized,
      reference: fileReference(hostReceiptPath),
    };
  }

  try {
    for (const armId of EFFECTIVENESS_ARM_IDS) {
      const armContext = {
        contract: 'forge-effectiveness-arm-launch-context',
        version: 1,
        definition: cloneData(armDefinitions[armId], 'arm definition'),
        definition_digest: experimentPlan.arms[armId].definition_digest,
        capability_policy: cloneData(
          experimentPlan.arms[armId].capability_policy,
          'capability policy',
        ),
      };
      const armContextDigest = digestJson(armContext);
      let launch;
      if (resolution.availability === 'available') {
        launch = await spec.modelProvider.createLaunch({
          armId,
          arm: cloneData(experimentPlan.arms[armId], 'arm plan'),
          armDefinition: cloneData(armDefinitions[armId], 'arm definition'),
          armContext: cloneData(armContext, 'arm context'),
          armContextDigest,
          commonContext: cloneData(commonContext, 'common context'),
          commonContextDigest,
          requestedModel: cloneData(spec.requestedModel, 'requestedModel'),
          selectedModel: cloneData(resolution.actual, 'selected model'),
          parameters: cloneData(modelParameters, 'modelParameters'),
        });
        if (
          !isPlainObject(launch) ||
          !isPlainObject(launch.command) ||
          !isPlainObject(launch.definition) ||
          typeof launch.observe !== 'function'
        ) {
          throw new EffectivenessExperimentError(
            'INVALID_PROVIDER_LAUNCH',
            `model provider returned an invalid launch for ${armId}`,
          );
        }
        try {
          canonicalValue(launch.definition);
        } catch (error) {
          throw new EffectivenessExperimentError(
            'INVALID_PROVIDER_LAUNCH',
            `model provider launch definition is not auditable for ${armId}: ${error.message}`,
            { cause: error },
          );
        }
        if (!isDeepStrictEqual(
          launch.capabilityPolicy,
          experimentPlan.arms[armId].capability_policy,
        )) {
          throw new EffectivenessExperimentError(
            'CAPABILITY_EXPOSURE_MISMATCH',
            `model provider did not configure the declared capability exposure for ${armId}`,
          );
        }
        if (launch.armDefinitionDigest !== experimentPlan.arms[armId].definition_digest) {
          throw new EffectivenessExperimentError(
            'ARM_DEFINITION_MISMATCH',
            `model provider did not configure the trusted arm definition for ${armId}`,
          );
        }
        if (armId === 'legacy-chain') {
          const legacyDefinition = manifestArmDefinitions['legacy-chain'];
          const expectedBaseline = {
            version: legacyDefinition.baseline_version,
            tree: legacyDefinition.baseline_tree,
            default_chain: legacyDefinition.default_chain,
          };
          if (!isDeepStrictEqual(launch.definition.legacy_baseline, expectedBaseline)) {
            throw new EffectivenessExperimentError(
              'LEGACY_BASELINE_MISMATCH',
              'legacy-chain launcher must attest the pinned pre-upgrade tree and default chain',
            );
          }
        }
      } else {
        launch = {
          command: {
            file: process.execPath,
            args: ['-e', ''],
            env: {},
            label: 'model availability record',
          },
          definition: { kind: 'unavailable-model-record' },
          async observe() {
            return unavailableObservation();
          },
        };
      }
      if (
        Object.hasOwn(launch.command, 'definitionDigest') ||
        Object.hasOwn(launch.command.env ?? {}, CONTROL_CONTEXT_ENV) ||
        Object.hasOwn(launch.command.env ?? {}, ARM_CONTEXT_ENV)
      ) {
        throw new EffectivenessExperimentError(
          'INVALID_PROVIDER_LAUNCH',
          'launcher digest and effectiveness context are scheduler-owned',
        );
      }
      let hostHandle;
      try {
        hostHandle = await spec.hostSandbox.prepareLaunch({
          command: cloneData(launch.command, 'provider command'),
          armId,
          armContext: cloneData(armContext, 'arm context'),
          armContextDigest,
          commonContext: cloneData(commonContext, 'common context'),
          commonContextDigest,
          requiredPolicyDigest: requiredHostPolicyDigest,
          limits: cloneData(spec.limits, 'limits'),
        });
      } catch (error) {
        throw new EffectivenessExperimentError(
          'HOST_SANDBOX_UNAVAILABLE',
          `host sandbox could not prepare ${armId}: ${error.message}`,
          { cause: error },
        );
      }
      const preparedItem = {
        armId,
        armContextDigest,
        hostHandle,
        hostDisposed: false,
      };
      if (typeof hostHandle?.dispose === 'function') prepared.push(preparedItem);
      if (
        !isPlainObject(hostHandle) ||
        !isPlainObject(hostHandle.command) ||
        hostHandle.appliedPolicyDigest !== requiredHostPolicyDigest ||
        typeof hostHandle.finalize !== 'function' ||
        typeof hostHandle.dispose !== 'function'
      ) {
        throw new EffectivenessExperimentError(
          'HOST_SANDBOX_UNAVAILABLE',
          `host sandbox policy or lifecycle receipt is invalid for ${armId}`,
        );
      }
      if (
        Object.hasOwn(hostHandle.command, 'definitionDigest') ||
        Object.hasOwn(hostHandle.command.env ?? {}, CONTROL_CONTEXT_ENV) ||
        Object.hasOwn(hostHandle.command.env ?? {}, ARM_CONTEXT_ENV)
      ) {
        throw new EffectivenessExperimentError(
          'HOST_SANDBOX_UNAVAILABLE',
          `host sandbox attempted to own scheduler context for ${armId}`,
        );
      }
      const definitionDigest = digestJson({
        contract: 'forge-effectiveness-launcher',
        version: 1,
        common_context_digest: commonContextDigest,
        arm_context_digest: armContextDigest,
        provider_definition_digest: providerDefinitionDigest,
        host_definition_digest: hostDefinitionDigest,
        host_policy_digest: requiredHostPolicyDigest,
        launch_definition: launch.definition,
      });
      const commandEnv = {
        ...(hostHandle.command.env ?? {}),
        [CONTROL_CONTEXT_ENV]: commonContextJson,
        [ARM_CONTEXT_ENV]: JSON.stringify(canonicalValue(armContext)),
      };
      Object.assign(preparedItem, {
        command: { ...hostHandle.command, env: commandEnv, definitionDigest },
        observe: launch.observe,
      });
    }
  } catch (error) {
    const cleanupFailures = await disposePrepared();
    if (cleanupFailures.length > 0) error.cleanupFailures = cleanupFailures;
    fs.rmSync(stagingRoot, { recursive: true, force: true });
    throw error;
  }

  const runs = [];
  try {
    for (const item of prepared) {
      let runtimeReceipt = null;
      const attemptEvidenceDir = path.join(stagingRoot, item.armId);
      let result;
      try {
        result = await runIsolatedEffectivenessAttempt({
          contractRoot: spec.rootDir,
          experimentPlan,
          armId: item.armId,
          attemptId: item.armId,
          source: cloneData(spec.source, 'source'),
          evidenceRoot: stagingRoot,
          command: item.command,
          limits: cloneData(spec.limits, 'limits'),
          verifierRuntime: spec.verifierRuntime,
          verifierSet: cloneData(spec.verifierSet, 'verifierSet'),
          objective: {
            id: spec.objective.id,
            digest: spec.objective.digest,
          },
          ...(spec.signal === undefined ? {} : { signal: spec.signal }),
          async buildReportInput(receipt, retainedEvidence) {
            if (resolution.availability === 'available') {
              runtimeReceipt = readRuntimeReceipt({
                evidenceDir: attemptEvidenceDir,
                retainedEvidence,
                armId: item.armId,
                expected: {
                  commonContextDigest,
                  armDefinitionDigest: experimentPlan.arms[item.armId].definition_digest,
                  capabilityPolicyDigest: experimentPlan.arms[item.armId].capability_policy.digest,
                },
              });
            }
            const observed = await item.observe(
              cloneData(receipt, 'receipt'),
              cloneData(retainedEvidence, 'retained evidence'),
            );
            return controlledReportInput(
              trustedSpec,
              item.armId,
              resolution,
              parametersDigest,
              runtimeReceipt,
              observed,
            );
          },
        });
      } catch (attemptError) {
        try {
          await finalizeAttempt(
            item,
            isPlainObject(attemptError?.receipt) ? attemptError.receipt : null,
            null,
            attemptEvidenceDir,
          );
        } catch (finalizeError) {
          finalizeError.attemptError = attemptError;
          throw finalizeError;
        }
        throw attemptError;
      }
      const finalized = await finalizeAttempt(
        item,
        result.receipt,
        result.report,
        result.evidenceDir,
      );
      result.hostEnforcement = cloneData(finalized.receipt, 'host enforcement receipt');
      result.hostEnforcementReference = finalized.reference;
      if (resolution.availability === 'available') {
        if (runtimeReceipt === null) {
          throw new EffectivenessExperimentError(
            'INVALID_RUNTIME_RECEIPT',
            `runtime receipt was not retained for ${item.armId}`,
          );
        }
        runtimeReceipt.runner_configuration_digest = result.receipt.configuration_digest;
        const runtimeReceiptPath = path.join(result.evidenceDir, 'runtime-receipt.json');
        atomicWriteJson(runtimeReceiptPath, runtimeReceipt);
        result.runtimeReceipt = cloneData(runtimeReceipt, 'runtime receipt');
        result.runtimeReceiptReference = fileReference(runtimeReceiptPath);
        if (!isDeepStrictEqual(runtimeReceipt.actual_model, resolution.actual)) {
          throw new EffectivenessExperimentError(
            'RUNTIME_MODEL_FALLBACK',
            `runtime model identity differs from the resolved model for ${item.armId}`,
          );
        }
      }
      runs.push(result);
    }

    const issues = comparisonIssues(runs, trustedSpec);
    if (issues.length > 0) {
      throw new EffectivenessExperimentError(
        'COMPARISON_NOT_CONTROLLED',
        `comparison group is not controlled: ${issues.join(', ')}`,
      );
    }
    const seal = {
      contract: 'forge-effectiveness-comparison-group',
      version: 3,
      comparison_group_id: spec.comparisonGroupId,
      common_context_digest: commonContextDigest,
      host_policy_digest: requiredHostPolicyDigest,
      reports: runs.map((run) => ({
        arm: run.report.experiment.arm.id,
        report_id: run.report.report_id,
        digest: digestJson(run.report),
        ...(run.runtimeReceiptReference === undefined
          ? {}
          : { runtime_receipt: run.runtimeReceiptReference }),
        host_enforcement: run.hostEnforcementReference,
      })),
    };
    const cleanupFailures = await disposePrepared();
    if (cleanupFailures.length > 0) {
      throw new EffectivenessExperimentError(
        'HOST_SANDBOX_UNAVAILABLE',
        `host sandbox cleanup failed: ${cleanupFailures.join('; ')}`,
      );
    }
    for (const run of runs) {
      if (!hasValidEvidenceEnvelopes(run.report, run.evidenceDir, spec.rootDir, {
        requireVerifiers: true,
      })) {
        throw new EffectivenessExperimentError(
          'INVALID_EVIDENCE_ENVELOPE',
          `comparison group has invalid retained Evidence Envelopes for ${run.report.experiment.arm.id}`,
        );
      }
    }
    const sealPathInStaging = path.join(stagingRoot, 'group.json');
    atomicWriteJson(sealPathInStaging, seal);
    if (!hasValidGroupSeal(stagingRoot, spec.comparisonGroupId, spec.rootDir, experimentPlan)) {
      fs.rmSync(sealPathInStaging, { force: true });
      throw new EffectivenessExperimentError(
        'INVALID_GROUP_SEAL',
        `comparison group failed final retained-evidence validation: ${spec.comparisonGroupId}`,
      );
    }
    fs.renameSync(stagingRoot, finalGroupDir);
    for (const run of runs) {
      run.evidenceDir = path.join(finalGroupDir, run.report.experiment.arm.id);
    }
    const finalSealPath = path.join(finalGroupDir, 'group.json');
    return {
      experimentPlan: cloneData(experimentPlan, 'experimentPlan'),
      model: cloneData(runs[0].report.experiment.model, 'model condition'),
      commonContext: cloneData(commonContext, 'common context'),
      groupDir: finalGroupDir,
      sealPath: finalSealPath,
      runs,
    };
  } catch (caught) {
    const error = caught instanceof EffectivenessExperimentError
      ? caught
      : new EffectivenessExperimentError(
          'GROUP_EXECUTION_FAILED',
          `comparison group execution failed: ${caught.message}`,
          { cause: caught },
        );
    const cleanupFailures = await disposePrepared();
    if (cleanupFailures.length > 0) error.cleanupFailures = cleanupFailures;
    error.runs = runs;
    const failedGroupDir = fs.existsSync(stagingRoot)
      ? stagingRoot
      : (fs.existsSync(finalGroupDir) ? finalGroupDir : null);
    if (failedGroupDir !== null) {
      fs.rmSync(path.join(failedGroupDir, 'group.json'), { force: true });
      const incompleteGroupDir = path.join(
        spec.evidenceRoot,
        `${spec.comparisonGroupId}.incomplete-${stagingSuffix}`,
      );
      fs.renameSync(failedGroupDir, incompleteGroupDir);
      error.incompleteGroupDir = incompleteGroupDir;
      for (const run of runs) {
        run.evidenceDir = path.join(incompleteGroupDir, run.report.experiment.arm.id);
      }
    }
    throw error;
  }
}
