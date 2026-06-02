# MAPE-K runtime anchor

Forge uses MAPE-K as a runtime control model, not as a required shape for every `SKILL.md`.

| MAPE-K | Forge runtime meaning |
|--------|-----------------------|
| Monitor | Read task intent, project docs, feature docs, code, tests, timeline, changelog, and user confirmation state. |
| Analyze | Classify missing input, document drift, code deviation, L0/L1/L2 projection errors, and methodology defects. |
| Plan | Choose the next stage, task order, cascade update, release plan, or human decision point. |
| Execute | Generate documents, project code, frontend artifacts, tests, or release checklists. |
| Knowledge | Use shared templates, references, project timeline, feature changelog, and prior decisions. |
| Feedback | Validate with tests, `validate.mjs`, review, frontend acceptance, and user confirmation. |
| Recovery | Fix code, fix documents, cascade updates, block release, roll back, or feed repeated defects to learn. |

## Rule

Do not force every skill to contain every MAPE-K heading. A domain skill can be a setpoint generator, an actuator, a sensor, a governance gate, or a knowledge anchor. The runtime loop must be complete across the suite.
