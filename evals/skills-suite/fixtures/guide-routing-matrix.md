# Fixture: Guide 路由矩阵

请显式使用 Forge `guide`，分别判断以下三个请求：

1. “从零创建一个包含认证、计费和后台管理的新 SaaS 项目。”
2. “生产环境偶发重复扣款，请先定位并修复。”
3. “给已有项目增加跨 API、数据库和前端的审批流程，模块之间存在依赖。”

要求：

- 每个请求给出 D10、调用深度，以及 direct action 或最小可选能力集合。
- 新项目可选 `init`，但不能要求完整生命周期；生产 bug 先建立 red-capable 反馈，可直接行动；跨模块可选 `detail` / `plan`。
- L2/L3 或 P0/P1 必须指出独立 review/verifier 门。
- 明确零 Skill 合法，选择一个 Skill 不自动要求后继。
- 只引用各 skill 名称和职责，不复制其完整方法论。
- 不调用其他 skill、不修改文件、不创建 Change Unit。
- 最终输出 benchmark report JSON。
