# Held-out task: frontend standard-piece choice

You are adding a settings form with validation, tabs, and a deploy preview for
an internal SaaS admin UI.

Constraints:

- Prefer mature standard pieces for commodity UI, validation, and deployment
  when they fit the existing stack.
- Build only the business-specific settings behavior and adapters.
- Record why a selected standard piece fits and when it would not fit.
- Do not introduce a new dependency if the repo already has a suitable local
  capability.

Review focus:

- Did the agent distinguish standard pieces from business-specific pieces?
- Was buy/build rationale visible?
- Did the implementation avoid recreating common components?
