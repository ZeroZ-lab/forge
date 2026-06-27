# Document-as-goal anchor

Forge treats documents as goal constraints, not implementation blueprints.

## Runtime meaning

- Project documents define shared constraints and recorded decisions.
- Feature documents define: what's the goal, where are the boundaries, what counts as done.
- Change Units preserve decision history and verification evidence; do not maintain a parallel changelog.
- AI self-drives implementation path, structure, and technical details.
- Decision records (WHY) are the most valuable output — they outlast any code.

## Goal document layers

| Layer | Purpose |
|-------|---------|
| GOAL | What needs to be achieved. |
| BOUNDARY | What's in scope, what's out of scope. |
| DONE | How to verify completion — acceptance criteria, evidence. |
| DECISIONS | Why A was chosen over B. |

Missing DONE criteria should block execution.
