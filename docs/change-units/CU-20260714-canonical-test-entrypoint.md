# CU-20260714-canonical-test-entrypoint

## Type

- Tooling

## Intent

- Trigger: Forge Next A01 / GitHub #4 found that `prepublishOnly` bypassed the canonical test script and invoked an invalid Node test target.
- Goal: Make local tests, validation, and the publish lifecycle share the same public npm script entrypoints.
- Out of scope: Node-version CI, package-content allowlists, local plugin installation smoke tests, and release version changes.

## Behavior Change

- `prepublishOnly` now composes `npm run validate && npm test` instead of duplicating validator and test-runner commands.
- A public-seam regression test reads `package.json` and rejects future drift away from the canonical test and publish entrypoints.

## Affected Surface

- Package lifecycle scripts.
- Tooling regression tests.
- No runtime skill behavior, published manifest, or version change.

## Decisions

- Keep `npm test` as the canonical test seam rather than introducing another test runner wrapper.
- Reuse named package scripts from `prepublishOnly` so future changes have one owner.
- Test the package-script contract through `package.json`, not internal validator implementation details.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| A package manager implements lifecycle recursion differently | Publish validation could fail only at release time | The script uses standard npm lifecycle composition; A08 retains an actual package/install smoke gate |
| Canonical test glob omits a future nested test | New tests may not run | The public-seam regression test preserves the current contract; changing test layout requires updating the canonical entrypoint deliberately |

## Verification

- Red-capable evidence:
  - `node --test tests/package-scripts.test.mjs` initially failed because actual `prepublishOnly` was `node scripts/validate.mjs && node --test tests/`.
- Commands and results:
  - `node --test tests/package-scripts.test.mjs` → exit 0; 1 test passed.
  - `pnpm run validate` → exit 0; `Forge validation passed (27 skills, version 0.52.0).`
  - `pnpm test` → exit 0; 97 tests passed, 0 failed.
  - `pnpm --package=npm@11.4.2 dlx npm test` → exit 0; the real npm CLI invoked the canonical test entrypoint and 97 tests passed.
  - `pnpm --package=npm@11.4.2 dlx npm publish --dry-run --tag forge-next` → exit 0; npm invoked `prepublishOnly`, validation passed, 97 tests passed, and the dry-run package completed.
  - The same dry-run without an explicit non-latest tag reached and passed `prepublishOnly` but exited 1 because the public `forge` package already has a higher `latest` version (`2.3.0`). This is a registry/tag constraint, not a lifecycle-script failure; A08 must retain an explicit safe dry-run tag.
- Not verified: none for A01. Package allowlisting and local plugin installation remain scoped to A08.

## Rollback

- Restore the previous `prepublishOnly` value, remove the regression test, and remove this CU.
- Safe stop: do not publish if an npm-capable A08 smoke run cannot execute both validation and the canonical test suite, or if release tagging is ambiguous.

## Docs To Sync

- [x] `docs/project.md` — no change; the existing narrow-validation project rule remains authoritative.
- [x] Feature goal/modules — N/A; this is repository tooling.
- [x] Release/deploy docs — N/A; no release occurred.

## Completion Evidence

- The package lifecycle references the named canonical scripts.
- The public-seam regression test protects the contract without duplicating it in the validator.
- The regression test demonstrated red before green.
- The narrow test, full test suite, validator, real npm test entrypoint, and tagged npm publish dry-run pass under the bundled workspace runtime.
