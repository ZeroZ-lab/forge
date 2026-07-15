# Forge effectiveness-suite contract

This suite defines held-out real-task scenarios for comparing four controlled
conditions: `no-forge`, `kernel-only`, `adaptive-full`, and `legacy-chain`. It
is separate from `evals/skills-suite`, which remains the fixed
compliance/regression harness.

Run the contract check:

```bash
npm run eval:effectiveness
```

The command only proves that the held-out task contract is complete: fixtures
exist, all six scenarios and four experiment arms are covered, repeated samples
are required, and the report schema and compatibility policy are present. It
does not run Codex or validate a produced run report. A passing contract does not claim real-world effectiveness.

## Kernel Boundary

Manifest v2 introduced the machine-validated `kernel_contract`; manifest v3
added the versioned report-contract pointers; manifest v4 pins the four-arm
comparison contract. Older manifest versions are rejected rather than silently
receiving new semantics. The Kernel boundary is:

- the Kernel owns the objective, permissions, scope, authoritative facts,
  evidence, task state, and completion conditions;
- it does not choose a lifecycle stage, Skill, implementation strategy, or the
  model's internal reasoning;
- direct action, optional Skill use, skipping a Skill, and rejecting an
  irrelevant capability are all legal paths;
- success is judged by verified outcome, safety, and valid evidence. A fixed
  Skill hit rate, stage completion, or model-name ranking is not a success
  proxy.

Non-interference is a four-way comparison for the same explicitly requested
model, fixture, workspace revision, budget, and verifier. Models are reported
separately; their names are not treated as a total capability order.
The validator rejects unknown scoring fields and pins the forbidden success
proxies. Free-form fixture and review text is review input, not an executable
scoring rule; static validation cannot prove the semantic neutrality of
arbitrary prose. B08 owns the external outcome evaluator.

The four policies are exclusive launch modes: one attempt receives exactly one
complete policy and no alias or policy union.

| Arm | Forge capability surface | Action policy |
|-----|--------------------------|---------------|
| `no-forge` | no Forge capability | model acts directly |
| `kernel-only` | goal/evidence Kernel only | model chooses the action |
| `adaptive-full` | Kernel plus the complete published Skill registry | every Skill is optional, including zero activations |
| `legacy-chain` | one pinned legacy capsule for Forge 0.52.0, Git tree `516a67e49c8c5e564be1671396bad6edadaef4f2` | preserves `detail → codegen → review` as the pre-upgrade control |

Common non-Forge tools, when present, are passed as `baseCapabilities` and
copied into all four policies. The adaptive arm definition also binds a digest
of the live published Skill tree; the legacy arm stays bound to the pinned
pre-upgrade tree instead of drifting with future adaptive changes.

## Attempt Report Contract

`report.schema.json` defines one atomic report for one model × experiment arm ×
fixture × repeat. It records the controlled comparison condition, observable
events, typed evidence references, execution termination, submitted result, and
source-qualified costs. It deliberately does not contain a routing score,
required Skill, required stage, or model-internal reasoning.

Important truth boundaries:

- the arm id is a neutral identifier whose current meaning is checked against
  the experiment plan; adding future arms does not change the wire shape;
- requested and actual model identities are separate, so a runner cannot hide a
  fallback;
- a capability activation is observable telemetry only. A report with no
  activation event is valid;
- execution termination and the model's completion claim are separate. Neither
  is an evaluator verdict;
- evidence distinguishes `model_self_report`, `tool_output`, and
  `independent_verifier`, but B06 still owns envelope integrity, target binding,
  and freshness;
- every cost measurement names its acquisition source. Reports require wall
  time plus a context or equivalent consumption measure.

Schema version 1 is the first effectiveness-report family. The old
skills-suite v2 report is a different compliance contract: it lacks the model,
explicit arm, controlled workspace/budget/verifier identities, and qualified
evidence needed for effectiveness comparison. `report.compatibility.json`
therefore marks it incompatible and requires a rerun; no migration may invent
missing provenance. Future migrations require an explicit adapter, preservation
of the source digest, and full revalidation.

