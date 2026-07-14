# CU-20260714-architecture-view-output-boundary

## Type

- Security bugfix

## Intent

- Trigger: Forge Next A04 / GitHub #8 found that custom architecture-view output paths were resolved and written without project-boundary or symlink checks.
- Goal: Keep every output inside the selected project after normalization and real-path resolution, without breaking legal custom output paths.
- Out of scope: Hostile concurrent replacement of an ancestor after the final check, hard-link aliases, mount/junction policy, and non-output input boundaries.

## Behavior Change

- `runCli` preflights a requested/default output before document rendering and rejects any normalized request whose real destination leaves the project.
- Missing destinations are resolved through their nearest `lstat`-visible ancestor; that ancestor and the reconstructed destination must both remain under the project's real path.
- Existing files, final symlinks, ancestor symlinks, dangling symlinks, and a symlinked project root now pass through the same containment planner.
- Symlinks that resolve outside the project are rejected without modifying their targets. Symlinks that resolve inside remain usable.
- When the project root itself is a symlink, callers may address a legal output through either the linked root or its canonical real path.
- The destination is checked again after parent creation and opened with `O_NOFOLLOW` when the platform exposes it, while the public return value remains the normalized requested path.

## Affected Surface

- Architecture-view CLI output planning and file creation.
- Public `runCli` regression coverage for relative, absolute, existing, missing, normalized, and symlinked paths.
- No view-model schema, feature-input policy, published skill routing, dependency, manifest, or version change.

## Decisions

- Use `path.relative` containment rather than string-prefix comparison.
- Resolve the nearest existing entry with `lstat`, not `existsSync`, so dangling symlinks cannot masquerade as missing safe paths.
- Permit internal symlinks because the security boundary is the project real path, not the absence of links.
- Preserve existing regular-file overwrite behavior for valid outputs; rejection never unlinks, truncates, or cleans a foreign path.
- Recheck after directory creation and protect the final component where the OS supports no-follow open semantics.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| An attacker swaps an ancestor after the final real-path check | A narrow TOCTOU window remains on a hostile shared filesystem | Recheck after parent creation and use `O_NOFOLLOW` for the final component; full ancestor race elimination needs OS-specific dirfd/openat2 or sandboxing |
| Windows junction/reparse behavior differs from POSIX symlinks | A platform-specific escape could remain | Lexical and real-path checks are portable; F01 must exercise Windows-host behavior before cross-platform release claims |
| Hard links or bind mounts expose the same inode outside | Real-path containment does not express that threat model | Record as residual; Forge does not create links or mounts and this ticket protects path traversal/symlink escapes |
| Conservative dangling-symlink rejection blocks an inside-intended link | A rare custom path needs repair first | Requiring a resolvable target avoids guessing security-sensitive intent |

## Verification

- Red-capable evidence:
  - `node --test tests/architecture-view-renderer.test.mjs` initially showed `../outside.html`, an absolute foreign file, and an outside-pointing directory symlink were writable through public `runCli`.
  - Independent spec review then exposed a legal-path false rejection for symlinked `--root` plus a canonical absolute `--out`; the added regression failed 9/10 before the containment planner accepted both identities.
- Commands and results:
  - `node --test tests/architecture-view-renderer.test.mjs` → exit 0; 10 tests passed.
  - `npm run check:supported` on Node 24.14.0 / npm 11.4.2 → exit 0; 119 tests passed, validator passed for 27 skills, and the 23-case benchmark contract passed.
- Regression scenarios: normalized relative output, linked-root and canonical-real-root absolute output, existing-file overwrite, missing nested directories, outside relative/absolute paths, outside ancestor/final/dangling symlinks, inside ancestor/final symlinks, symlinked project root, default output, and unchanged foreign sentinels.
- Not verified: Windows junction behavior or adversarial concurrent ancestor replacement.

## Rollback

- If no-follow open causes a platform regression, remove only that flag while retaining normalization, real-path planning, rechecks, and the documented residual race.
- Full security-safe rollback: disable all file output in `runCli` (JSON without `--out` may continue on stdout), then remove the containment planner/tests and this CU. Do not restore direct unbounded writes.

## Docs To Sync

- [x] `docs/project.md` — no new project decision; existing security and minimal-change disciplines apply.
- [x] Architecture-view skill contract — no change required; output location remains configurable but project-contained.
- [x] Feature goal/modules — N/A; repository tool security fix.

## Completion Evidence

- Public-seam red tests reproduced both lexical and symlink escapes before the guard.
- Legal normalized, absolute, existing, missing, and internal-link outputs remain writable with the prior return contract.
- Rejected paths leave existing outside files unchanged and do not create missing outside targets.
