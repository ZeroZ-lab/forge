# Runtime control loop anchor

Forge runtime control is built from protocol nodes:

```
User task
  -> route to skill
  -> read current state
  -> produce or update documents
  -> downstream skill consumes documents
  -> code or acceptance work exposes deviation
  -> deviation signal flows back
  -> code, documents, release plan, or methodology changes
```

## Three loops

| Loop | Scope | Runtime path |
|------|-------|--------------|
| Fast | Single task | `codegen` projects code, validates, and handles L0/L1/L2. |
| Middle | Iteration | `detail` revises contract and checks downstream drift. |
| Slow | Cross-project | `review` attributes deviations and `learn` proposes methodology changes. |

## Stop conditions

- Setpoint lacks WHY but codegen is requested.
- `codegen` reports L2 drift.
- `detail` finds downstream drift with unclear impact.
- `review` finds unresolved P0/P1 issues.
- `deploy` lacks concrete rollback or health checks.
- `learn` lacks repeated evidence for a methodology change.
