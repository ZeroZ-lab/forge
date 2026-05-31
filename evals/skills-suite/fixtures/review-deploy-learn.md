# Fixture: review deploy learn

User prompt:

> 标签功能已经实现，先做独立审查。如果没有 P0/P1，再准备发布；如果发现同类偏差反复出现，给出方法论回流建议。

Expected behavior:

- Trigger review, deploy, and learn only when evidence supports each step.
- Require rollback planning before release.
- Do not change methodology from a single weak signal.
