# CU-20260714-architecture-view-feature-boundary

## Type

- Security bugfix

## Intent

- Trigger: Forge Next A03 / GitHub #3 identified that the architecture-view `feature` identifier was interpolated into read and default-output paths without validation.
- Goal: Reject traversal, absolute, encoded-separator, Windows-separator, dot-segment, and NUL feature identifiers before any feature document read or output write.
- Out of scope: Explicit `--out` containment and symlink escape prevention; those remain A04 / GitHub #8.

## Behavior Change

- CLI and programmatic `buildViewModel` calls now require `feature` to be one path segment.
- Both raw and successfully percent-decoded forms are checked so encoded traversal or separators cannot bypass the boundary without rejecting safe literal percent names.
- Legitimate single-segment identifiers retain their existing behavior; no lowercase or kebab-case restriction was introduced.

## Affected Surface

- Architecture-view CLI argument validation.
- Architecture-view programmatic view-model construction.
- Architecture-view renderer regression tests.
- No change to view-model schema, published skill routing, dependencies, or version.

## Decisions

- Validate inside `buildViewModel` as well as `parseArgs`, because programmatic callers can bypass CLI parsing.
- Treat POSIX and Windows path forms as unsafe regardless of the host platform.
- Do not normalize or rewrite unsafe input; reject it before I/O.
- Preserve non-kebab single-segment feature names for compatibility.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| A project intentionally uses percent-encoded separators in a directory name | That unusual feature can no longer be rendered | The public contract calls the value a feature slug; encoded path separators are ambiguous and unsafe |
| Explicit `--out` can still point outside the selected root | CLI retains an independent write escape | A04 owns output and symlink containment; A03 does not claim the entire CLI is contained |
| Feature or output directories are symlinks | Real filesystem targets may escape lexical boundaries | A04 must add realpath/symlink checks before the security surface is fully closed |

## Verification

- Red-capable evidence:
  - `node --test tests/architecture-view-renderer.test.mjs` initially failed because `../../../outside-feature` was accepted and read from outside the selected project root.
- Commands and results:
  - `node --test tests/architecture-view-renderer.test.mjs` → exit 0; 7 tests passed.
  - `node scripts/validate.mjs` → exit 0; `Forge validation passed (27 skills, version 0.52.0).`
  - `node --test 'tests/*.test.mjs'` → exit 0; 98 tests passed, 0 failed.
- Boundary cases covered: traversal, nested POSIX/Windows paths, dot segments, absolute paths, encoded traversal/separators (including a malformed-percent suffix), encoded/raw NUL, a safe literal-percent name, direct API calls, CLI calls, and absence of external output.
- Not verified: symlink and explicit `--out` containment, intentionally deferred to A04.

## Rollback

- Remove the feature-identifier guard and its regression test, then remove this CU.
- Security safe stop: do not describe architecture-view as root-contained until A04 also passes.

## Docs To Sync

- [x] `docs/project.md` — no new project decision; existing security and minimal-change disciplines apply.
- [x] Architecture-view skill contract — no change required; it already defines the input as `<feature-slug>`.
- [x] Feature goal/modules — N/A; repository tool security fix.

## Completion Evidence

- The red test reproduced a root-escape read through the public programmatic seam.
- The same invalid identifier set is rejected through both direct and CLI entrypoints before output creation.
- Existing valid rendering, HTML, source-reference, missing-module, and coverage behavior remains green.
