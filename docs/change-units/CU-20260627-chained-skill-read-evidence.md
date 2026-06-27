# CU-20260627-chained-skill-read-evidence

## Intent

Make independent skill-read evidence recognize real `SKILL.md` reads inside chained shell commands.

The `bugfix-unreproducible-blocked` Forge smoke run read `codegen/SKILL.md` with a command shaped like `pwd && sed .../skills/codegen/SKILL.md && ...`. The evidence collector only inspected the first command verb, so it treated the real read as missing.

## Behavior Change

- `skillWasRead` still rejects `echo`, `find`, failed reads, and path-only cheats.
- A chained shell command now counts when a real content-read verb (`sed`, `cat`, `rg`, etc.) appears in the same command segment before `skills/<name>/SKILL.md`, exits 0, and returns non-empty output.
- The completed `bugfix-unreproducible-blocked` Forge repeat now scores `100/100` with `15/15` independent oracle checks.

## Impacted Surface

- `scripts/lib/evidence-collector.mjs`
- `tests/evidence-collector.test.mjs`

## Decisions

- Keep the detector command-string based because Codex event streams expose shell command text and output, not structured file-open events.
- Require both a read verb and non-empty output, preserving the existing echo/path-only hardening.
- Do not infer skill reads from self-report `triggered_skills`.

## Risks

- Complex shell quoting could still hide a real read from this lightweight detector.
- This only improves evidence recognition; it does not make a blocked no-Forge baseline run available.

## Verification

```bash
node --test tests/evidence-collector.test.mjs
```

Result: 26 tests pass / 0 fail.

```bash
node scripts/evaluate-skills.mjs --allow-partial --skip-blocked --report .eval-runs/skills-suite/20260627-forge-bugfix-unrepro-2x-smoke/report.json --score-out /tmp/forge-bugfix-unrepro-score-after-skill-read.json
```

Result: completed Forge repeat passed with `15/15` independent oracle checks; one repeat was skipped as blocked by Codex usage limit.

## Unverified

- The no-Forge `bugfix-unreproducible-blocked` baseline run was blocked by Codex usage limit.
- No Forge-vs-no-Forge comparison for this case was completed.
- No full 21-case multi-run comparison was executed.

## Rollback

Revert this CU plus the edits to `scripts/lib/evidence-collector.mjs` and `tests/evidence-collector.test.mjs`.

## Authoritative Documents Synchronized

- No project-level docs changed. This CU records the evidence-collector behavior change and its limited runtime evidence.
