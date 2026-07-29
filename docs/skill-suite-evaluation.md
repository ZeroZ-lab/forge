# Skill Suite Compliance/Regression Evaluation

Forge skills-suite is a legacy capability compliance/regression harness for
explicitly selected Forge scenarios. It evaluates whether those capabilities
follow their published artifact, traceability, verification, and scope-control
contracts. It does not define the Kernel-first production action path and is not an independent proof that
Forge improves real-world delivery; that requires held-out or externally reviewed
tasks and a strong baseline.

## What Is Verifiable

The repository now separates two claims:

1. **Benchmark contract is valid**: cases exist, cover every skill, fixtures exist, and oracle checks are machine-readable.
2. **A run satisfies scenario compliance**: an actual agent run produced a report that passes the suite oracle for the fixed cases.
3. **Named runtime/context surfaces are bounded**: generated Kernel template, current project AGENTS, registry and platform metadata, largest selected body, recursively linked capability bundle, and packaged Skill total stay under explicit character budgets.

The first claim is checked locally by `node scripts/evaluate-skills.mjs`. The second claim requires a report from a real run:

```bash
node scripts/evaluate-skills.mjs --report path/to/report.json
```

No-report mode must not be used as evidence that the skills are effective. It only proves the evaluation harness is intact.
Even a passing run report is scenario-compliance evidence for this suite, not a suite-level effectiveness claim.

## Held-Out Effectiveness Contract

Real-world effectiveness probes live separately in `evals/effectiveness-suite/`.
That suite defines six held-out task classes: direct authoritative read, small
feature vertical slice, bugfix red-capable loop, frontend buy-vs-build,
delegation, and learn boundary.

Run:

```bash
npm run eval:effectiveness
```

This validates the held-out task contract only. It does not run Codex and does
not claim Forge is effective. Effectiveness requires Forge and no-Forge runs,
at least two repeats per case and mode, runtime evidence, and human/external
review over goal completion, scope control, verification strength, doc drift,
and human reviewability.

Effectiveness attempt reports use the separate
`evals/effectiveness-suite/report.schema.json` contract. One report represents
one model × arm × fixture × repeat and distinguishes observable events,
capability telemetry, model self-report, tool output, independent verifier
references, execution termination, submitted result, and cost acquisition
sources. A valid shape is not a verified outcome. Legacy skills-suite v2
reports are explicitly incompatible because missing controlled conditions and
provenance cannot be inferred safely.

The fixed skills-suite still records expected Skill routing for compatibility
regression. Those routing signals are not outcome evidence and must not enter
the Kernel non-interference gate. Effectiveness compares Forge and no-Forge
for the same model and controlled task conditions; direct action, optional
Skill use, skipping a Skill, and rejecting an irrelevant capability are all
legal paths.

## Runtime Footprint Gate

Production cost is measured around Kernel-first loading. The pinned `detail -> codegen -> review` body total is reported only as a legacy compatibility reference, not as a production gate.

Run:

```bash
npm run metrics:chars
npm run metrics:chars -- --max-kernel-adapter-chars=3000 --max-project-agents-chars=6000 --max-metadata-chars=8500 --max-platform-metadata-chars=1500 --max-selected-skill-chars=4000 --max-selected-bundle-chars=20000 --max-total-chars=56000
```

`node scripts/validate.mjs` enforces seven budgets:

- generated AGENTS Kernel template <= 3,000 characters
- current project AGENTS adapter <= 6,000 characters
- initial registry metadata <= 8,500 characters
- platform skill metadata adapters <= 1,500 characters
- largest selected Skill body <= 4,000 characters
- largest recursively linked capability bundle <= 20,000 characters (conservative upper bound)
- all `SKILL.md` runtime files <= 56,000 characters

This gate bounds named source surfaces, not exact provider tokenization or actual conditional reference loading. The bundle metric follows linked Markdown recursively as a conservative upper bound; behavior effectiveness still requires real runs.

## V2 Traceability Contract

The benchmark contract is now version 2. Every mutating scored case must show that the run is traceable through a Change Unit. Non-mutating advisory cases must show that no current artifact was changed; safe-stop bugfix cases may record a Change Unit, but must not modify current project/goal/code/test artifacts to simulate progress.

Each case report includes:

- `change_units`: `docs/change-units/CU-*.md` records for the feature, bugfix, release, or methodology update.
- `goal_verification`: evidence that the implementation met the stated goal criteria.

