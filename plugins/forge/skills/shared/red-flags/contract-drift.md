# Contract drift red flags

Contract drift means downstream artifacts no longer match the upstream document setpoint.

## Red flags

- Code passes tests but no longer matches endpoint, field, status-code, or permission contracts.
- Frontend module references an API response shape that changed upstream.
- Database schema diverges from the shared data model without a changelog entry.
- Testing documents still encode old acceptance criteria.
- Deploy contract references runtime dependencies removed from code or project decisions.

## Runtime response

- Classify local implementation mismatch as L1 when the contract is clear.
- Classify contradictory or incomplete setpoint as L2 and stop projection.
- Route repeated L1 drift to `detail`.
- Route cross-document drift found in review to `detail` for cascade update decisions.
