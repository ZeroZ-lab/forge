# Scope creep red flags

Scope creep means the runtime starts doing work outside the current goal without a recorded decision.

## Red flags

- New feature behavior appears during codegen without PRD or contract support.
- A task grows beyond the plan's file or step limits.
- A design decision becomes a product requirement without user confirmation.
- Deployment work introduces architecture changes not recorded in project decisions.
- Review recommendations broaden scope without classifying severity or impact.

## Runtime response

- Stop and record the missing decision.
- Route product scope changes to `define`.
- Route technical scope changes to `detail` or `technical-design`.
- Do not hide scope changes inside implementation details.
