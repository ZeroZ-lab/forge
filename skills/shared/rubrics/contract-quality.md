# Contract quality rubric

Use this rubric when checking whether a contract can drive reliable projection.

| Dimension | Check |
|-----------|-------|
| Source completeness | WHAT, WHY, HOW, and CONSTRAINTS are present. |
| Decision traceability | Each major choice has reason and rejected alternatives. |
| Reconstructability | Entrypoints, public interfaces, dependencies, and orchestration are explicit. |
| Downstream safety | Downstream dependency table identifies consumers and sync status. |
| Runtime fit | Acceptance conditions can drive tests, review, and codegen checks. |
| Drift handling | Changes can produce a clear cascade update or human decision point. |

Contracts that fail source completeness or reconstructability should not proceed directly to codegen.
