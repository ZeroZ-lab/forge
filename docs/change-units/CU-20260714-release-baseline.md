# CU-20260714-release-baseline

## Type

- Release tooling and audit evidence

## Intent

- Trigger: Forge Next A08 / [GitHub #10](https://github.com/ZeroZ-lab/forge/issues/10) required a reproducible baseline for the current `0.52.0` package before later architecture work.
- Goal: Fail closed on package-content drift, prove the actual npm tarball can be installed and discovered in isolation, and retain event-level evidence from one real minimal Skill invocation.
- Out of scope: Publishing to npm, changing the Forge version, changing Skill behavior or invocation metadata, and claiming suite-level behavioral effectiveness.

## Source Baseline

- Implementation commit: `ab6bc6d77459c9ef16e568fdb000e4d1ddc2feb4` on `codex/forge-next`.
- The worktree was clean at that commit before this Change Unit was created.
- Package and all six plugin/marketplace version surfaces reported `0.52.0`:
  - `package.json`
  - `plugins/forge/.claude-plugin/plugin.json`
  - `plugins/forge/.codex-plugin/plugin.json`
  - `plugins/forge/.claude-plugin/marketplace.json`
  - `.claude-plugin/marketplace.json`
  - `.agents/plugins/marketplace.json`
  - `marketplace.json`
- Evidence time: `2026-07-14T14:21:39Z` to `2026-07-14T14:26:02Z` UTC.
- Environment: Darwin `25.5.0` arm64; Node `22.22.3` and `24.14.0`; npm `11.4.2`; Codex CLI `0.144.2`.

## Behavior Change

- `package.json#files` limits publication to the three repository marketplace entries and `plugins/forge/`; `scripts/package-files.allowlist.json` defines the exact 86-file package contract.
- `npm run check:package` compares the real `npm pack --dry-run --json --ignore-scripts` report with that allowlist and rejects missing, unexpected, duplicate, sparse, or unsafe entries. It also rejects relative README targets omitted from the package.
- `npm run plugin:smoke:packed` creates a real `.tgz`, rejects unsafe or non-regular tar members, extracts it, and installs it through Codex in temporary `HOME` and `CODEX_HOME` directories.
- The packed smoke distinguishes 27 public Skills, 28 packaged Skill directories including internal `shared`, and 24 model-invocable Skills. All source, installed, and model-visible inventories must match exactly.
- The real model invocation is read-only and ephemeral. Passing evidence requires one successful standalone `cat` of the installed `think/SKILL.md`, the complete installed body in command output, the final marker, no workspace mutation, no credential-path commands, and unchanged guarded configuration/authentication source.
- Model output is retained only after scanning for the actual full credential values and after invocation and zero-write checks pass. Temporary authentication uses mode `0600`; the enclosing temporary root uses `0700` and must be removed.
- Codex binary discovery preserves the existing precedence—explicit `CODEX_BIN`, standalone Codex app, then shell lookup—and adds the ChatGPT-bundled CLI only as a final fallback.
- README package links now resolve to repository URLs because `docs/` and `AGENTS.md` are intentionally excluded from npm. Release documentation now requires version bump before final validation and tarball smoke.

## Decision

- Decision id: `research_recommendation`.
- Accepted recommendation: **exact allowlist + actual tgz + isolated environment + event-level call evidence**.
- Rationale: a source-tree check cannot prove npm contents, a symlink install cannot prove the tarball, prompt discovery cannot prove a Skill was used, and model self-report cannot prove the installed file was read.
- Rejected alternatives:
  - Directory-root allowlisting alone: permits accidental private or experimental files under an allowed root.
  - `npm pack --dry-run` alone: does not prove the emitted archive is safe, installable, discoverable, or callable.
  - `debug prompt-input` alone: proves visibility but not real model invocation.
  - Persisting invocation output before credential checks: retains potentially sensitive failure artifacts.
- The current version remains `0.52.0`; this work establishes a baseline and does not constitute a release or version bump.
- Default Skill frontmatter, manifest `defaultPrompt`, and default invocation/routing logic were not changed.

## Affected Surface

- Package metadata: `package.json`.
- Release contracts: `scripts/package-files.allowlist.json`, `scripts/lib/package-contract.mjs`, `scripts/check-package-contents.mjs`.
- Packed smoke: `scripts/lib/packed-plugin-smoke.mjs`, `scripts/smoke-packed-plugin.mjs`, and the ChatGPT CLI fallback in `scripts/lib/codex-bin.mjs`.
- Regression coverage: `tests/package-contents.test.mjs`, `tests/packed-plugin-smoke.test.mjs`.
- Documentation: `README.md`, `docs/plugin-publishing.md`.
- No published Skill, plugin manifest, marketplace manifest, dependency, lockfile, or version changed.

## Package Receipt

- Package: `forge@0.52.0`, `forge-0.52.0.tgz`.
- Files: 86 actual / 86 allowed; `missing=[]`; `unexpected=[]`; excluded relative README targets `[]`.
- Size: 105,273 bytes packed; 274,909 bytes unpacked.
- Tarball SHA-256: `256c1c9428d5be6d907ff5a210f89a3e3826a524f36ebaf3b206f0329cd90847`.
- npm shasum: `c8bb5e9b76248937da18803457525d3637a0c577`.
- npm integrity: `sha512-IzhnakyGF8jcGfppuWIXBxnLH+Q7EEKvTuTUTHudtyylJgBfuDkHKStogyzInCdBA3y56cjLZRk7NoFCgH4e0Q==`.
- Allowlist SHA-256: `42216a7505adeb9c8d94ffb6f7eebd4c117fc55d5f01e5f41ea8c28cf9278c4f`.

## Invocation Receipt

- Evidence directory: `.eval-runs/release-baseline/a08-ab6bc6d-final/` (gitignored).
- Receipt: `.eval-runs/release-baseline/a08-ab6bc6d-final/receipt.json`, status `passed`.
- Installed Skill SHA-256: `41f9eda4078766ad6f2c52bf346fe6fb9a484f138d7da97eb76fa1d80678d86e`.
- Standalone installed-cache read command SHA-256: `64cf4a32b41a67b65475615d1500009567365dd7152eba2f46cac1baa6768d1b`.
- Prompt SHA-256: `464598cc1416eaf952177650f4d98ff78c48c7f285ddc73fb45705e68a68d449`.
- Events SHA-256: `1bee5f43ed481dc7011157b0c9819d162ccdb0eebd7784ed71783c8ccbd133d1`.
- Final-message SHA-256: `b177a2dd307bb1075e4c701d8d8a44d1488f9ad5c68b653e6b2c79516e7150d9`.
- Result: marker `FORGE_THINK_SMOKE`; credential-path accesses `0`; changed files `0`; workspace files `0`; credential output scan passed; guarded config and authentication source unchanged; cleanup complete.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Exact allowlist requires deliberate maintenance | Legitimate package additions fail the gate | Update the file and allowlist atomically; unexpected additions fail closed |
| Model execution is nondeterministic | A later smoke can fail despite unchanged packaging | Retain immutable receipt/event hashes and rerun on every final release candidate |
| Credential scan detects only full raw values | Truncated, encoded, or transformed material is outside this check | The smoke prompt allows only one specific read-only task, rejects credential-related commands, isolates credentials, and deletes temporary output on failure |
| Some orchestration failure paths lack an injected-runner integration test | Cleanup or retention regressions may first appear in a real smoke | Unit tests cover path, archive, credential, inventory, and evidence checks; every release candidate must run the real isolated smoke |
| npm normalizes `repository.url` during dry-run | Published metadata differs textually from the source field | Warning is recorded; package bytes and exact contents remain verified. A metadata-only cleanup can address it separately |
| Local smoke does not prove registry publication | A real publish could still encounter registry permissions or policy | Keep actual publication as an explicit release action; this Change Unit claims dry-run only |

## Verification

- Node 24 (`v24.14.0`, npm `11.4.2`):
  - `npm test` → exit 0; 131 passed, 0 failed.
  - `npm run validate` → exit 0; 27 Skills, version `0.52.0`.
  - `npm run eval:skills` → exit 0; 23-case contract passed with all 27 Skills covered; no behavioral-effectiveness claim.
  - `npm run metrics:chars` → exit 0; default chain 4,433 chars; all `SKILL.md` files 55,373 chars.
  - `npm run check:package` → exit 0; 86/86 files, no missing/unexpected files or excluded README targets.
- Node 22 (`v22.22.3`, npm `11.4.2`): `npm run check:supported` → exit 0; 131 tests passed, validator passed for 27 Skills, and the 23-case contract passed.
- Actual post-commit tarball smoke:
  - `CODEX_BIN=/Applications/ChatGPT.app/Contents/Resources/codex CODEX_AUTH_FILE=~/.codex/auth.json npm run plugin:smoke:packed -- --run-id a08-ab6bc6d-final` → exit 0; receipt status `passed`, package 86/86, inventories 27/28/24, invocation and isolation checks passed.
- Tagged publish simulation: `npm publish --dry-run --tag forge-next --json` → exit 0; `prepublishOnly` validation passed, 131 tests passed, and npm reported the same 86-file package, shasum, integrity, size, and unpacked size.
- An earlier dry-run attempt exited 127 because the ad-hoc validation environment omitted the npm executable directory from lifecycle `PATH`; rerunning with the workspace Node/npm directories in `PATH` exited 0 without a code change. This was an execution-environment failure, not package evidence.
- `git diff --check` and independent review → exit 0 / no P0, P1, or P2 correctness findings after fixes.
- Review-driven fixes included final-version smoke ordering, reachable packaged README links, guarding the default Codex home in API-key mode, standalone full-body Skill-read evidence, delayed output retention, and preserving Codex binary precedence.
- Not verified:
  - No actual npm publication or remote registry install was performed.
  - The static 23-case evaluator validates the benchmark contract only; no behavioral run report was supplied.
  - The credential scan is not a general-purpose DLP system and does not detect transformed or partial secrets.
  - Full injected-runner tests do not cover every subprocess and cleanup failure ordering.

## Rollback

- Revert implementation commit `ab6bc6d77459c9ef16e568fdb000e4d1ddc2feb4` and this Change Unit commit together.
- No data migration or published registry state exists to roll back.
- Safe stop: do not publish if the exact package check, real packed smoke, supported-Node contract, or tagged publish dry-run cannot be reproduced for the final candidate.

## Docs To Sync

- [x] `README.md` — packaged links and logo resolve outside the intentionally narrow npm contents.
- [x] `docs/plugin-publishing.md` — exact package, final-version smoke, isolation, and evidence requirements.
- [x] Package/manifest versions — verified aligned at `0.52.0`; intentionally unchanged.
- [x] Feature goal/modules/project/ADR — no change; this is repository release tooling and records its decision here.
- [x] Release evidence — one consolidated Change Unit; subordinate checks did not create parallel history.

## Completion Evidence

- Implementation commit `ab6bc6d` contains the complete package contract, packed smoke, documentation, and regression tests.
- Both supported Node majors pass the canonical contract; the final tarball and publish dry-run report the same package identity and hashes.
- The retained invocation evidence proves discovery and a real installed-cache Skill read without workspace mutation or default-state changes.
- Residual risks and non-claims are explicit; no release, version bump, or behavioral-effectiveness claim is implied.
