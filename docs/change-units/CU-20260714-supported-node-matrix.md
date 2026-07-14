# CU-20260714-supported-node-matrix

## Type

- Tooling and compatibility contract

## Intent

- Trigger: Forge Next A02 / GitHub #7 found no declared Node support line and no executable CI evidence across maintained runtimes.
- Goal: Publish the supported Node majors, run the same test/validator/evaluation contract on each one, and make the failing major and command visible.
- Out of scope: Dependency-lock installation, non-LTS Node releases, behavioral benchmark runs that require Codex CLI, and release-version changes.

## Behavior Change

- `package.json#engines.node` now declares Node 22 and 24 as the supported majors.
- `npm run check:supported` is the canonical local compatibility contract: tests, repository validation, then the skills-suite contract evaluator.
- GitHub Actions runs the same three commands on Node 22 and 24 with separate, non-fail-fast matrix jobs and explicit runtime-version output.
- A focused contract test keeps the package declaration, local command sequence, CI matrix, failure-localization labels, action majors, and least-privilege setting aligned.

## Affected Surface

- Package runtime metadata and local validation commands.
- GitHub Actions CI on pushes and pull requests.
- Project-level runtime decision and compatibility-contract documentation.
- No production code, skill behavior, dependency, lockfile, plugin manifest, or package version change.

## Decisions

- Support Node 22 and 24 because both are LTS lines on 2026-07-14; exclude EOL Node 20 and Current Node 26 from the production support promise.
- Re-evaluate the support set at release time against the official Node.js release lifecycle instead of silently expanding an open-ended semver range.
- Keep CI commands as named steps rather than one opaque `npm run check:supported` step so a failure identifies both the Node major and failed contract. The focused test enforces semantic equality with the local aggregate command.
- Disable package-manager caching because this repository has no runtime dependencies or lockfile to install.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Node lifecycle status changes after this decision | The declared support set becomes stale | PD10 requires an official lifecycle review at each release |
| Local isolated runtimes differ from GitHub-hosted Ubuntu runners | Platform-specific CI failure could remain | Local equivalent matrix evidence is recorded below; the first pushed workflow run remains required remote evidence |
| Text-level workflow checks miss a YAML or Actions semantic edge | Static contract can pass while the hosted workflow fails | Use current official action majors and retain the remote run as an unverified item until push |
| The command sequence is duplicated between package metadata and CI | A later edit could drift | `node-support-contract.test.mjs` derives and compares both sequences |

## Verification

- Red-capable evidence: `node --test tests/node-support-contract.test.mjs` initially failed before the engine, aggregate command, and workflow contract existed.
- Focused contract: `node --test tests/node-support-contract.test.mjs` → exit 0; 2 tests passed.
- Local equivalent matrix:
  - Node `v22.23.1`, npm `11.4.2`: `npm run check:supported` → exit 0; 119 tests passed, validator passed for 27 skills, and the 23-case skills-suite contract passed.
  - Node `v24.14.0`, npm `11.4.2`: `npm run check:supported` → exit 0; 119 tests passed, validator passed for 27 skills, and the 23-case skills-suite contract passed.
- The evaluator reported that no behavioral run report was supplied; behavioral effectiveness is not claimed by this compatibility check.
- Not verified: GitHub-hosted Actions execution and run URL. That evidence can only be attached after the branch is pushed.

## Rollback

- Remove `.github/workflows/ci.yml` and `tests/node-support-contract.test.mjs`.
- Remove `engines.node` and `check:supported` from `package.json`, then remove PD10 and the related project command/constraint from `docs/project.md`.
- Do not describe the repository as supporting a Node matrix after rollback.

## Docs To Sync

- [x] `docs/project.md` — PD10, public/CI contracts, official lifecycle source, and local command.
- [x] Feature goal/modules — N/A; repository tooling contract.
- [x] Release metadata — unchanged; this ticket does not publish a new Forge version.

## Completion Evidence

- The declared Node majors, local aggregate command, and expanded CI steps are mechanically aligned.
- Both supported majors have executed the complete local contract successfully with exact patch versions recorded.
- The remaining remote-run evidence is explicit and cannot be mistaken for a completed GitHub Actions run.
