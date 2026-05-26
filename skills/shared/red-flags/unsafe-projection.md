# Unsafe projection red flags

Unsafe projection means code, release, or generated artifacts enter a real environment without enough source truth or recovery ability.

## Red flags

- Codegen proceeds without WHY or acceptance criteria.
- Tests are skipped or weakened to make projection pass.
- Frontend acceptance is claimed without real preview when preview is available.
- Deploy proceeds without health checks, monitoring, or concrete rollback commands.
- Methodology changes are made from a single unverified incident.

## Runtime response

- Treat missing setpoint as L2 and stop.
- Treat missing release recovery as a deploy blocker.
- Treat repeated verified methodology defects as input to `learn`.
- Record any human exception as an explicit decision with impact and owner.
