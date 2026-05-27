# Execution discipline

Forge methods define what should happen; execution discipline defines how an AI agent changes the project without creating drift.

## Runtime meaning

- State the goal, boundary, assumptions, and verification target before non-trivial edits.
- Prefer the smallest change that satisfies the current contract.
- Touch only files that directly trace to the requested goal or required contract synchronization.
- Record unrelated findings instead of fixing them opportunistically.
- After code or contract changes, run the available verification or state why it cannot run.

## Decision boundaries

Stop and ask the human when a change would:

- replace an architecture decision rather than implement an existing one;
- introduce a new dependency, compatibility layer, or configuration surface;
- delete or rename a public API, persisted field, or contract section;
- keep failing after repeated same-class fixes, suggesting the setpoint is wrong.

## Projection rule

Generated project instructions should inherit this discipline in compressed form. They should not copy Forge internals, but they must preserve the same execution constraints: clarify, minimize, scope, and verify.
