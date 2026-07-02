# Change evidence persistence

## Purpose

Concentrate durable change evidence behind one internal interface. Skill modules provide change context; they do not invent additional history stores.

## Inputs

- **Invocation mode**: standalone or child of an orchestrator.
- **Mutation**: whether project, feature, implementation, test, release, or methodology artifacts changed.
- **Scope**: project-level, feature-level, cross-feature, or release.
- **Local evidence**: changed files, decisions, risks, and verification results.

## Rules

1. No mutation means no Change Unit write.
2. A child skill does not persist history. Its orchestrator writes one consolidated record after all child exit conditions pass.
3. Every mutating standalone lifecycle run or completed orchestrator run creates one `docs/change-units/CU-<date>-<slug>.md`.
4. The Change Unit records intent, behavior change, affected surface, decisions, risks, verification evidence, rollback, and authoritative documents synchronized.
5. Do not create or update changelog, timeline, or status documents. Execution receipts (command + output evidence required by D9) are captured inside the Change Unit's Verification / Completion Evidence section, not as standalone trace files.
6. When a durable decision changed, update its authoritative project, feature, module, ADR, test-governance, or deployment document before closing the Change Unit.
7. Existing legacy history files are read-only historical material unless the user explicitly requests migration.

## Local exceptions

- `review` persists only when the review changes durable documents, release state, or methodology.
- `learn` persists only after the user confirms the archive decision inside the current project boundary; cross-project lessons remain suggestions until confirmed in their target project or global asset flow.
- `think` may archive superseded thinking documents, but accepted conclusions must be written back to an authoritative source.
