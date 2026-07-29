# Delegation decision matrix

> 主控缩小决策面，subagent 扩大搜索面。派出去的是任务包，收回来的是证据包；最终判断、冲突裁决和用户交付仍由主控负责。

## 快速判断

| 场景 | 委托动作 | 主控保留 |
|------|----------|----------|
| 单文件、低风险、上下文少 | 亲自做 | 范围、验证、交付 |
| 多文件搜索、长日志、历史/CU/ADR 梳理 | 派调查 | 证据取舍、结论裁决 |
| 明确低风险局部实现，输入/输出可验收 | 可派执行 | patch 审核、验证选择 |
| P0/P1 代码风险、安全/权限/支付/数据迁移/发布 | 只派分析、方案或风险评估 | 最终决策、是否修改 |
| 目标不清、边界不清、结果无法验收 | 不派发，先澄清或收窄 | 目标定义 |

## Subtask brief

委托时给 subagent 清楚边界：

- Mission：要回答或完成什么。
- Scope：允许读取/修改哪些文件；默认不修改。
- Excluded scope：不能碰的风险面。
- Questions：需要返回的判断点。
- Output：Verdict / Findings / Evidence / Risks / Conflicts / Next actions。
- Limits：不返回长原文，不越权决策，不扩大范围。

## 验收规则

- subagent 结论必须带来源文件、命令输出或可复查证据。
- 证据冲突时主控裁决；不能裁决时交人类。
- 高风险任务不得让 subagent 单独提交最终 patch 或发布动作；它提供独立 findings/evidence，Chain Owner 决策和集成。
- L2/L3 或 P0/P1 在宣称 complete/release-ready 前必须有独立 reviewer/verifier。无独立能力时只能保持 partial/正确阻塞并说明残余风险；主控 self-check 不得冒充独立证据。
- 独立 reviewer 必须未参与实现并使用分离 context/actor；独立 verifier 必须是预声明或 host-private，且实现上下文不能改写其输入和留存观察。主控自跑普通测试只算 verification。

## D3 边界

subagent 可以整理选项、代价、证据和风险；不能替代人类做关键取舍。触及架构替换、安全/权限/支付、数据迁移、删除、发布或长期规则时，主控必须把选择交回人类确认并记录决策。
