import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { loadEffectivenessContract } from './effectiveness-contract.mjs';
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

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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

function digestDirectory(rootDir) {
  const hash = crypto.createHash('sha256');
  function visit(directory, relativeDirectory = '') {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
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
        typeof capability.kind !== 'string' ||
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
    .sort((left, right) => capabilityKey(left).localeCompare(capabilityKey(right)));
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
    !isPlainObject(hostSandbox.definition)
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

function controlledReportInput(spec, armId, condition, parametersDigest, observed) {
  assertObservedResult(observed);
  return {
    experiment: {
      comparison_group_id: spec.comparisonGroupId,
      objective: cloneData(spec.objective, 'objective'),
      arm: { id: armId },
      model: modelCondition(spec.requestedModel, condition, parametersDigest),
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
  if (!Number.isInteger(spec.repeatIndex) || spec.repeatIndex < 0) {
    throw new EffectivenessExperimentError('INVALID_EXPERIMENT', 'repeatIndex must be a non-negative integer');
  }
  if (typeof spec.comparisonGroupId !== 'string' || spec.comparisonGroupId.length === 0) {
    throw new EffectivenessExperimentError('INVALID_EXPERIMENT', 'comparisonGroupId is required');
  }
  const modelParameters = spec.modelParameters ?? {};
  const parametersDigest = digestJson({
    contract: 'forge-effectiveness-model-parameters',
    version: 1,
    parameters: modelParameters,
  });
  const resolution = await resolveModel(spec.modelProvider, spec.requestedModel, modelParameters);
  const hostDefinitionDigest = digestJson({
    contract: 'forge-effectiveness-host-sandbox',
    version: 1,
    id: spec.hostSandbox.id,
    adapter_version: spec.hostSandbox.version,
    guarantees: [...spec.hostSandbox.guarantees].sort(),
    definition: spec.hostSandbox.definition,
  });
  const providerDefinitionDigest = digestJson({
    contract: 'forge-effectiveness-model-provider',
    version: 1,
    id: spec.modelProvider.id,
    adapter_version: spec.modelProvider.version,
    definition: spec.modelProvider.definition,
  });

  const prepared = [];
  for (const armId of EFFECTIVENESS_ARM_IDS) {
    let launch;
    if (resolution.availability === 'available') {
      launch = await spec.modelProvider.createLaunch({
        armId,
        arm: cloneData(experimentPlan.arms[armId], 'arm plan'),
        armDefinition: cloneData(armDefinitions[armId], 'arm definition'),
        requestedModel: cloneData(spec.requestedModel, 'requestedModel'),
        actualModel: cloneData(resolution.actual, 'actual model'),
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
    if (Object.hasOwn(launch.command, 'definitionDigest')) {
      throw new EffectivenessExperimentError(
        'INVALID_PROVIDER_LAUNCH',
        'launcher definitionDigest is scheduler-owned',
      );
    }
    let sandboxedCommand;
    try {
      sandboxedCommand = await spec.hostSandbox.prepareLaunch({
        command: cloneData(launch.command, 'provider command'),
        armId,
        capabilityPolicy: cloneData(
          experimentPlan.arms[armId].capability_policy,
          'capability policy',
        ),
        limits: cloneData(spec.limits, 'limits'),
      });
    } catch (error) {
      throw new EffectivenessExperimentError(
        'HOST_SANDBOX_UNAVAILABLE',
        `host sandbox could not prepare ${armId}: ${error.message}`,
        { cause: error },
      );
    }
    if (!isPlainObject(sandboxedCommand) || Object.hasOwn(sandboxedCommand, 'definitionDigest')) {
      throw new EffectivenessExperimentError(
        'HOST_SANDBOX_UNAVAILABLE',
        `host sandbox returned an invalid command for ${armId}`,
      );
    }
    const definitionDigest = digestJson({
      contract: 'forge-effectiveness-launcher',
      version: 1,
      arm_definition_digest: experimentPlan.arms[armId].definition_digest,
      capability_policy_digest: experimentPlan.arms[armId].capability_policy.digest,
      requested_model: spec.requestedModel,
      model_parameters_digest: parametersDigest,
      provider_definition_digest: providerDefinitionDigest,
      host_definition_digest: hostDefinitionDigest,
      launch_definition: launch.definition,
    });
    prepared.push({
      armId,
      command: { ...sandboxedCommand, definitionDigest },
      observe: launch.observe,
    });
  }

  const runAttempt = spec.runAttempt ?? runIsolatedEffectivenessAttempt;
  if (typeof runAttempt !== 'function') {
    throw new EffectivenessExperimentError('INVALID_EXPERIMENT', 'runAttempt must be a function');
  }
  const runs = [];
  for (const item of prepared) {
    const result = await runAttempt({
      contractRoot: spec.rootDir,
      experimentPlan,
      armId: item.armId,
      attemptId: `${spec.comparisonGroupId}.${item.armId}`,
      source: cloneData(spec.source, 'source'),
      evidenceRoot: spec.evidenceRoot,
      command: item.command,
      limits: cloneData(spec.limits, 'limits'),
      ...(spec.signal === undefined ? {} : { signal: spec.signal }),
      async buildReportInput(receipt, retainedEvidence) {
        const observed = await item.observe(
          cloneData(receipt, 'receipt'),
          cloneData(retainedEvidence, 'retained evidence'),
        );
        return controlledReportInput(trustedSpec, item.armId, resolution, parametersDigest, observed);
      },
    });
    runs.push(result);
  }

  const issues = comparisonIssues(runs, trustedSpec);
  if (issues.length > 0) {
    throw new EffectivenessExperimentError(
      'COMPARISON_NOT_CONTROLLED',
      `comparison group is not controlled: ${issues.join(', ')}`,
    );
  }
  return {
    experimentPlan: cloneData(experimentPlan, 'experimentPlan'),
    model: modelCondition(spec.requestedModel, resolution, parametersDigest),
    runs,
  };
}
