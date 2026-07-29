# Artifact policy

## Purpose

Keep durable project knowledge small, authoritative, and independently useful. A lifecycle stage is not automatically a document type.

## Default durable sources

1. `docs/project.md` — shared project decisions, constraints, and domain language.
2. `docs/features/<feature>/goal.md` — feature goal, boundary, completion criteria, and feature decisions when the task changes behavior or needs a durable shared contract; clear implementation-only L0/L1 work does not create one merely to enter a Skill.
3. `docs/features/<feature>/modules/*.md` — optional module interfaces and invariants when `goal.md` is not enough.
4. `docs/change-units/CU-<date>-<slug>.md` — one evidence record for each completed mutation.

`AGENTS.md` is the always-loaded Kernel runtime adapter projected from these sources. `CLAUDE.md` is an optional pointer to `AGENTS.md`. A Skill-only installation without this adapter is best-effort and must not claim host-enforced Kernel guarantees.

## Independent-artifact gate

Create an additional durable document only when all applicable conditions hold:

- it has a consumer or owner distinct from the feature implementer;
- it changes on a cadence different from `goal.md`;
- it has its own review, approval, audit, handoff, or operational responsibility;
- merging it into `goal.md` or a module would materially reduce usability.

Allowed gated artifacts:

- `DESIGN.md` — cross-feature visual system.
- `docs/adr/*.md` — surprising, hard-to-reverse project decisions.
- `PRD.md` — independently owned product contract.
- `interaction-spec.md` — complex interaction flow with independent design review.
- `research-brief.md` — research evidence that must survive independently.
- `testing/strategy.md` — cross-module, high-risk, or compliance test governance.
- `deploy/plan.md` — production rollout, migration, rollback, or operational handoff.
- `docs/thinking/*.md` — temporary reusable analysis; never the final fact source.

If the gate is not met, return the stage output in the conversation and write accepted conclusions into `project.md`, `goal.md`, a module, tests, or the Change Unit.

## Non-artifacts by default

Do not create:

- `changelog.md`, `timeline.md`, `status.md`, or `trace-*.md`;
- `plan.md` or standalone review reports;
- `testing/test-cases.md`;
- idea briefs or stage-completion reports.

Task sequences belong in the current conversation or issue tracker. Automated scenarios belong in test code. Change history and verification evidence belong in the Change Unit. Derived views may be generated from Change Units outside the project fact model, but are not maintained as source documents.

## Single-source rules

- A fact is defined once and referenced elsewhere.
- Optional artifacts refine the core sources; they do not duplicate them.
- Accepted decisions from research, thinking, review, or planning must be written back to an authoritative source before implementation depends on them.
- Removing an optional artifact must leave the project goal and decision history understandable.
