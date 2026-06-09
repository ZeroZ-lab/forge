# Goal quality rubric

Use this rubric when checking whether a goal can drive reliable implementation.

| Dimension | Check |
|-----------|-------|
| Source completeness | WHAT, WHY, HOW, and CONSTRAINTS are present. |
| Decision traceability | Each major choice has reason and rejected alternatives. |
| Reconstructability | Entrypoints, public interfaces, dependencies, and orchestration are explicit. |
| Downstream safety | Downstream dependency table identifies consumers and sync status. |
| Runtime fit | Acceptance conditions can drive tests, review, and codegen checks. Every data field referenced by a measurable AC has a verifiable constraint (range / enum / threshold). Fields with no AC assertion may stay unconstrained (AI self-drives — D2). |
| Cross-document consistency | The same interface / Props / AC behavior / named technique is identical (or single-sourced via reference) across goal, notes, modules, and PRD. No doc rewrites an AC assertion or silently rejects a PRD-named technique. |
| Module index completeness | Every module in the index has a spec, or all are inlined into goal — no priority-based partial generation (P0/P1 with spec, P2 without). |
| Drift handling | Changes can produce a clear cascade update or human decision point. |

Goals that fail source completeness or reconstructability should not proceed directly to codegen.
Goals that fail cross-document consistency must resolve to a single source (or escalate) before codegen.
