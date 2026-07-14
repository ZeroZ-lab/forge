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
scope, and repeated samples are required. It does not run Codex. A passing
contract does not claim real-world effectiveness.

## Kernel Boundary

Manifest v2 adds the machine-validated `kernel_contract` and rejects v1 rather
than silently applying the new semantics to an old contract. The boundary is:

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
