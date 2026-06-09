# Goal quality rubric

Use this rubric when checking whether a goal can drive reliable implementation.

| Dimension | Check |
|-----------|-------|
| Source completeness | WHAT, WHY, HOW, and CONSTRAINTS are present. |
| First-screen contract | Goal / boundary / done criteria sit in the first read window (~30 lines) so an agent that reads only the first chunk still has every hard constraint. Implementation detail is pushed behind pointers, not inlined up front. |
| Decision traceability | Each major choice has reason and rejected alternatives. |
| Reconstructability | Entrypoints, public interfaces, dependencies, and orchestration are explicit. |
| Downstream safety | Downstream dependency table identifies consumers and sync status. |
| Runtime fit | Acceptance conditions can drive tests, review, and codegen checks. Acceptance conditions prefer EARS phrasing (`WHEN <trigger>, the system SHALL <observable behavior>`) so each is independently verifiable. Every data field referenced by a measurable AC has a verifiable constraint (range / enum / threshold). Fields with no AC assertion may stay unconstrained (AI self-drives — D2). |
| Assumptions exposed | Uncertain requirements/decisions are marked `[NEEDS CLARIFICATION: ...]` rather than silently assumed (D6). No unresolved clarification marker may remain when entering codegen. |
| Cross-document consistency | The same interface / Props / AC behavior / named technique is identical (or single-sourced via reference) across goal, notes, modules, and PRD. No doc rewrites an AC assertion or silently rejects a PRD-named technique. |
| Module index completeness | Every module in the index has a spec, or all are inlined into goal — no priority-based partial generation (P0/P1 with spec, P2 without). |
| Drift handling | Changes can produce a clear cascade update or human decision point. |

Goals that fail source completeness or reconstructability should not proceed directly to codegen.
Goals that fail cross-document consistency must resolve to a single source (or escalate) before codegen.
Goals with unresolved `[NEEDS CLARIFICATION: ...]` markers must escalate to a human decision before codegen.
