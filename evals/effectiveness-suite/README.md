# Forge effectiveness-suite contract

This suite defines held-out real-task scenarios for comparing Forge against a
no-Forge baseline. It is separate from `evals/skills-suite`, which remains the
fixed compliance/regression harness.

Run the contract check:

```bash
npm run eval:effectiveness
```

The command only proves that the held-out task contract is complete: fixtures
exist, all six scenarios are covered, both `forge` and `no-forge` modes are in
scope, repeated samples are required, and the report schema and compatibility
policy are present. It does not run Codex or validate a produced run report. A
passing contract does not claim real-world effectiveness.

## Kernel Boundary

Manifest v2 introduced the machine-validated `kernel_contract`; manifest v3
adds the versioned report-contract pointers. Older manifest versions are
rejected rather than silently receiving new semantics. The Kernel boundary is:

- the Kernel owns the objective, permissions, scope, authoritative facts,
  evidence, task state, and completion conditions;
- it does not choose a lifecycle stage, Skill, implementation strategy, or the
  model's internal reasoning;
- direct action, optional Skill use, skipping a Skill, and rejecting an
  irrelevant capability are all legal paths;
- success is judged by verified outcome, safety, and valid evidence. A fixed
  Skill hit rate, stage completion, or model-name ranking is not a success
  proxy.

Non-interference is a paired comparison between Forge and no-Forge arms for
the same model, fixture, workspace revision, budget, and verifier. Models are
reported separately; their names are not treated as a total capability order.
The validator rejects unknown scoring fields and pins the forbidden success
proxies. Free-form fixture and review text is review input, not an executable
scoring rule; static validation cannot prove the semantic neutrality of
arbitrary prose. B08 owns the external outcome evaluator.

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

- Run every case in `forge` and `no-forge` modes.
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
