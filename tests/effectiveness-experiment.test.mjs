import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
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
import {
  createDiffVerifierAdapter,
  createEffectivenessVerifierRuntime,
} from '../scripts/lib/effectiveness-verifier.mjs';
import { createEvidenceEnvelope } from '../scripts/lib/evidence-envelope.mjs';

const root = path.resolve(import.meta.dirname, '..');
const DIGESTS = {
  objective: `sha256:${'1'.repeat(64)}`,
  fixture: `sha256:${'2'.repeat(64)}`,
  budget: `sha256:${'3'.repeat(64)}`,
  verifier: `sha256:${'4'.repeat(64)}`,
};
const VERIFIER_HOST_GUARANTEES = [
  'cancellation', 'cpu-limit', 'disk-limit', 'memory-limit',
  'network-isolation', 'non-blocking-bridge', 'output-bound',
  'process-tree-cleanup', 'read-only-evidence', 'secret-isolation',
  'timeout', 'workspace-isolation',
];

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]),
  );
}

function digestJson(value) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonicalValue(value))).digest('hex')}`;
}

function digestBuffer(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

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
    resourcePolicy: { cpu: 'fixture-limit', memory: 'fixture-limit', network: 'disabled' },
    async prepareLaunch({
      command,
      requiredPolicyDigest,
      commonContextDigest,
      armContextDigest,
    }) {
      return {
        command,
        appliedPolicyDigest: requiredPolicyDigest,
        async finalize({ receipt }) {
          return {
            appliedPolicyDigest: requiredPolicyDigest,
            contained: true,
            runnerConfigurationDigest: receipt?.configuration_digest ?? null,
            commonContextDigest,
            armContextDigest,
          };
        },
        async dispose() {},
      };
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
    async createLaunch({
      arm,
      armDefinition,
      armContextDigest,
      commonContextDigest,
      selectedModel,
    }) {
      const runtimeReceipt = {
        contract: 'forge-effectiveness-runtime-transport',
        version: 1,
        actual_model: selectedModel,
        common_context_digest: commonContextDigest,
        arm_definition_digest: arm.definition_digest,
        capability_policy_digest: arm.capability_policy.digest,
      };
      return {
        command: {
          file: process.execPath,
          args: [
            '-e',
            'JSON.parse(process.env.FORGE_EFFECTIVENESS_COMMON_CONTEXT);JSON.parse(process.env.FORGE_EFFECTIVENESS_ARM_CONTEXT);process.stdout.write("fixture\\nFORGE_EFFECTIVENESS_RUNTIME_RECEIPT "+process.env.FIXTURE_RUNTIME_RECEIPT+"\\n")',
          ],
          env: { FIXTURE_RUNTIME_RECEIPT: JSON.stringify(runtimeReceipt) },
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

function verifierRuntime() {
  return createEffectivenessVerifierRuntime({
    id: 'fixture-verifiers',
    executor: {
      id: 'fixture-verifier-host',
      version: '1',
      definition: {
        boundary: 'test-double',
        guarantees: VERIFIER_HOST_GUARANTEES,
      },
      async execute({ adapter, target, artifacts }) {
        assert.equal(adapter.kind, 'diff');
        assert.match(target.workspace.diff_digest, /^sha256:/);
        assert.equal(artifacts.captured_diff.digest, target.workspace.diff_digest);
        assert.equal(fs.lstatSync(artifacts.captured_diff.path).isFile(), true);
        assert.equal(artifacts.base_snapshot.digest, target.workspace.base_snapshot_digest);
        return { kind: 'diff', status: 'passed' };
      },
      async cancel({ runId }) {
        return { run_id: runId, status: 'cancelled' };
      },
    },
    adapters: [
      createDiffVerifierAdapter({
        id: 'workspace-diff',
        scope: { kind: 'diff', paths: ['*'] },
        policy: { mode: 'captured-diff' },
      }),
    ],
  });
}

function verifierRuntimeWithFailure() {
  const adapters = [
    createDiffVerifierAdapter({
      id: 'diff-pass',
      scope: { kind: 'diff', paths: ['*'] },
      policy: { mode: 'captured-diff' },
    }),
    createDiffVerifierAdapter({
      id: 'diff-fail',
      scope: { kind: 'diff', paths: ['*'] },
      policy: { mode: 'captured-diff' },
    }),
  ];
  return createEffectivenessVerifierRuntime({
    id: 'fixture-multi-verifiers',
    executor: {
      id: 'fixture-verifier-host',
      version: '1',
      definition: { boundary: 'test-double', guarantees: VERIFIER_HOST_GUARANTEES },
      async execute({ adapter }) {
        return {
          kind: 'diff',
          status: adapter.id === 'diff-fail' ? 'failed' : 'passed',
        };
      },
      async cancel({ runId }) {
        return { run_id: runId, status: 'cancelled' };
      },
    },
    adapters,
  });
}

function groupSpec(t, overrides = {}) {
  const { sourceDir, evidenceRoot } = createSource(t);
  const runtime = verifierRuntime();
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
    verifierSet: runtime.verifierSet,
    verifierRuntime: runtime,
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
  const provider = modelProvider();
  const originalCreateLaunch = provider.createLaunch;
  const commonContexts = [];
  provider.createLaunch = async (context) => {
    commonContexts.push(context.commonContext);
    return originalCreateLaunch(context);
  };
  const spec = groupSpec(t, { modelProvider: provider });
  const result = await runEffectivenessComparisonGroup(spec);
  assert.deepEqual(result.runs.map((run) => run.report.experiment.arm.id), EFFECTIVENESS_ARM_IDS);
  assert.equal(new Set(result.runs.map((run) => run.report.experiment.workspace.isolation_id)).size, 4);
  assert.equal(fs.existsSync(result.sealPath), true);
  assert.equal(path.dirname(result.sealPath), result.groupDir);
  assert.equal(new Set(commonContexts.map((context) => JSON.stringify(context))).size, 1);
  assert.deepEqual(commonContexts[0].budget, { id: 'fixture-budget', digest: DIGESTS.budget });
  assert.deepEqual(commonContexts[0].verifier_set, spec.verifierSet);

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
    assert.deepEqual(run.report.experiment.verifier_set, spec.verifierSet);
    assert.equal(fs.existsSync(path.join(run.evidenceDir, 'runtime-receipt.json')), true);
    assert.equal(fs.existsSync(path.join(run.evidenceDir, 'host-enforcement.json')), true);
  }

  const seal = JSON.parse(fs.readFileSync(result.sealPath, 'utf8'));
  assert.equal(seal.version, 3);
  assert.equal(seal.reports.length, 4);
  assert.equal(seal.reports.every((entry) => entry.runtime_receipt && entry.host_enforcement), true);

  const adaptive = result.runs.find((run) => run.report.experiment.arm.id === 'adaptive-full');
  assert.equal(adaptive.report.events.some((event) => event.type === 'capability_activation'), false);

  await assert.rejects(
    () => runEffectivenessComparisonGroup(spec),
    (error) => error instanceof EffectivenessExperimentError && error.code === 'EVIDENCE_COLLISION',
  );
  fs.rmSync(path.join(result.groupDir, 'no-forge', 'host-enforcement.json'));
  const replacement = await runEffectivenessComparisonGroup(spec);
  assert.equal(fs.existsSync(replacement.sealPath), true);
  assert.equal(
    fs.readdirSync(spec.evidenceRoot)
      .some((name) => name.startsWith(`${spec.comparisonGroupId}.incomplete-recovered-`)),
    true,
  );
});

test('a tampered Evidence Envelope invalidates the group seal without rewriting the report', async (t) => {
  const spec = groupSpec(t);
  const first = await runEffectivenessComparisonGroup(spec);
  const run = first.runs[0];
  const reportPath = path.join(run.evidenceDir, 'report.json');
  const sealedReport = fs.readFileSync(reportPath);
  const envelopeRef = run.report.evidence
    .find((evidence) => evidence.producer_ref.startsWith('runner:'))
    .envelope_ref;
  const envelopePath = path.join(run.evidenceDir, envelopeRef);
  const envelope = JSON.parse(fs.readFileSync(envelopePath, 'utf8'));
  envelope.issuer_ref = 'runner:tampered';
  fs.writeFileSync(envelopePath, `${JSON.stringify(envelope, null, 2)}\n`);

  const replacement = await runEffectivenessComparisonGroup(spec);
  assert.equal(fs.existsSync(replacement.sealPath), true);
  const recoveredName = fs.readdirSync(spec.evidenceRoot)
    .find((name) => name.startsWith(`${spec.comparisonGroupId}.incomplete-recovered-`));
  assert.equal(typeof recoveredName, 'string');
  assert.deepEqual(
    fs.readFileSync(path.join(spec.evidenceRoot, recoveredName, 'no-forge', 'report.json')),
    sealedReport,
  );
});

test('a verifier failure cannot be rewritten as success under a refreshed report digest', async (t) => {
  const spec = groupSpec(t);
  const first = await runEffectivenessComparisonGroup(spec);
  const run = first.runs[0];
  const reportPath = path.join(run.evidenceDir, 'report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const verifierEvent = report.events.find((event) => event.actor === 'verifier');
  assert.equal(verifierEvent.status, 'succeeded');
  verifierEvent.status = 'failed';
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const seal = JSON.parse(fs.readFileSync(first.sealPath, 'utf8'));
  const sealedReport = seal.reports.find((entry) => entry.arm === run.report.experiment.arm.id);
  sealedReport.digest = digestJson(report);
  fs.writeFileSync(first.sealPath, `${JSON.stringify(seal, null, 2)}\n`);

  const replacement = await runEffectivenessComparisonGroup(spec);
  assert.equal(fs.existsSync(replacement.sealPath), true);
  assert.equal(
    fs.readdirSync(spec.evidenceRoot)
      .some((name) => name.startsWith(`${spec.comparisonGroupId}.incomplete-recovered-`)),
    true,
  );
});

test('a verifier result cannot outlive its retained host observation', async (t) => {
  const spec = groupSpec(t);
  const first = await runEffectivenessComparisonGroup(spec);
  const run = first.runs[0];
  const verifierEvidence = run.report.evidence.find(
    (evidence) => evidence.source_kind === 'independent_verifier',
  );
  const verifierResult = JSON.parse(
    fs.readFileSync(path.join(run.evidenceDir, verifierEvidence.locator), 'utf8'),
  );
  const observationPath = path.join(
    run.evidenceDir,
    verifierResult.evidence_refs[0].ref,
  );
  fs.appendFileSync(observationPath, '\n');

  const replacement = await runEffectivenessComparisonGroup(spec);
  assert.equal(fs.existsSync(replacement.sealPath), true);
  assert.equal(
    fs.readdirSync(spec.evidenceRoot)
      .some((name) => name.startsWith(`${spec.comparisonGroupId}.incomplete-recovered-`)),
    true,
  );
});

test('seal v3 rejects a passed result backed by a failed host observation', async (t) => {
  const spec = groupSpec(t);
  const first = await runEffectivenessComparisonGroup(spec);
  const run = first.runs[0];
  const reportPath = path.join(run.evidenceDir, 'report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const verifierEvidence = report.evidence.find(
    (evidence) => evidence.source_kind === 'independent_verifier',
  );
  const resultPath = path.join(run.evidenceDir, verifierEvidence.locator);
  const verifierResult = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  assert.equal(verifierResult.outcome, 'passed');
  const observationReference = verifierResult.evidence_refs[0];
  const observationPath = path.join(run.evidenceDir, observationReference.ref);
  const observation = JSON.parse(fs.readFileSync(observationPath, 'utf8'));
  observation.observation.status = 'failed';
  const observationBytes = Buffer.from(JSON.stringify(observation));
  fs.writeFileSync(observationPath, observationBytes);
  observationReference.digest = digestBuffer(observationBytes);
  observationReference.bytes = observationBytes.length;

  const resultBytes = Buffer.from(JSON.stringify(verifierResult));
  fs.writeFileSync(resultPath, resultBytes);
  verifierEvidence.digest = digestBuffer(resultBytes);

  const oldEnvelopePath = path.join(run.evidenceDir, verifierEvidence.envelope_ref);
  const oldEnvelope = JSON.parse(fs.readFileSync(oldEnvelopePath, 'utf8'));
  const {
    schema_version: _schemaVersion,
    contract: _contract,
    envelope_id: _envelopeId,
    content_digest: _contentDigest,
    ...envelopeInput
  } = oldEnvelope;
  envelopeInput.evidence.digest = verifierEvidence.digest;
  envelopeInput.evidence.bytes = resultBytes.length;
  envelopeInput.evidence.result.claim_digest = verifierEvidence.digest;
  const replacementEnvelope = createEvidenceEnvelope(envelopeInput, { rootDir: root });
  const replacementEnvelopeRef =
    `${replacementEnvelope.content_digest.slice('sha256:'.length)}.evidence-envelope.json`;
  fs.writeFileSync(
    path.join(run.evidenceDir, replacementEnvelopeRef),
    `${JSON.stringify(replacementEnvelope, null, 2)}\n`,
  );
  fs.rmSync(oldEnvelopePath);
  verifierEvidence.envelope_ref = replacementEnvelopeRef;
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const seal = JSON.parse(fs.readFileSync(first.sealPath, 'utf8'));
  seal.reports.find((entry) => entry.arm === run.report.experiment.arm.id).digest =
    digestJson(report);
  fs.writeFileSync(first.sealPath, `${JSON.stringify(seal, null, 2)}\n`);

  const replacement = await runEffectivenessComparisonGroup(spec);
  assert.equal(fs.existsSync(replacement.sealPath), true);
  assert.equal(
    fs.readdirSync(spec.evidenceRoot)
      .some((name) => name.startsWith(`${spec.comparisonGroupId}.incomplete-recovered-`)),
    true,
  );
});

test('comparison-group v3 requires every verifier result to keep its Envelope', async (t) => {
  const spec = groupSpec(t);
  const first = await runEffectivenessComparisonGroup(spec);
  const run = first.runs[0];
  const reportPath = path.join(run.evidenceDir, 'report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const verifierEvidence = report.evidence.find(
    (evidence) => evidence.source_kind === 'independent_verifier',
  );
  delete verifierEvidence.envelope_ref;
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const seal = JSON.parse(fs.readFileSync(first.sealPath, 'utf8'));
  seal.reports.find((entry) => entry.arm === run.report.experiment.arm.id).digest =
    digestJson(report);
  fs.writeFileSync(first.sealPath, `${JSON.stringify(seal, null, 2)}\n`);

  const replacement = await runEffectivenessComparisonGroup(spec);
  assert.equal(fs.existsSync(replacement.sealPath), true);
  assert.equal(
    fs.readdirSync(spec.evidenceRoot)
      .some((name) => name.startsWith(`${spec.comparisonGroupId}.incomplete-recovered-`)),
    true,
  );
});

test('seal v3 binds the complete verifier member list', async (t) => {
  const runtime = verifierRuntimeWithFailure();
  const spec = groupSpec(t, {
    verifierRuntime: runtime,
    verifierSet: runtime.verifierSet,
  });
  const first = await runEffectivenessComparisonGroup(spec);
  const run = first.runs[0];
  const reportPath = path.join(run.evidenceDir, 'report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const failedEvent = report.events.find(
    (event) => event.actor === 'verifier' && event.status === 'failed',
  );
  const failedEvidence = report.evidence.find(
    (evidence) => evidence.event_id === failedEvent.id,
  );
  report.events = report.events.filter((event) => event.id !== failedEvent.id);
  report.evidence = report.evidence.filter((evidence) => evidence.id !== failedEvidence.id);
  report.final_result.verifier_result_refs =
    report.final_result.verifier_result_refs.filter((id) => id !== failedEvidence.id);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const seal = JSON.parse(fs.readFileSync(first.sealPath, 'utf8'));
  assert.deepEqual(
    seal.verifier_manifest.verifiers.map((verifier) => verifier.id),
    ['diff-pass', 'diff-fail'],
  );
  seal.reports.find((entry) => entry.arm === run.report.experiment.arm.id).digest =
    digestJson(report);
  fs.writeFileSync(first.sealPath, `${JSON.stringify(seal, null, 2)}\n`);

  const replacement = await runEffectivenessComparisonGroup(spec);
  assert.equal(fs.existsSync(replacement.sealPath), true);
  assert.equal(
    fs.readdirSync(spec.evidenceRoot)
      .some((name) => name.startsWith(`${spec.comparisonGroupId}.incomplete-recovered-`)),
    true,
  );
});

test('invalid Evidence Envelopes fail before the first group seal is published', async (t) => {
  const sandbox = hostSandbox();
  const originalPrepare = sandbox.prepareLaunch;
  const spec = groupSpec(t, { hostSandbox: sandbox });
  sandbox.prepareLaunch = async (context) => {
    const handle = await originalPrepare(context);
    if (context.armId !== 'no-forge') return handle;
    const originalFinalize = handle.finalize;
    handle.finalize = async (...args) => {
      const enforcement = await originalFinalize(...args);
      const stagingName = fs.readdirSync(spec.evidenceRoot)
        .find((name) => name.startsWith('.comparison-staging-'));
      const armDir = path.join(spec.evidenceRoot, stagingName, context.armId);
      const report = JSON.parse(fs.readFileSync(path.join(armDir, 'report.json'), 'utf8'));
      const envelopeRef = report.evidence
        .find((evidence) => evidence.producer_ref.startsWith('runner:'))
        .envelope_ref;
      fs.rmSync(path.join(armDir, envelopeRef));
      return enforcement;
    };
    return handle;
  };

  await assert.rejects(
    () => runEffectivenessComparisonGroup(spec),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'INVALID_EVIDENCE_ENVELOPE' &&
      typeof error.incompleteGroupDir === 'string' &&
      !fs.existsSync(path.join(error.incompleteGroupDir, 'group.json')),
  );
});

test('successful host cleanup cannot mutate evidence after final validation', async (t) => {
  const sandbox = hostSandbox();
  const originalPrepare = sandbox.prepareLaunch;
  const spec = groupSpec(t, { hostSandbox: sandbox });
  sandbox.prepareLaunch = async (context) => {
    const handle = await originalPrepare(context);
    if (context.armId !== 'no-forge') return handle;
    const originalDispose = handle.dispose;
    handle.dispose = async () => {
      await originalDispose();
      const stagingName = fs.readdirSync(spec.evidenceRoot)
        .find((name) => name.startsWith('.comparison-staging-'));
      const armDir = path.join(spec.evidenceRoot, stagingName, context.armId);
      const report = JSON.parse(fs.readFileSync(path.join(armDir, 'report.json'), 'utf8'));
      const envelopeRef = report.evidence
        .find((evidence) => evidence.producer_ref.startsWith('runner:'))
        .envelope_ref;
      fs.rmSync(path.join(armDir, envelopeRef));
    };
    return handle;
  };

  await assert.rejects(
    () => runEffectivenessComparisonGroup(spec),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'INVALID_EVIDENCE_ENVELOPE' &&
      typeof error.incompleteGroupDir === 'string' &&
      !fs.existsSync(path.join(error.incompleteGroupDir, 'group.json')),
  );
});

test('legacy comparison-group v1 keeps its original seal semantics', async (t) => {
  const spec = groupSpec(t);
  const result = await runEffectivenessComparisonGroup(spec);
  const seal = JSON.parse(fs.readFileSync(result.sealPath, 'utf8'));
  seal.version = 1;
  delete seal.verifier_manifest;
  for (const [index, legacyRun] of result.runs.entries()) {
    for (const evidence of legacyRun.report.evidence) {
      if (evidence.envelope_ref === undefined) continue;
      fs.rmSync(path.join(legacyRun.evidenceDir, evidence.envelope_ref));
      delete evidence.envelope_ref;
    }
    fs.writeFileSync(
      path.join(legacyRun.evidenceDir, 'report.json'),
      `${JSON.stringify(legacyRun.report, null, 2)}\n`,
    );
    seal.reports[index].digest = digestJson(legacyRun.report);
  }
  fs.writeFileSync(result.sealPath, `${JSON.stringify(seal, null, 2)}\n`);

  await assert.rejects(
    () => runEffectivenessComparisonGroup(spec),
    (error) => error instanceof EffectivenessExperimentError && error.code === 'EVIDENCE_COLLISION',
  );
  assert.equal(
    fs.readdirSync(spec.evidenceRoot)
      .some((name) => name.startsWith(`${spec.comparisonGroupId}.incomplete-recovered-`)),
    false,
  );
});

test('comparison-group v2 keeps B06 semantics without requiring B07 evidence', async (t) => {
  const spec = groupSpec(t);
  const result = await runEffectivenessComparisonGroup(spec);
  const seal = JSON.parse(fs.readFileSync(result.sealPath, 'utf8'));
  seal.version = 2;
  delete seal.verifier_manifest;
  for (const [index, run] of result.runs.entries()) {
    const verifierEvidenceIds = new Set(
      run.report.evidence
        .filter((evidence) => evidence.source_kind === 'independent_verifier')
        .map((evidence) => evidence.id),
    );
    const verifierEventIds = new Set(
      run.report.evidence
        .filter((evidence) => verifierEvidenceIds.has(evidence.id))
        .map((evidence) => evidence.event_id),
    );
    run.report.evidence = run.report.evidence
      .filter((evidence) => !verifierEvidenceIds.has(evidence.id));
    run.report.events = run.report.events
      .filter((event) => !verifierEventIds.has(event.id));
    run.report.final_result.verifier_result_refs = [];
    fs.writeFileSync(
      path.join(run.evidenceDir, 'report.json'),
      `${JSON.stringify(run.report, null, 2)}\n`,
    );
    seal.reports[index].digest = digestJson(run.report);
  }
  fs.writeFileSync(result.sealPath, `${JSON.stringify(seal, null, 2)}\n`);

  await assert.rejects(
    () => runEffectivenessComparisonGroup(spec),
    (error) => error instanceof EffectivenessExperimentError && error.code === 'EVIDENCE_COLLISION',
  );
  assert.equal(
    fs.readdirSync(spec.evidenceRoot)
      .some((name) => name.startsWith(`${spec.comparisonGroupId}.incomplete-recovered-`)),
    false,
  );
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

test('resolved model identity is exact-shape validated before host preparation', async (t) => {
  let preparations = 0;
  const sandbox = hostSandbox();
  const originalPrepare = sandbox.prepareLaunch;
  sandbox.prepareLaunch = async (...args) => {
    preparations += 1;
    return originalPrepare(...args);
  };
  const provider = modelProvider({
    availability: 'available',
    actual: {
      provider: 'fixture-provider',
      id: 'fixture-model',
      revision: 'r1',
      extra: 'schema-invalid',
    },
  });
  await assert.rejects(
    () => runEffectivenessComparisonGroup(groupSpec(t, {
      hostSandbox: sandbox,
      modelProvider: provider,
    })),
    (error) => error instanceof EffectivenessExperimentError && error.code === 'INVALID_MODEL_SELECTION',
  );
  assert.equal(preparations, 0);
});

test('runtime model fallback is reported and invalidates the unsealed group', async (t) => {
  const provider = modelProvider();
  const originalCreateLaunch = provider.createLaunch;
  let observations = 0;
  provider.createLaunch = async (context) => {
    const launch = await originalCreateLaunch(context);
    const runtime = JSON.parse(launch.command.env.FIXTURE_RUNTIME_RECEIPT);
    runtime.actual_model = {
      provider: 'fixture-provider', id: 'fallback-model', revision: 'r2',
    };
    launch.command.env.FIXTURE_RUNTIME_RECEIPT = JSON.stringify(runtime);
    const originalObserve = launch.observe;
    launch.observe = async (...args) => {
      observations += 1;
      return originalObserve(...args);
    };
    return launch;
  };
  const spec = groupSpec(t, { modelProvider: provider });
  await assert.rejects(
    () => runEffectivenessComparisonGroup(spec),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'RUNTIME_MODEL_FALLBACK' &&
      typeof error.incompleteGroupDir === 'string' &&
      error.runs.length === 0 &&
      fs.existsSync(path.join(error.incompleteGroupDir, 'no-forge', 'host-enforcement.json')) &&
      !fs.existsSync(path.join(error.incompleteGroupDir, 'group.json')),
  );
  assert.equal(observations, 1);
});

test('an omitted requested revision still pins every runtime to the resolved revision', async (t) => {
  const provider = modelProvider();
  const originalCreateLaunch = provider.createLaunch;
  provider.createLaunch = async (context) => {
    const launch = await originalCreateLaunch(context);
    if (context.armId === 'kernel-only') {
      const runtime = JSON.parse(launch.command.env.FIXTURE_RUNTIME_RECEIPT);
      runtime.actual_model.revision = 'r2';
      launch.command.env.FIXTURE_RUNTIME_RECEIPT = JSON.stringify(runtime);
    }
    return launch;
  };
  const spec = groupSpec(t, {
    requestedModel: { provider: 'fixture-provider', id: 'fixture-model' },
    modelProvider: provider,
  });
  await assert.rejects(
    () => runEffectivenessComparisonGroup(spec),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'RUNTIME_MODEL_FALLBACK' &&
      error.runs.length === 1,
  );
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

test('comparison requires an external verifier runtime bound to the controlled verifier set', async (t) => {
  await assert.rejects(
    () => runEffectivenessComparisonGroup(groupSpec(t, { verifierRuntime: undefined })),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'VERIFIER_UNAVAILABLE',
  );
  await assert.rejects(
    () => runEffectivenessComparisonGroup(groupSpec(t, {
      verifierSet: { id: 'fixture-verifiers', digest: DIGESTS.verifier },
    })),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'VERIFIER_UNAVAILABLE',
  );
});

test('base capabilities cannot use the Forge-reserved namespace', () => {
  assert.throws(
    () => createEffectivenessExperimentPlan({
      rootDir: root,
      baseCapabilities: [{ kind: 'other', id: 'forge:future-capability' }],
    }),
    (error) => error instanceof EffectivenessExperimentError && /reserved Forge namespace/.test(error.message),
  );
});

test('trusted plan rejects capability kinds outside the report contract', () => {
  assert.throws(
    () => createEffectivenessExperimentPlan({
      rootDir: root,
      baseCapabilities: [{ kind: 'banana', id: 'common' }],
    }),
    (error) => error instanceof EffectivenessExperimentError && /invalid capability/.test(error.message),
  );
});

test('provider observation cannot self-attest runtime identity', async (t) => {
  const provider = modelProvider();
  const originalCreateLaunch = provider.createLaunch;
  provider.createLaunch = async (context) => {
    const launch = await originalCreateLaunch(context);
    launch.command.args = ['-e', 'process.stdout.write("fixture\\n")'];
    launch.observe = async () => ({
      ...observedResult(),
      runtime: {
        actualModel: context.selectedModel,
        commonContextDigest: context.commonContextDigest,
      },
    });
    return launch;
  };
  await assert.rejects(
    () => runEffectivenessComparisonGroup(groupSpec(t, { modelProvider: provider })),
    (error) =>
      error.code === 'GROUP_EXECUTION_FAILED' &&
      error.cause?.code === 'report_rejected' &&
      /runtime receipt/i.test(error.cause?.message ?? '') &&
      fs.existsSync(path.join(error.incompleteGroupDir, 'no-forge', 'host-enforcement.json')),
  );
});

test('evidence overlap is rejected before source mutation or model resolution', async (t) => {
  let resolutions = 0;
  const provider = modelProvider();
  provider.resolve = async () => {
    resolutions += 1;
    return {
      availability: 'available',
      actual: { provider: 'fixture-provider', id: 'fixture-model', revision: 'r1' },
    };
  };
  const spec = groupSpec(t, { modelProvider: provider });
  spec.evidenceRoot = path.join(spec.source.dir, 'evidence');
  await assert.rejects(
    () => runEffectivenessComparisonGroup(spec),
    (error) => error instanceof EffectivenessExperimentError && /physically separate/.test(error.message),
  );
  assert.equal(resolutions, 0);
  assert.equal(fs.existsSync(spec.evidenceRoot), false);
  assert.equal(git(spec.source.dir, ['status', '--porcelain']), '');
});

test('cleanup failure quarantines the group without a completion seal', async (t) => {
  const sandbox = hostSandbox();
  const originalPrepare = sandbox.prepareLaunch;
  sandbox.prepareLaunch = async (context) => {
    const handle = await originalPrepare(context);
    if (context.armId === 'no-forge') {
      handle.dispose = async () => { throw new Error('fixture cleanup failure'); };
    }
    return handle;
  };
  await assert.rejects(
    () => runEffectivenessComparisonGroup(groupSpec(t, { hostSandbox: sandbox })),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'HOST_SANDBOX_UNAVAILABLE' &&
      typeof error.incompleteGroupDir === 'string' &&
      !fs.existsSync(path.join(error.incompleteGroupDir, 'group.json')),
  );
});

test('schema-invalid controlled input is rejected before model resolution', async (t) => {
  let resolutions = 0;
  const provider = modelProvider();
  const originalResolve = provider.resolve;
  provider.resolve = async (...args) => {
    resolutions += 1;
    return originalResolve(...args);
  };
  const spec = groupSpec(t, { modelProvider: provider });
  spec.budget.extra = 'not allowed';
  await assert.rejects(
    () => runEffectivenessComparisonGroup(spec),
    (error) => error instanceof EffectivenessExperimentError && error.code === 'INVALID_EXPERIMENT',
  );
  assert.equal(resolutions, 0);
});

test('callers cannot replace the scheduler-owned B04 runner', async (t) => {
  const spec = groupSpec(t);
  let invoked = false;
  spec.runAttempt = async () => {
    invoked = true;
    return { report: {}, receipt: {} };
  };
  await assert.rejects(
    () => runEffectivenessComparisonGroup(spec),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'INVALID_EXPERIMENT' &&
      /scheduler-owned/.test(error.message),
  );
  assert.equal(invoked, false);
  assert.equal(fs.existsSync(spec.evidenceRoot), false);
});

test('host enforcement policy must be identical across all four prepared launches', async (t) => {
  const sandbox = hostSandbox();
  const originalPrepare = sandbox.prepareLaunch;
  sandbox.prepareLaunch = async (context) => {
    const prepared = await originalPrepare(context);
    if (context.armId === 'legacy-chain') prepared.appliedPolicyDigest = `sha256:${'0'.repeat(64)}`;
    return prepared;
  };
  await assert.rejects(
    () => runEffectivenessComparisonGroup(groupSpec(t, { hostSandbox: sandbox })),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'HOST_SANDBOX_UNAVAILABLE' &&
      /policy/.test(error.message),
  );
});

test('host enforcement receipts reject additional fields before persistence', async (t) => {
  const sandbox = hostSandbox();
  const originalPrepare = sandbox.prepareLaunch;
  sandbox.prepareLaunch = async (context) => {
    const handle = await originalPrepare(context);
    const originalFinalize = handle.finalize;
    handle.finalize = async (...args) => ({
      ...(await originalFinalize(...args)),
      token: 'must-not-be-persisted',
    });
    return handle;
  };
  await assert.rejects(
    () => runEffectivenessComparisonGroup(groupSpec(t, { hostSandbox: sandbox })),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'HOST_SANDBOX_UNAVAILABLE' &&
      typeof error.incompleteGroupDir === 'string' &&
      !fs.existsSync(path.join(error.incompleteGroupDir, 'no-forge', 'host-enforcement.json')),
  );
});

test('runner preflight failures still finalize and retain host containment', async (t) => {
  let nullReceiptFinalizations = 0;
  const sandbox = hostSandbox();
  const originalPrepare = sandbox.prepareLaunch;
  sandbox.prepareLaunch = async (context) => {
    const handle = await originalPrepare(context);
    const originalFinalize = handle.finalize;
    handle.finalize = async ({ receipt, report }) => {
      if (receipt === null && report === null) nullReceiptFinalizations += 1;
      return originalFinalize({ receipt, report });
    };
    return handle;
  };
  const spec = groupSpec(t, { hostSandbox: sandbox });
  fs.writeFileSync(path.join(spec.source.dir, 'dirty.txt'), 'uncontrolled input\n');
  await assert.rejects(
    () => runEffectivenessComparisonGroup(spec),
    (error) =>
      error.code === 'GROUP_EXECUTION_FAILED' &&
      typeof error.incompleteGroupDir === 'string' &&
      fs.existsSync(path.join(error.incompleteGroupDir, 'no-forge', 'host-enforcement.json')),
  );
  assert.equal(nullReceiptFinalizations, 1);
});

test('invalid host handles remain owned when cleanup itself fails', async (t) => {
  let disposals = 0;
  const sandbox = hostSandbox({
    async prepareLaunch({ command }) {
      return {
        command,
        async dispose() {
          disposals += 1;
          throw new Error('fixture dispose failure');
        },
      };
    },
  });
  await assert.rejects(
    () => runEffectivenessComparisonGroup(groupSpec(t, { hostSandbox: sandbox })),
    (error) =>
      error instanceof EffectivenessExperimentError &&
      error.code === 'HOST_SANDBOX_UNAVAILABLE' &&
      error.cleanupFailures?.some((failure) => /dispose failure/.test(failure)),
  );
  assert.equal(disposals, 1);
});

test('an unsealed final directory is quarantined before a clean retry', async (t) => {
  const spec = groupSpec(t);
  const abandoned = path.join(spec.evidenceRoot, spec.comparisonGroupId);
  fs.mkdirSync(abandoned, { recursive: true });
  fs.writeFileSync(path.join(abandoned, 'partial.txt'), 'interrupted publication\n');
  fs.writeFileSync(path.join(abandoned, 'group.json'), JSON.stringify({
    contract: 'forge-effectiveness-comparison-group',
    version: 1,
    comparison_group_id: spec.comparisonGroupId,
  }));
  const result = await runEffectivenessComparisonGroup(spec);
  assert.equal(fs.existsSync(result.sealPath), true);
  const recovered = fs.readdirSync(spec.evidenceRoot)
    .find((name) => name.startsWith(`${spec.comparisonGroupId}.incomplete-recovered-`));
  assert.equal(typeof recovered, 'string');
  assert.equal(fs.existsSync(path.join(spec.evidenceRoot, recovered, 'partial.txt')), true);
  assert.equal(fs.existsSync(path.join(spec.evidenceRoot, recovered, 'group.json')), false);
  assert.equal(
    fs.readdirSync(path.join(spec.evidenceRoot, recovered))
      .some((name) => name.startsWith('rejected-group-')),
    true,
  );
});

test('recovery never follows a final-directory symlink outside evidence root', async (t) => {
  const spec = groupSpec(t);
  fs.mkdirSync(spec.evidenceRoot, { recursive: true });
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-effectiveness-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const marker = path.join(outside, 'group.json');
  fs.writeFileSync(marker, 'outside marker\n');
  fs.symlinkSync(outside, path.join(spec.evidenceRoot, spec.comparisonGroupId));
  await assert.rejects(
    () => runEffectivenessComparisonGroup(spec),
    (error) => error instanceof EffectivenessExperimentError && error.code === 'EVIDENCE_COLLISION',
  );
  assert.equal(fs.readFileSync(marker, 'utf8'), 'outside marker\n');
});

test('capability ordering and digests use locale-independent code-point order', () => {
  const plan = createEffectivenessExperimentPlan({
    rootDir: root,
    baseCapabilities: [
      { kind: 'other', id: 'ä' },
      { kind: 'other', id: 'z' },
      { kind: 'other', id: 'a' },
    ],
  });
  assert.deepEqual(
    plan.arms['no-forge'].capability_policy.exposed.map((item) => item.id),
    ['a', 'z', 'ä'],
  );
});
