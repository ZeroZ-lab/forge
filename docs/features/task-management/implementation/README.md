# Task Management Implementation Projection

> This directory is an illustrative code projection from the task-management contracts. It is not a runnable sample application.

## Purpose

The files under `src/` show how Forge documents can project into implementation layers:

- `db/` maps database decisions into Drizzle schema and migration shape.
- `middleware/` maps API cross-cutting decisions such as auth, errors, and idempotency.
- `routes/`, `services/`, and `schemas/` map API modules into code boundaries.
- `tests/` records contract-test intent and expected coverage shape.

## Current Boundary

This projection is intentionally incomplete as a runnable app:

- There is no local `package.json`, `tsconfig.json`, app entrypoint, or database bootstrap for this sample.
- The contract tests contain placeholder assertions such as `expect(true).toBe(true)` to document expected scenarios.
- Some code paths are intentionally sketch-level and must not be treated as production-ready implementation.

Use this directory as a documentation and structure example. Do not cite it as evidence that the generated application builds, runs, or passes tests.

## To Make It Runnable

A future optimization should either move this into a real sample app with dependencies, fixtures, and executable tests, or keep it permanently marked as a projection example and exclude it from runtime claims.