B02 owns this wire contract and its compatibility corpus. B03 owns the sole
production constructor/parser and field-addressed strict validation. B06 owns
Evidence Envelopes, and B08 owns outcome scoring and hard gates.

### Runtime acceptance seam

Production callers use `scripts/lib/effectiveness-report.mjs`:

```js
import {
  createEffectivenessReport,
  parseEffectivenessReport,
} from '../../scripts/lib/effectiveness-report.mjs';
```

Both functions require a trusted plan that is separate from the report. B05 is
the production plan owner:

```js
import { createEffectivenessExperimentPlan } from '../../scripts/lib/effectiveness-experiment.mjs';

const options = {
  experimentPlan: createEffectivenessExperimentPlan({
    rootDir,
    baseCapabilities: commonProviderTools,
  }),
};

const created = createEffectivenessReport(observed, options);
const accepted = parseEffectivenessReport(existingReport, options);
```

The plan defines every arm named by `manifest.modes`; its definition digest and
complete capability policy are the trusted comparison values. Callers cannot
supply their own digests. A report cannot authorize its own arm or capability
exposure.

`createEffectivenessReport` owns `schema_version`, `contract`, and a
deterministic `report_id`; callers must supply all observed facts such as model
identity, timestamps, digests, events, evidence, and costs. Supplying a
constructor-owned field is rejected rather than silently overwritten.
`parseEffectivenessReport` accepts an existing report without rewriting it, but
requires its report id and controlled arm fields to agree with the same plan.
Both functions clone their input and pass through the same fail-closed schema,
plan-binding, and internal-reference checks. Rejections use
`EffectivenessReportError.issues[]` with JSON Pointer paths such as
`/evidence/0/objective_ref`.

This acceptance seam proves only that the report shape, active arm, and its
internal event/evidence/final-result graph are self-consistent. It does not read
locators, authenticate producers, recompute digests, or decide whether evidence
is sufficient; those remain B06 and B08 responsibilities.

### Isolated attempt runner

`scripts/lib/effectiveness-runner.mjs` exposes one high-level B04 entry point:

```js
import { runIsolatedEffectivenessAttempt } from '../../scripts/lib/effectiveness-runner.mjs';

const result = await runIsolatedEffectivenessAttempt({
  contractRoot,
  experimentPlan,
  armId: preselectedArmId,
  attemptId: 'fixture.adaptive-full.0',
  source: { dir: cleanRepository, ref: 'fixture://project' },
  evidenceRoot: externalEvidenceDirectory,
  command: {
    file: executable,
    args,
    env: {},
    label: 'model process',
    definitionDigest: launcherDefinitionDigest,
  },
  limits: {
    timeoutMs: 600000,
    maxStdoutBytes: 8388608,
    maxStderrBytes: 2097152,
    maxCapturedWorkspaceBytes: 536870912,
    maxCapturedWorkspaceEntries: 50000,
    maxDiffBytes: 67108864,
    gitOperationTimeoutMs: 120000,
    killGraceMs: 1000,
  },
  buildReportInput(receipt, retainedEvidence) {
    return observedModelAndTaskFields;
  },
});
```

The source must be a clean Git repository and the evidence root must be outside
it. Each call creates shallow non-local workspace and capture clones plus
isolated `HOME`, `CODEX_HOME`, and temporary directories. A repo-relative
executable is resolved inside the clone; source/evidence executables, arguments,
environment values, and `PATH` entries fail closed. B05 preselects a neutral
arm id; B04 freezes it against the trusted plan before launch, records the
binding in the receipt, and rejects any adapter relabeling without choosing an
arm itself. The child does not receive the attempt or arm id. Attempt ids
allocate evidence directories exclusively, while a random runner-owned
isolation id prevents cross-store identity collisions.

The runner itself only reads the source and runs the child in the clone. Source
guards bind HEAD/tree/refs/index plus the complete non-`.git` worktree,
including ignored files, before launch and after execution/report adaptation.
An external or concurrent source change becomes `infrastructure_error`; the
runner does not destructively restore it because that could erase unrelated
user work. B05's host sandbox owns prevention of deliberate filesystem escape.