The evaluator rejects a report when artifacts change without a valid Change Unit path.

Every `expected_artifacts` entry must be reported by the run. Non-CU artifacts must appear in `artifacts`; CU artifacts must appear in `change_units` and match `docs/change-units/CU-*.md`.

For Codex-based smoke runs:

```bash
node scripts/install-local-codex-plugin.mjs
node scripts/run-skills-benchmark.mjs --case thinking-red-team
node scripts/evaluate-skills.mjs --allow-partial --report .eval-runs/skills-suite/<run-id>/report.json
```

The runner stores transcripts and temporary workspaces under `.eval-runs/skills-suite/`.
Each run writes both `report.json` for machine scoring and `summary.md` for human review in the run directory.

`--verify-disk` is behavior-backed: every reported Change Unit must exist in the run workspace, include a `## Verification` section, and cite a command that appears in that run's `events.jsonl` with exit code 0. Echoing a command string, such as `echo "node --test"`, does not count as command execution.

If Codex usage limits or other external conditions block a full run, score only completed cases with:

```bash
node scripts/evaluate-skills.mjs --skip-blocked --report .eval-runs/skills-suite/<run-id>/report.json
```

Skipped blocked cases are not evidence of skill effectiveness.

In run reports, `status: "blocked"` is reserved for benchmark execution blockers such as usage limits, missing tools, permissions, or environment failures. If a fixture's correct outcome is to stop safely, refuse to guess, or request missing production evidence, the case status is still `pass` when the safety-stop oracle is satisfied.

## Benchmark Contract

The source of truth is `evals/skills-suite/manifest.json`.

`scripts/lib/benchmark-contract.mjs` is the single in-process interface that loads and validates that source. The repository validator, evaluator, benchmark runner, and contract tests consume it instead of reinterpreting manifest rules independently.

Each case defines:

- fixture prompt
- expected skills
- expected artifacts
- required evidence
- forbidden behaviors
- oracle checks

V2 oracle checks include:

- `change_unit_reported`
- `goal_verified`

The suite keeps a minimum representative case count in the manifest and covers all registered Forge skills.

Cases may pin adjacent chains to test legacy interoperability. Those fixtures deliberately request the capabilities they score; they are compatibility contracts, not recommendations for production routing. Standalone cases remain useful when a Skill has independent invocation value.

## Compliance Scenario Coverage

The suite maps product-value scenarios to measurable compliance signals. These checks are useful for regression control, but they do not prove real-world effectiveness by themselves:

| Scenario | Benchmark Case | What It Checks |
|----------------|----------------|----------------|
| Explicit legacy small feature | `legacy-chain-small-feature` | The pinned Forge 0.52.0 `detail -> codegen -> review` preset remains executable without redefining the production default. |
| Ambiguous requirement convergence | `requirements-research` | A vague feature with technical signal words is narrowed into PRD plus research options before implementation. |
| Frontend experience delivery | `interaction-design-system` | Design, visual system, frontend artifact, and acceptance evidence stay connected through one chain. |
| Deterministic regression bugfix | `bugfix-regression-change-unit` | The exact symptom goes red before the fix, is minimized, becomes a regression test, and is rechecked through the original scenario. |
| Intermittent bugfix | `bugfix-flaky-reproduction-rate` | A low-rate failure is amplified into a measurable harness before root-cause work starts. |
| Unreproducible production bug | `bugfix-unreproducible-blocked` | The agent stops instead of guessing when no red-capable signal can be built and requests the minimum missing evidence. |
| Correct regression seam | `bugfix-correct-test-seam` | A shallow test that cannot reproduce the real multi-caller failure is rejected. |
| Minimal routing advice | `guide-shortest-chain` | The explicit Guide recommends L0 direct action with zero Skill and does not execute or create artifacts. |
| Routing matrix | `guide-routing-matrix` | The Guide distinguishes direct action, optional capability value, and independent-review floors without copying child methods. |

## Report Contract

A run report follows `evals/skills-suite/report.schema.json`.

`scripts/lib/run-report.mjs` owns report construction, schema-aligned runtime validation, field-shape normalization, and oracle evaluation. Callers consume its interface; they do not parse string/object variants or rebuild blocked/fail result shapes themselves.

Each case report records:

- `triggered_skills`
- `artifacts`
- `change_units`
- `goal_verification`
- `commands_run`
- `decisions`
- `forbidden_behaviors`
- `evidence`
- `status`

