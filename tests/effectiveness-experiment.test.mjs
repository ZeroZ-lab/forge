import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  EFFECTIVENESS_ARM_IDS,
  EffectivenessExperimentError,
  createEffectivenessExperimentPlan,
  runEffectivenessComparisonGroup,
} from '../scripts/lib/effectiveness-experiment.mjs';

const root = path.resolve(import.meta.dirname, '..');
const DIGESTS = {
  objective: `sha256:${'1'.repeat(64)}`,
  fixture: `sha256:${'2'.repeat(64)}`,
  budget: `sha256:${'3'.repeat(64)}`,
  verifier: `sha256:${'4'.repeat(64)}`,
};

function git(cwd, args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}

function createSource(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-effectiveness-experiment-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  const sourceDir = path.join(tempRoot, 'source');
  const evidenceRoot = path.join(tempRoot, 'evidence');
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'package.json'), '{"name":"fixture","version":"1.0.0"}\n');
  git(sourceDir, ['init', '-q']);
  git(sourceDir, ['config', 'user.name', 'Forge Test']);
  git(sourceDir, ['config', 'user.email', 'forge@example.invalid']);
  git(sourceDir, ['add', '-A']);
  git(sourceDir, ['commit', '-qm', 'fixture baseline']);
  return { sourceDir, evidenceRoot };
}

function hostSandbox(overrides = {}) {
  return {
    id: 'fixture-host-sandbox',
    version: '1',
    guarantees: [
      'filesystem_isolation',
      'network_policy',
      'process_tree_containment',
      'live_cpu_limit',
      'live_memory_limit',
      'live_disk_limit',
    ],
    definition: { implementation: 'test-double', production: false },
    async prepareLaunch({ command }) {
      return command;
    },
    ...overrides,
  };
}

function observedResult() {
  return {
    events: [
      {
        id: 'event-model-output',
        sequence: 0,
        type: 'message',
        actor: 'model',
        observed_at: '2026-07-15T00:00:00.000Z',
        status: 'observed',
        summary: 'Returned a deterministic fixture result.',
        details_ref: 'events.jsonl#event-model-output',
        evidence_refs: ['evidence-model-output'],
      },
    ],
    evidence: [
      {
        id: 'evidence-model-output',
        source_kind: 'model_self_report',
        locator: 'events.jsonl#event-model-output',
        digest: `sha256:${'5'.repeat(64)}`,
        producer_ref: 'model:fixture-model',
        event_id: 'event-model-output',
        objective_ref: 'read-package-version',
      },
    ],
    final_result: {
      submission_status: 'submitted',
      final_output_ref: 'evidence-model-output',
      artifact_refs: [],
      verifier_result_refs: [],
      model_claim: { state: 'completed', evidence_ref: 'evidence-model-output' },
    },
    costs: [
      {
        metric: 'turns',
        value: 1,
        unit: 'count',
        acquisition: {
          kind: 'tool',
          source_ref: 'launcher:model-events',
          quality: 'observed',
        },
      },
    ],
  };
}

function modelProvider(resolveResult = {
  availability: 'available',
  actual: { provider: 'fixture-provider', id: 'fixture-model', revision: 'r1' },
}) {
  return {
    id: 'fixture-provider-adapter',
    version: '1',
    definition: { executable: process.execPath, protocol: 'fixture-v1' },
    async resolve() {
      return resolveResult;
    },
    async createLaunch({ arm, armDefinition }) {
      return {
        command: {
          file: process.execPath,
          args: ['-e', 'process.stdout.write("fixture\\n")'],
          env: {},
          label: 'fixture model process',
        },
        armDefinitionDigest: arm.definition_digest,
        capabilityPolicy: arm.capability_policy,
        definition: {
          script: 'deterministic-fixture-v1',
          ...(armDefinition.baseline_tree
            ? {
                legacy_baseline: {
                  version: armDefinition.baseline_version,
                  tree: armDefinition.baseline_tree,
                  default_chain: armDefinition.default_chain,
                },
              }
            : {}),
        },
        async observe() {
          return observedResult();
        },
      };
    },
  };
}