`command.definitionDigest` is required and must be computed before launch over
the adapter/launcher definition, including interpreted script or configuration
files whose contents are not represented by the executable bytes or argument
strings. B05 owns that computation over a credential-redacted definition; a
static label or a digest of raw credential material is not a valid substitute.

Timeout, abort, and output-limit cancellation terminate the POSIX process group;
normal completion also removes surviving members. Git operations have their own
timeout. The runner attempts temporary-capsule removal before report
construction; cleanup failure is published as an `infrastructure_error` with
`capsule_removed: false` so the caller can remove the recorded path. This is not
a Windows job-object implementation, and a process that deliberately escapes
its group still requires B05's host sandbox.

After a reported post-launch terminal, the retained bundle always contains
`events.jsonl`, `command.json`, `attempt.json`, `artifacts.json`, and the raw
`receipt.json`. Bounded `stdout.log` and `stderr.log` exist only when their
streams pass retention checks; binary `diff.patch` exists only when final
capture succeeds; `report.json` exists only after accepted atomic publication.
A private capture repository pins the original revision, forces
ignored and untracked files into the final tree, and excludes root or nested
`.git` metadata; commits made by the command therefore cannot hide artifact
content. The manifest also records empty directories that Git cannot represent.

Snapshot and configuration digests ignore timestamps and temporary paths. The
request fingerprint binds the pre-launch executable bytes, source revision,
caller-computed launcher definition, effective non-secret environment and
arguments, limits, source reference, and the preselected arm id, definition,
and capability-policy digest;
credential literals are replaced while their surrounding non-secret context is
preserved. A final-capture, post-run source-guard, or post-adapter source-guard
failure keeps the process facts, omits unknown claims where necessary, and becomes an
`infrastructure_error` report. Failure to persist the evidence store itself is
returned as a runner error because no honest report can be published there.

Process output is first captured inside the temporary capsule. Literal values
from credential-like explicit environment variables, plus caller-declared
`command.sensitiveValues`, are scanned across retained streams, source guards, final workspace
files and paths, and report input. The initial workspace is scanned before the
child launches, so a configured credential in the baseline cannot become a
retained snapshot digest. A later match immediately removes both raw streams,
omits secret-derived stream digests, and classifies the run as
`credential_material_detected`. If a configured-credential stream is truncated,
its retained prefix is rejected as unverifiable. Configured credential literals
are therefore not promoted into the persistent bundle; encoded or transformed
secrets remain the caller sandbox's responsibility.

`buildReportInput` is a trusted, non-model-controlled adapter seam for B05. It
receives cloned receipt/artifact references, not a writable evidence path.
Retained runner artifacts are rehashed and unexpected bundle entries are
rejected before publication. The adapter supplies observed model identity,
model/tool events, its claim, and provider/tool costs; it cannot claim the
runner identity, an Evidence Envelope, an independent verifier, or a verifier
result.

The runner owns workspace and attempt execution facts, attempt wall time, and
plan-derived arm definition/capability policy. It appends runner capture
references as `tool_output`, then calls both B03 constructor and parser before
atomic persistence. Exit 0 means only that the top-level process completed. A
model may still claim `failed` or `blocked`, and B08 alone determines objective
outcome.

B04 does not select a model or experiment arm, install Forge, authenticate an
Evidence Envelope, run an external verifier, or score a task. Its active bounds
cover process time, retained output, Git-operation time, and diff size;
`maxCapturedWorkspace*` are initial/final capture ceilings, not live disk
quotas. B05 must use the host workspace sandbox for live disk, CPU, memory,
network, detached-process, and hostile-code containment.

### Four-arm comparison coordinator

`scripts/lib/effectiveness-experiment.mjs` is the B05 plan and scheduling seam:

```js
import {
  createEffectivenessExperimentPlan,
  runEffectivenessComparisonGroup,
} from '../../scripts/lib/effectiveness-experiment.mjs';
```

