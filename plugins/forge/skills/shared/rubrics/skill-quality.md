# Runtime skill quality rubric

Evaluate a Forge skill by its runtime role, not by whether it contains every MAPE-K heading.

| Dimension | Check |
|-----------|-------|
| Role clarity | The skill's runtime role is clear: setpoint, orchestrator, planner, actuator, sensor, governance, or knowledge. |
| Boundary clarity | It states what it consumes, produces, and should not do. |
| Downstream usability | Its output can be consumed by the next runtime node. |
| Decision traceability | Human decisions and trade-offs are recorded when relevant. |
| Recovery behavior | It identifies when to stop, ask, downgrade, or route to another skill. |
| Signal behavior | It emits or consumes deviation signals where its role requires that. |
| Density | Long explanations live in references/shared; `SKILL.md` stays operational. |
