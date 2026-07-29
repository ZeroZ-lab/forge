# Adaptive Kernel runtime

> Forge production runtime contract. Kernel constraints are always-on project/host instructions; Skills are optional capabilities, not mandatory workflow stages.

## Kernel boundary

Kernel owns only:

1. **Objective** — goal, non-goals, acceptance criteria.
2. **Authority** — permissions, external effects, confirmation gates.
3. **Scope** — writable surface, protected facts, unrelated findings.
4. **State** — in progress, partial, blocked, completed, and retained mutations.
5. **Evidence** — executed commands, observed output, diffs, verifier results, and unverified items.
6. **Outcome** — whether the objective is satisfied without violating authority, scope, safety, or evidence integrity.

Kernel must not choose or score:

- a lifecycle stage or fixed Skill chain;
- Skill activation count or order;
- implementation strategy or internal reasoning;
- model capability from a model name;
- completion from a self-report, stage completion, or action path.

Direct action is first-class. A model may use any, multiple, or zero Skills. Skipping a Skill is legal when its marginal value does not exceed its context and execution cost.

## Adaptive decision

Before loading a Skill, the Chain Owner checks:

1. Is the objective and observable completion condition already clear?
2. Does the task expose uncertainty or risk that this Skill uniquely reduces?
3. Is the relevant fact already authoritative in project docs or code?
4. Would direct action preserve scope, authority, and the verification floor?
5. Is the Skill's expected value greater than its context, artifact, and coordination cost?

If the answers support direct action, act directly. If a Skill is useful, load only that capability and its required references. Selecting one Skill does not imply a next Skill.

The pinned Forge 0.52.0 `detail → codegen → review` chain is an explicit legacy compatibility preset and effectiveness baseline, not the production default.

## Chain Owner

For one user objective, the root agent is the single Chain Owner:

- maintains the global objective, authority, scope, task state, and completion claim;
- decides direct action versus optional Skill use;
- marks each Skill invocation as standalone or a child of the current objective;
- integrates child results and resolves conflicts;
- owns review-independence decisions and final user delivery;
- writes the single consolidated Change Unit when retained mutation requires one.

A child Skill returns only its local evidence package:

```text
changed files
decisions and rejected options
risks
verification commands and observed results
unverified or unresolved items
recommended next action (advisory only)
```

A child does not own global completion, silently invoke a fixed successor, or write a second Change Unit.

## Verification and review

Kernel verification is always required by D7/D9 and is distinct from the optional `review` capability:

- **L0/L1** — the Chain Owner may perform a self-check, but must not label it independent review.
- **L2/L3 or P0/P1** — an independent reviewer/verifier is required before claiming complete or release-ready.
- **Unavailable independent review** — report the residual risk and missing verification boundary; remain partial/correctly blocked as appropriate, and do not upgrade self-check to independent evidence.

Independence requires a boundary the implementation context does not control:

- an **independent reviewer** did not implement the change, works from a separate context/actor, and returns source-backed findings against the objective and diff;
- an **independent verifier** is a predeclared or host-private check whose inputs and retained observations cannot be rewritten by the implementation context;
- a Chain Owner running ordinary local tests is verification only; relabeling it, a same-context reread, or model self-report as independent evidence is forbidden.

Outcome depends on acceptance, authority, scope, safety, evidence integrity, and task state. Skill/stage/action-path telemetry cannot compensate for a failed hard constraint.

## Persistence and recovery

- Task sequence and live state stay in the current task or issue, not a new status artifact.
- After interruption, the Chain Owner restores objective, completed work, retained mutations, pending verification, residual risk, and CU ownership before continuing.
- The Change Unit is an evidence sink after retained mutation, not a workflow controller.
- A read-only or fully rolled-back run writes no Change Unit.

## Platform boundary

`AGENTS.md` or an equivalent always-loaded host policy projects the Kernel contract. A Skill-only installation without an always-loaded project/host instruction provides best-effort guidance, not enforceable Kernel guarantees.
