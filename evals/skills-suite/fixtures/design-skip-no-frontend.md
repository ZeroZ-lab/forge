# Fixture: design skip no frontend

User prompt:

> PRD 已经完成，这是一个纯后端的 webhook 事件处理功能，没有用户界面。请从 PRD 直接进入详设，跳过设计阶段。

Context files:

- `docs/features/webhook/PRD.md` — completed PRD for webhook event processing
- No existing interaction-spec, no DESIGN.md updates needed

Expected behavior:

- Detect that no frontend is needed (pure backend webhook processing).
- Skip design orchestration entirely — do not load interaction-design, fe-system, or any frontend skill.
- Route directly to detail stage.
- Do not produce interaction-spec.md or any DESIGN.md updates.
- Record the "skip design" decision with reason: pure backend, no user interface.
- Proceed to api-design and db-design as the first detail sub-skills.
