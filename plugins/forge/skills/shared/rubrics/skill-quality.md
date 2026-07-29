# Runtime skill quality rubric

Evaluate a Forge skill by its runtime role, not by whether it contains every control-loop heading.

| Dimension | Check |
|-----------|-------|
| Role clarity | The skill's runtime role is clear: goal, orchestrator, planner, implementor, sensor, governance, or knowledge. |
| Boundary clarity | It states what it consumes, produces, and should not do. |
| Downstream usability | Its output can be consumed by the next runtime node. |
| Decision traceability | Human decisions and trade-offs are recorded when relevant. |
| Recovery behavior | It identifies when to stop, ask, downgrade, or route to another skill. |
| Signal behavior | It emits or consumes deviation signals where its role requires that. |
| Density | Long explanations live in references/shared; `SKILL.md` stays operational. |
| Completion criterion | Every ordered step ends with evidence the agent can check; vague “finish the work” exits fail. |
| No-op control | Every sentence changes routing, execution, evidence, or stopping behavior compared with the model default. |
| Single source | A rule has one authoritative owner; other skills invoke or reference it instead of restating it. |
| Progressive disclosure | Common-path actions stay inline; branch-specific detail is loaded through a direct reference pointer. |
| Premature-completion resistance | Later steps do not encourage the agent to rush an unresolved current step; split sequences when observed. |
| Invocation cost | A separately discoverable skill has independent trigger value worth its metadata and context cost. |
| Activation neutrality | Direct action and zero Skill use remain legal; activation is telemetry, not completion evidence. |
| Skip / no-op boundary | The skill states when its marginal value is absent and exits without creating progress theater. |
| No implicit successor | Its output is advisory to the Chain Owner and does not force another top-level Skill. |
| Metadata discipline | Description and when-to-use expose unique value without anchoring generic model work. |

## Review order

1. Remove no-op and duplicated sentences.
2. Sharpen completion criteria before adding more process.
3. Move branch-only detail to a direct reference.
4. Split a skill only when it needs independent invocation or sequence isolation.
5. Remove generic triggers and mandatory successors.
6. Re-run metadata, selected-body, total-context, and behavioral gates; prose quality alone is not evidence.