The evaluator treats missing or indirect evidence as failure. A passing report must satisfy every oracle check for every benchmark case.

## Scoring System

The evaluator now produces a 0-100 scenario-compliance score for real run reports. Pass/fail remains the hard gate: a report with failed oracle checks is still rejected even when a partial score can be computed.

The scoring model is declared in `evals/skills-suite/manifest.json` under `scoring_model` so suite comparisons use an auditable contract instead of hidden weights.

Current scoring axes:

| Axis | What It Measures |
|------|------------------|
| `routing` | Expected skills triggered and unexpected skills avoided |
| `artifacts` | Expected artifacts, including Change Units, were reported |
| `decisions` | Required decision gates were recorded |
| `verification` | Required commands and evidence text were present |
| `scope_control` | Forbidden behaviors were absent |
| `traceability` | Change Unit and goal verification evidence closed the trail |
| `goal_verification` | Goal verification oracle checks confirmed coverage |

Grades use the manifest thresholds: A >= 90, B >= 80, C >= 70, D >= 60, F < 60.

To write a machine-readable score report:

```bash
node scripts/evaluate-skills.mjs \
  --report .eval-runs/skills-suite/<run-id>/report.json \
  --score-out .eval-runs/skills-suite/<run-id>/score.json
```

`goal_verification` is scored from `goal_verified` and `goal_covers` oracle checks. Each check verifies that a goal document covers its stated targets. Missing checks lower the score proportionally.

## Experimental Forge vs No-Forge Comparison

Forge-vs-baseline uplift is an experimental comparison over this compliance suite, not a standalone effectiveness claim. The runner supports two prompt modes:

```bash
node scripts/run-skills-benchmark.mjs \
  --mode forge \
  --case legacy-chain-small-feature \
  --runs 2 \
  --run-id forge-default-chain

node scripts/run-skills-benchmark.mjs \
  --mode no-forge \
  --case legacy-chain-small-feature \
  --runs 2 \
  --run-id no-forge-default-chain
```

`forge` mode gives the agent the fixture task text, the answer-free report shape, and the published skill registry names, but not per-case oracle answers. `no-forge` mode strips Forge-specific scoring instructions from the fixture, gives the same product task plus a minimal JSON report shape, explicitly forbids Forge skills, and requires `triggered_skills: []`. Both modes require the final message to be the JSON report, while allowing at least one non-JSON progress evidence line during execution so `transcript_contains` can be scored from the event stream rather than the final self-report. This keeps the baseline close to "no large prompt" behavior without deleting product acceptance criteria.

Compare the two reports with the default repeated-sample gate:

```bash
node scripts/evaluate-skills.mjs \
  --allow-partial \
  --report .eval-runs/skills-suite/forge-default-chain/report.json \
  --baseline-report .eval-runs/skills-suite/no-forge-default-chain/report.json \
  --compare-out .eval-runs/skills-suite/default-chain-comparison.json
```

The comparison passes only when:

- the Forge report itself passes the normal hard oracle gate;
- both arms include repeated samples for the selected case set, with distinct `evidence_id` values;
- Forge's confidence interval lower bound is greater than the no-Forge baseline upper bound;
- Forge fair-comparison point-estimate score is at least `2.0x` the no-Forge baseline fair-comparison score, configurable with `--min-score-ratio`;
- Forge oracle-derived pass rate is not worse than the baseline pass rate.

The 2.0x threshold is currently calibrated from 2 selected n=1 cases (guide-shortest-chain and the historical pre-rename default-chain-small-feature run, now `legacy-chain-small-feature`), not a suite-level result. It must not be cited as a suite-level effectiveness claim until a full 23-case multi-run comparison with variance and confidence intervals is published.

Baseline reports are allowed to fail oracle checks because those failures are the measured comparison signal. They must still be valid v2 report shapes over the selected cases. Treat this comparison as a diagnostic until a held-out or externally reviewed effectiveness suite exists.

## Evaluation Discipline

- Keep fixtures stable across suite comparisons.
- Do not let the agent edit the manifest or report schema during the run.
- Score only after independent verification commands are recorded.
- Mark interrupted runs as incomplete instead of failed skill behavior.
- Compare suites by pass rate, scope control, verification evidence, and user intervention count.
- Treat score deltas as diagnostic signals, not as release approval when any hard oracle fails.
- Evaluate skill prose with `plugins/forge/skills/shared/rubrics/skill-quality.md`; runtime scenario-compliance evidence remains the release gate for this suite.
