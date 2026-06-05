# code-map-template.md — CODE_MAP.yml

> `docs/CODE_MAP.yml` is the projection map from source documents to generated or maintained code. It is part of Rebuild Control.

```yaml
version: 1
generated_from: forge
entries:
  - source: docs/features/<feature>/contract.md
    projects_to:
      - src/<feature>/index.ts
      - tests/<feature>.test.ts
    contract_ids:
      - FD1
    verification:
      - node --test
    notes: Pending
```

## Rules

- Every changed contract/module doc that drives code must have an entry.
- If codegen infers a mapping, record it as `notes: inferred by codegen` and add it to the active CU.
- Generated visual docs may reference CODE_MAP, but do not become the source of truth.