function groupSpec(t, overrides = {}) {
  const { sourceDir, evidenceRoot } = createSource(t);
  return {
    rootDir: root,
    experimentPlan: createEffectivenessExperimentPlan({ rootDir: root }),
    comparisonGroupId: 'direct-read-package-version.fixture-model.0',
    objective: {
      id: 'read-package-version',
      source_ref: 'fixture://objective',
      digest: DIGESTS.objective,
    },
    fixture: {
      id: 'direct-read-package-version',
      source_ref: 'fixture://direct-read-package-version',
      digest: DIGESTS.fixture,
    },
    source: { dir: sourceDir, ref: 'fixture://direct-read-package-version' },
    evidenceRoot,
    repeatIndex: 0,
    seed: 7,
    budget: { id: 'fixture-budget', digest: DIGESTS.budget },
    verifierSet: { id: 'fixture-verifiers', digest: DIGESTS.verifier },
    limits: {
      timeoutMs: 3_000,
      maxStdoutBytes: 64 * 1024,
      maxStderrBytes: 64 * 1024,
      maxCapturedWorkspaceBytes: 8 * 1024 * 1024,
      maxCapturedWorkspaceEntries: 1_000,
      maxDiffBytes: 2 * 1024 * 1024,
      gitOperationTimeoutMs: 5_000,
      killGraceMs: 50,
    },
    requestedModel: { provider: 'fixture-provider', id: 'fixture-model', revision: 'r1' },
    modelParameters: { temperature: 0 },
    modelProvider: modelProvider(),
    hostSandbox: hostSandbox(),
    ...overrides,
  };
}

test('trusted plan exposes four exact and mutually exclusive Forge arm policies', () => {
  const plan = createEffectivenessExperimentPlan({ rootDir: root });
  assert.deepEqual(Object.keys(plan.arms), EFFECTIVENESS_ARM_IDS);

  const noForge = plan.arms['no-forge'].capability_policy.exposed;
  const kernelOnly = plan.arms['kernel-only'].capability_policy.exposed;
  const adaptive = plan.arms['adaptive-full'].capability_policy.exposed;
  const legacy = plan.arms['legacy-chain'].capability_policy.exposed;

  assert.deepEqual(noForge, []);
  assert.deepEqual(kernelOnly, [{ kind: 'other', id: 'forge:kernel', version: '1' }]);
  assert.ok(adaptive.some((item) => item.id === 'forge:kernel'));
  assert.ok(adaptive.some((item) => item.kind === 'skill' && item.id === 'forge:detail'));
  assert.deepEqual(legacy, [{ kind: 'other', id: 'forge:legacy-chain', version: '0.52.0' }]);
  assert.equal(new Set(Object.values(plan.arms).map((arm) => arm.definition_digest)).size, 4);
  assert.equal(new Set(Object.values(plan.arms).map((arm) => arm.capability_policy.id)).size, 4);
});

test('provider cannot launch with capability exposure that differs from the trusted arm', async (t) => {
  const provider = modelProvider();
  const originalCreateLaunch = provider.createLaunch;
  provider.createLaunch = async (context) => {
    const launch = await originalCreateLaunch(context);
    if (context.armId === 'kernel-only') launch.capabilityPolicy = { ...launch.capabilityPolicy, exposed: [] };
    return launch;
  };
  await assert.rejects(
    () => runEffectivenessComparisonGroup(groupSpec(t, { modelProvider: provider })),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'CAPABILITY_EXPOSURE_MISMATCH' &&
      /kernel-only/.test(error.message),
  );
});

test('legacy launch must attest the pinned pre-upgrade tree and default chain', async (t) => {
  const provider = modelProvider();
  const originalCreateLaunch = provider.createLaunch;
  provider.createLaunch = async (context) => {
    const launch = await originalCreateLaunch(context);
    if (context.armId === 'legacy-chain') delete launch.definition.legacy_baseline;
    return launch;
  };
  await assert.rejects(
    () => runEffectivenessComparisonGroup(groupSpec(t, { modelProvider: provider })),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'LEGACY_BASELINE_MISMATCH',
  );
});

