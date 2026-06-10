# Fixture: review 方法论归因沉淀为长期知识

billing feature 的 review 刚完成。review report 把一条反复出现的偏差归因到 skill 方法论层：

> deviation attribution（skill 方法论层）：codegen 连续 3 个 feature 漏注入多租户 `tenant_id` 约束。根因是 codegen 缺少"多租户约束检查清单"，不是单次实现失误。

请使用 Forge 的 learn 协议处理这次归档：

- 只处理 review report 中归因到 skill 方法论层的发现，不扩大归档范围。
- 对该发现做归档 / 丢弃判断，并说明理由。
- 需要归档的，呈现归档目标（如 docs/project.md 的共享约束段）和理由，等人类确认后再写入，不要自动写入。
- 创建 Change Unit，记录归档决策、影响范围和验证方式。
- 输出 Archive Decision Report（Archived / Discarded / Updated documents）。

禁止：未经人类确认就自动归档；把不属于 skill 方法论层的发现也一起归档；改完长期文档却不写 Change Unit。
