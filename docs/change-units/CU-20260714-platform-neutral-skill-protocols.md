# CU-20260714-platform-neutral-skill-protocols

## Type

- Methodology and validation contract

## Intent

- Trigger: Forge Next A07 / GitHub #6 found normative published instructions coupled to one host's delegation and choice tool syntax.
- Goal: Express delegation and user choice as capability-level contracts, preserve behavior when structured host controls are unavailable, and reject new platform-specific instruction syntax during validation.
- Out of scope: Migrating `${CLAUDE_SKILL_DIR}`, proving identical behavior across live Claude/Codex runs, or changing invocation metadata.

## Behavior Change

- `improve` now delegates bounded read-only source investigation through the shared delegation matrix when an independent worker is available; otherwise the controller performs the investigation locally and declares the independence limitation.
- Candidate selection is now a semantic choice protocol: 2–4 options, one evidence-backed recommendation, per-option tradeoffs, and a custom path.
- The shared decision protocol maps that contract to a host-provided structured choice only when the control can represent the current option count and every semantic field; all other host contexts use numbered options.
- The repository validator scans every published skill Markdown file against a maintained registry of known banned host syntax and reports file, line, and token evidence.

## Affected Surface

- Published `improve` discovery and selection protocol.
- Shared decision-presentation concept used by skill decision points.
- Validation pipeline and focused portability regression tests.
- No source generator, runtime adapter, manifest, package version, or invocation metadata change.

## Decisions

- Standardize semantic capabilities rather than the names and parameters of host tools.
- Use a host control only when it can represent the current option count and every semantic field; otherwise the numbered fallback is required.
- Keep the fallback behavior-equivalent: changing the interaction surface must not remove the recommendation, tradeoffs, or custom choice.
- Preserve independent investigation as an optional capability, not a mandatory topology; local controller execution is the safe fallback.
- Scan only published skill Markdown. Historical documents and implementation code may legitimately discuss host APIs and are not normative runtime instructions.
- Treat `${CLAUDE_SKILL_DIR}` migration as a separate compatibility task because it concerns path resolution rather than delegation or decision semantics.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| A host maps the semantic contract incompletely | Recommendation or custom choice could disappear | Shared protocol defines required fields and an equivalent numbered fallback |
| The maintained syntax registry cannot detect unknown or obfuscated provider APIs | A new form could bypass the static gate | The gate names only known banned tokens, covers call/object and `:`/`=` variants, and is extended through red-capable tests when hosts add APIs |
| Text scanning can reject a future explanatory example | Validator false positive | Scope is limited to published Markdown and reports exact locations; explicit platform examples belong in separated adapter documentation, not normative protocols |
| Local fallback lacks independent review | Discovery confidence is lower | `improve` must declare the independence limitation and retain source-location evidence |
| Static validation is mistaken for cross-host behavior proof | Compatibility is overstated | Verification explicitly claims protocol and regression coverage only |

## Verification

- Red-capable evidence:
  - `node --test tests/skill-portability.test.mjs` first failed because the scanner module did not exist.
  - After scanner integration, `node scripts/validate.mjs` reported 12 exact platform-specific findings across `improve/SKILL.md` and `decision-presentation.md`.
  - The published-protocol test remained red until both documents exposed the platform-neutral delegation and choice fallbacks.
- Commands and results:
  - `node --test tests/skill-portability.test.mjs` → exit 0; 4 tests passed, including static compatibility for (1) structured choice with independent delegation and (2) numbered text choice with a single local controller.
  - `node scripts/validate.mjs` → exit 0; `Forge validation passed (27 skills, version 0.52.0).`
  - `node --test tests/*.test.mjs` → exit 0; 109 tests passed, 0 failed.
  - `node scripts/evaluate-skills.mjs` → exit 0; benchmark contract passed for 23 cases and 27 skills; no behavioral-effectiveness claim.
  - `node scripts/measure-char-footprint.mjs` → exit 0; default chain 4,433 chars and all published skill files 54,695 chars.
- Not verified: Live structured controls or independent-worker behavior on each supported host.

## Rollback

- Validator-only rollback: remove the portability import and scan from `scripts/validate.mjs` plus `scripts/lib/skill-portability.mjs` and its focused tests; keep the platform-neutral protocol text and update this CU to remove the enforcement claim.
- Full rollback: atomically restore the prior `improve` and decision-presentation text, remove the validator/module/tests, and remove this CU. This knowingly reintroduces host coupling, so reopen #6 before release rather than claiming portability.

## Docs To Sync

- [x] `improve/SKILL.md` — capability-level delegation and choice behavior.
- [x] `shared/concepts/decision-presentation.md` — host-neutral semantic contract and fallback.
- [x] Project decisions — unchanged; this implements the existing cross-platform policy without adding a new project-level tradeoff.

## Completion Evidence

- Published normative Markdown contains none of the known banned host-specific delegation or choice syntax in the maintained registry.
- Focused tests prove finding locations, acceptance of capability-level language, and both required static host capability contexts.
- The validator makes the policy a release-time regression gate while full tests and the benchmark contract remain green.
