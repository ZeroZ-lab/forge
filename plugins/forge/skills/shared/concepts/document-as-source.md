# Document-as-source anchor

Forge treats documents as source and code as projection.

## Runtime meaning

- Project documents define shared constraints and technical decisions.
- Feature contracts define the setpoint for implementation.
- Module documents define reconstructable behavior.
- Changelog and timeline preserve decision history and deviation signals.
- Codegen projects from documents and must not invent unrecorded decisions.

## Required source layers

| Layer | Runtime purpose |
|-------|-----------------|
| WHAT | Defines behavior and acceptance criteria. |
| WHY | Preserves decisions, reasons, and rejected alternatives. |
| HOW | Defines data, interfaces, structure, and technical choices. |
| CONSTRAINTS | Defines security, performance, compatibility, and operational bounds. |

Missing WHY or constraints should block confident code projection.