test('one minimal fixture runs all four arms with identical controls and declared exposure', async (t) => {
  const result = await runEffectivenessComparisonGroup(groupSpec(t));
  assert.deepEqual(result.runs.map((run) => run.report.experiment.arm.id), EFFECTIVENESS_ARM_IDS);
  assert.equal(new Set(result.runs.map((run) => run.report.experiment.workspace.isolation_id)).size, 4);

  for (const run of result.runs) {
    const armId = run.report.experiment.arm.id;
    assert.deepEqual(
      run.report.experiment.capability_policy,
      result.experimentPlan.arms[armId].capability_policy,
    );
    assert.deepEqual(run.report.experiment.model.requested, {
      provider: 'fixture-provider', id: 'fixture-model', revision: 'r1',
    });
    assert.deepEqual(run.report.experiment.model.actual, run.report.experiment.model.requested);
    assert.deepEqual(run.report.experiment.budget, { id: 'fixture-budget', digest: DIGESTS.budget });
    assert.deepEqual(run.report.experiment.verifier_set, { id: 'fixture-verifiers', digest: DIGESTS.verifier });
  }

  const adaptive = result.runs.find((run) => run.report.experiment.arm.id === 'adaptive-full');
  assert.equal(adaptive.report.events.some((event) => event.type === 'capability_activation'), false);
});

test('explicit model mismatch is rejected as unavailable without launching a fallback', async (t) => {
  let launches = 0;
  const provider = modelProvider({
    availability: 'available',
    actual: { provider: 'fixture-provider', id: 'fallback-model', revision: 'r2' },
  });
  const originalCreateLaunch = provider.createLaunch;
  provider.createLaunch = async (...args) => {
    launches += 1;
    return originalCreateLaunch(...args);
  };

  const result = await runEffectivenessComparisonGroup(groupSpec(t, { modelProvider: provider }));
  assert.equal(launches, 0);
  for (const run of result.runs) {
    assert.equal(run.report.experiment.model.availability, 'unavailable');
    assert.equal(Object.hasOwn(run.report.experiment.model, 'actual'), false);
    assert.match(run.report.experiment.model.unavailable_reason, /fallback.*rejected/i);
    assert.equal(run.report.final_result.submission_status, 'no_output');
  }
});

test('unavailable model reason is retained in all four reports', async (t) => {
  const provider = modelProvider({ availability: 'unavailable', reason: 'model access not configured' });
  const result = await runEffectivenessComparisonGroup(groupSpec(t, { modelProvider: provider }));
  assert.equal(result.runs.length, 4);
  for (const run of result.runs) {
    assert.deepEqual(run.report.experiment.model, {
      requested: { provider: 'fixture-provider', id: 'fixture-model', revision: 'r1' },
      availability: 'unavailable',
      unavailable_reason: 'model access not configured',
      parameters_digest: run.report.experiment.model.parameters_digest,
    });
  }
});

test('comparison fails closed before launch without a complete host sandbox boundary', async (t) => {
  let prepared = false;
  const incomplete = hostSandbox({
    guarantees: ['filesystem_isolation'],
    async prepareLaunch() {
      prepared = true;
      throw new Error('must not be reached');
    },
  });
  await assert.rejects(
    () => runEffectivenessComparisonGroup(groupSpec(t, { hostSandbox: incomplete })),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'HOST_SANDBOX_UNAVAILABLE' &&
      /network_policy/.test(error.message),
  );
  assert.equal(prepared, false);
});

test('comparison group rejects a run whose controlled dimension drifts', async (t) => {
  const base = groupSpec(t);
  let invocation = 0;
  const runAttempt = async (spec) => {
    const { runIsolatedEffectivenessAttempt } = await import('../scripts/lib/effectiveness-runner.mjs');
    const result = await runIsolatedEffectivenessAttempt(spec);
    invocation += 1;
    if (invocation === 4) result.receipt.execution.limits.timeoutMs += 1;
    return result;
  };
  await assert.rejects(
    () => runEffectivenessComparisonGroup({ ...base, runAttempt }),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'COMPARISON_NOT_CONTROLLED' &&
      /limits/.test(error.message),
  );
});
