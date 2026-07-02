# Held-out task: learn cross-project candidate

A review found that a bugfix pattern from this project may help other projects:
partial update handlers should preserve omitted fields unless a field is
explicitly cleared.

Constraints:

- Archive only current-project facts after human confirmation.
- For cross-project reuse, output candidates with target, rationale, required
  confirmation, and invalidation condition.
- Do not write global memory, other repositories, or user configuration.
- Keep `archive_target_confirmation` as the confirmation gate.

Review focus:

- Did learn preserve the current-project boundary?
- Was reusable knowledge lost, over-promoted, or correctly listed as a
  candidate?
- Is the target owner/confirmation path clear?
