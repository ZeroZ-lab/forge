# CU-20260715-runtime-evidence-envelope

## Type

- Runtime evidence binding and retained-integrity contract

## Intent

- Trigger: Forge Next B06 / [GitHub #14](https://github.com/ZeroZ-lab/forge/issues/14) required a verifiable Evidence Envelope that binds evidence to a concrete objective, workspace state, execution action, result subject, and retained artifact.
- Goal: Give B07/B08 one directly referenceable evidence unit without treating model descriptions, process exit, or Envelope shape as proof of objective completion.
- Out of scope: External verifier adapters, evidence-sufficiency or outcome scoring, paired statistics, empirical Forge claims, remote issuer authentication without a host trust root, package/plugin version changes, publication, push, and issue closure.

## Source Baseline

- Implementation commits: `bcfab06`, `998ab04`, `5329b80`, and `1ec9350` on `codex/forge-next`.
- Fixed review baseline: B05 completion commit `7210bfd`.
- Forge package/plugin version remains `0.52.0`.
- Environment: Darwin arm64; Node `22.22.3` and `24.14.0`.
- Evidence completed on 2026-07-15 UTC.

## Behavior Change

- Added fail-closed Evidence Envelope v1 schema and contract loader. The format has exact fields, preserves `model_self_report`, `tool_output`, and `independent_verifier` as distinct source levels, and contains no outcome or completion-eligibility field.
- Each Envelope binds issuer provenance, report/group/arm/repeat/request identity, objective id and digest, evidence result id, event action and actor, observation/issue time, initial/final workspace identity, and one typed retained payload.
- Command payloads carry exit code, termination, and stdout/stderr observed digests and must match the retained command receipt. Artifact and claim summaries must match their raw payload digest; every payload also binds its retained byte count.
- `createEvidenceEnvelope` owns contract/version/id/content digest. `parseEvidenceEnvelope` checks strict shape and canonical self-integrity. `verifyEvidenceEnvelope` additionally checks the report graph and retained filesystem facts.
- Retained Envelope and payload names are restricted to safe ASCII basenames. Verification opens non-linked regular files with `O_NOFOLLOW` when available, compares pre-open/open/post-read device and inode identity, rechecks link count and size, and hashes bytes read through the same file descriptor.
- Envelope JSON is capped at 1 MiB and command receipt JSON at 16 MiB before capture; artifact and claim payloads are streamed through a 64 KiB hashing buffer instead of being loaded whole into memory.
- Envelope filenames are content-addressed by canonical content digest. The report's `envelope_ref`, outer retained file reference, Envelope content digest, report evidence locator/digest, and raw payload must all agree.
- B04 still rejects adapter-supplied Envelope or independent-verifier claims. It creates command and workspace Envelopes only for runner-owned `tool_output`, writes them before the report is first published, records their retained references in the receipt, and revalidates the complete bundle.
- B05 disposes the host sandbox, then checks all Envelope bindings and validates the complete staged seal before the first atomic publication. It checks again when accepting an existing comparison group. Missing or invalid Envelopes produce an unsealed `.incomplete-*` group rather than a completion seal.
- New comparison groups use seal contract v2. Historical v1 groups retain their original B05 acceptance semantics and are not relabeled as B06 evidence; a v2 report carrying Envelope refs cannot be accepted by changing only the seal version to v1.

## Decisions

- Keep B06 as an integrity, provenance, and exact-binding layer. B07 owns independent verifier execution; B08 owns sufficiency and outcome.
- Never promote source level. A valid model self-report remains a model self-report and cannot become runtime or verifier evidence by adding an Envelope.
- Bind objective digest and the complete run/workspace identity, not only human-readable ids, so repeated or stale evidence cannot support a different attempt.
- Make the Envelope content-addressed and let the B05 outer seal bind the final report digest; do not create a report↔Envelope digest cycle.
- Do not add self-contained signatures. Without an independently injected key registry, rotation, revocation, and scope policy, an Envelope-carried key would be self-authorization rather than issuer authentication.
- Version the changed comparison-group acceptance semantics as v2 instead of silently tightening v1 or rewriting historical sealed groups.

## Affected Surface

- Contract: `evals/effectiveness-suite/evidence-envelope.schema.json` and `scripts/lib/evidence-envelope-contract.mjs`.
- Runtime: `scripts/lib/evidence-envelope.mjs`, `scripts/lib/effectiveness-runner.mjs`, and `scripts/lib/effectiveness-experiment.mjs`.
- Validation: `scripts/validate-effectiveness-suite.mjs`.
- Tests: Evidence Envelope public seam plus B04/B05 publication and recovery integration.
- Authoritative docs: `docs/project.md`, `docs/features/effectiveness-feedback-loop/goal.md`, and `evals/effectiveness-suite/README.md`.
- No published Skill text, default routing, dependency, lockfile, package/plugin manifest, or release version changed.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `issuer_ref` is mistaken for authenticated remote identity | A provider or host provenance string could be over-trusted | Docs state it is provenance inside the trusted runner/store boundary; future authentication requires host-injected trust policy and an outer attestation |
| A stale Envelope is replayed into another attempt | Old bytes could appear to support a new objective or workspace | Exact comparison group, arm, repeat, request fingerprint, objective digest, isolation id, base revision, and initial/final snapshot bindings fail closed |
| A retained path escapes, is linked, or changes during read | Verifier could hash different bytes than the report references | ASCII basename policy, canonical evidence root, regular-file/link checks, `O_NOFOLLOW`, same-FD hashing, and pre/post identity checks |
| Untrusted retained files exhaust verifier memory | A large Envelope, receipt, artifact, or claim could destabilize validation | Envelope/command JSON have pre-read caps; artifact/claim bytes are streamed through a fixed-size hashing buffer |
| Same-user code can replace a writable ancestor directory during verification | Node lacks a portable directory-fd/openat API for fully race-free traversal | Production evidence stores must be immutable or non-writable to untrusted code during verification; this repository does not claim resistance to a malicious same-uid store owner |
| New seal semantics invalidate historical groups | Valid B05 evidence could be quarantined or silently reinterpreted | New groups publish v2; v1 remains accepted only with its original no-Envelope semantics and is never upgraded in place |
| A malicious store owner rewrites both data and seal version | Version-only compatibility checks could be mistaken for authenticated downgrade protection | The v1/v2 rule blocks accidental or single-field downgrade only; authenticated anti-downgrade requires an external immutable trust anchor and is not claimed by B06 |
| Envelope validity is mistaken for task success | Structurally bound but irrelevant evidence could pass | B06 exposes no outcome/supports-completion field; B08 must separately judge sufficiency, safety, and objective outcome |

## Verification

- TDD seam: `node --test tests/evidence-envelope.test.mjs` → exit 0; valid command/artifact, retained and semantic tamper, wrong target, stale workspace, source/action mismatch, typed-summary mismatch, traversal, content-address mismatch, symlink, bounded JSON, and streamed large-artifact cases passed.
- B04/B05 focused integration: `node --test tests/evidence-envelope.test.mjs tests/effectiveness-runner.test.mjs tests/effectiveness-experiment.test.mjs` → exit 0; 70 passed, 0 failed; runner-owned publication, pre-seal rejection, cleanup-time mutation rejection, post-seal tamper recovery, immutable report preservation, and v1/v2 compatibility passed.
- Independent Standards review found unsafe pre-validation reads and an implicit group-v1 semantic change; both were corrected in `998ab04` by using the shared safe retained-file primitive and explicit v2 compatibility.
- Independent Spec review found that invalid Envelopes could be detected only on later group reuse; `998ab04` adds pre-publication validation and an unsealed failure regression.
- Final Standards/Spec review found that host cleanup could mutate evidence after the last validation, retained payload reads were unbounded, and the public create/parse size policy differed from retained verification. `5329b80` moves validation after cleanup, validates the complete staged seal, bounds JSON capture, and streams artifact/claim hashing; `1ec9350` aligns public API size checks. Both final reviewers reported no remaining P0–P2 findings after correction.
- Final repository gates:
  - Node 24: `npm test` → exit 0; 228 passed, 0 failed.
  - Node 24: `npm run validate` → exit 0; 27 Skills, version `0.52.0`.
  - Node 24: `npm run eval:skills` → exit 0; 23-case compliance contract passed; no behavioral-effectiveness claim.
  - Node 24: `npm run eval:effectiveness` → exit 0; 6 held-out cases, 6 scenarios, 2 repeats; Evidence Envelope contract v1 registered; no produced-evidence or real-world-effectiveness claim.
  - Node 24: `npm run metrics:chars` → exit 0; default chain 4,433 chars; all `SKILL.md` files 55,373 chars.
  - Node 22: `npm test` → exit 0; 228 passed, 0 failed.
  - Node 22: `npm run validate`, `npm run eval:skills`, `npm run eval:effectiveness`, and `npm run metrics:chars` → exit 0 with the same contract/version/footprint results.
- Not verified:
  - No real Codex/model four-arm benchmark, production provider, or hostile-code host sandbox was run.
  - No independent B07 verifier or B08 outcome evaluator exists yet; no objective completion or Forge effectiveness result is claimed.
  - Issuer identity is not cryptographically authenticated because no external trust-root contract exists.
  - Windows link/open semantics and a malicious same-uid concurrent evidence-store replacement were not tested.

## Rollback

- Revert this Change Unit commit, `1ec9350`, `5329b80`, `998ab04`, and `bcfab06` together.
- Preserve any `.incomplete-*` evidence needed for diagnosis. A v2 comparison group can be removed and rerun after rollback; do not rewrite it into v1.
- Historical v1 groups require no migration or rollback.
- No dependency, registry publication, package/plugin version change, data migration, or external write requires rollback.

## Docs To Sync

- [x] `docs/project.md` — PD16 records the Envelope, source-level, trust-root, and group-version boundaries.
- [x] `docs/features/effectiveness-feedback-loop/goal.md` — AC12/FD12 record behavior, non-goals, verification, and v1/v2 compatibility.
- [x] `evals/effectiveness-suite/README.md` — public API, typed payloads, secure retained-file checks, B04/B05 integration, and non-claims.
- [x] Published Skill/default routing/version docs — intentionally unchanged.

## Completion Evidence

- A runner-owned command and workspace artifact are directly addressable from the accepted report through content-addressed Envelopes and revalidated by the comparison-group seal.
- Invalid, tampered, wrong-target, stale-workspace, path-escaping, linked, or summary-conflicting evidence cannot enter a new v2 completion seal.
- B06 is complete as a runtime evidence binding seam. B07 remains responsible for independent verifier adapters, and B08 remains responsible for completion and outcome judgment.