`createEffectivenessExperimentPlan` derives all arm and capability-policy
digests from the manifest, package, published Skill tree, and common base
capabilities; common capabilities may not use the reserved `forge:` namespace.
`runEffectivenessComparisonGroup` recomputes that plan rather than
trusting caller-supplied arm digests, resolves one explicitly requested model,
prepares all four launches, and only then invokes the B04 runner sequentially.
The scheduler owns comparison id, objective, fixture, requested model,
parameter digest, repeat/seed, budget, verifier set, and arm binding. Provider
adapters can return observations but cannot rewrite those controlled fields. A
canonical common launch context containing those fields is identical across all
arms, while a scheduler-owned arm context contains the unique definition and
capability policy. Both contexts are injected into the actual process
environment and bound into the B04 request fingerprint. The provider process
must emit exactly one transport receipt into retained stdout, binding the same
digests. The scheduler parses that retained artifact itself; provider
observation callbacks cannot supply runtime identity.

An available preflight selection must match the requested provider/model and
the requested revision when one was specified. A different preflight identity
is treated as an unavailable request with a visible `fallback ... rejected`
reason; the provider launcher is not called. For a launched model, report
`actual` comes from the post-run runtime receipt rather than preflight. A
runtime identity must exactly match the complete preflight selection, including
revision even when the request omitted one. A fallback is retained in the
failed attempt evidence and immediately stops later arms. A
genuinely unavailable model is recorded in four `no_output` reports with its
reason and without an `actual` identity. This preserves the attempted
comparison shape without claiming that a model ran.

The coordinator rejects a group when an arm is missing or duplicated, a
budget/verifier/input/model/limit/source fact drifts, capability exposure does
not match the trusted plan, or workspace isolation ids collide. Adaptive runs
with zero `capability_activation` events remain valid. Attempts first land under
a private staging directory. Runtime and host-enforcement receipts are persisted
per arm and referenced by the group seal. Only after validation and host cleanup
is the directory moved to its final location; `group.json` is written last and
is the completion marker. Failed groups receive an `.incomplete-*`
suffix and have no seal, so they remain diagnosable but are not a complete
comparison.

Before model resolution, B05 requires a versioned host-sandbox adapter that
declares filesystem isolation, network policy, detached process-tree
containment, and live CPU/memory/disk limits. The adapter prepares all four
commands before any attempt starts. Every launch must return the same
scheduler-derived applied-policy digest, a post-run containment receipt, and a
cleanup lifecycle; missing guarantees or setup failure stops the group. This
repository deliberately does not claim that POSIX process
groups, `ulimit`, Codex workspace mode, or deprecated macOS `sandbox-exec`
provide those guarantees. Real hostile-code runs therefore require an audited
external container, microVM, or equivalent adapter. The adapter definition and
guarantees are bound into the scheduler-owned launcher digest.

The transport receipt proves what the captured launcher process emitted; by
itself it does not authenticate a remote model response or prove that an adapter
actually enforced its declared capability configuration. Production model and
host adapters therefore remain explicit trusted boundaries. B06/B07 external
evidence and verifier work must strengthen that boundary before any
effectiveness claim.

## Scenarios

| Scenario | What It Tests |
|----------|---------------|
| `direct-action` | Can the agent answer a narrow authoritative read without adding process or context that does not improve the verified result? |
| `small-feature` | Can the agent deliver a small feature as a vertical slice with minimal docs and real verification? |
| `bugfix` | Does the agent build a red-capable loop before changing implementation? |
| `frontend-buy-vs-build` | Does the agent choose mature standard components instead of recreating commodity UI/auth/deploy pieces? |
| `delegation` | Does the orchestrator delegate context-heavy investigation while keeping final judgment centralized? |
| `learn-boundary` | Does learn surface cross-project candidates without writing outside the current project boundary? |

## Required Comparison Shape

- Run every case in `no-forge`, `kernel-only`, `adaptive-full`, and
  `legacy-chain` modes.
- Use at least two repeats per case and per mode.
- Keep task prompts answer-free; do not include oracle scoring hints.
- Keep each case route-neutral: neither calling nor skipping a Skill is itself
  a passing signal.
- Collect runtime evidence: commands, changed files, final artifacts, and review notes.
- Score with human or external review on:
  - goal completion
  - scope control
  - verification strength
  - doc drift
  - human reviewability

## Non-Claims

- A valid contract is not effectiveness evidence.
- A single run is diagnostic only.
- These cases are held-out probes, not a release gate until real multi-run
  reports exist.
