# Forge effectiveness-suite contract

This suite defines held-out real-task scenarios for comparing Forge against a
no-Forge baseline. It is separate from `evals/skills-suite`, which remains the
fixed compliance/regression harness.

Run the contract check:

```bash
npm run eval:effectiveness
```

The command only proves that the held-out task contract is complete: fixtures
exist, all five scenarios are covered, both `forge` and `no-forge` modes are in
scope, and repeated samples are required. It does not run Codex. A passing
contract does not claim real-world effectiveness.

## Scenarios

| Scenario | What It Tests |
|----------|---------------|
| `small-feature` | Can the agent deliver a small feature as a vertical slice with minimal docs and real verification? |
| `bugfix` | Does the agent build a red-capable loop before changing implementation? |
| `frontend-buy-vs-build` | Does the agent choose mature standard components instead of recreating commodity UI/auth/deploy pieces? |
| `delegation` | Does the orchestrator delegate context-heavy investigation while keeping final judgment centralized? |
| `learn-boundary` | Does learn surface cross-project candidates without writing outside the current project boundary? |

## Required Comparison Shape

- Run every case in `forge` and `no-forge` modes.
- Use at least two repeats per case and per mode.
- Keep task prompts answer-free; do not include oracle scoring hints.
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
