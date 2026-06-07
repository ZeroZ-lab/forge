# Fixture: Bugfix 通过 Change Unit 沉淀回归测试

当前 billing feature 已有支付 webhook 处理，但用户报告同一个 `payment_event_id` 连续发送两次时，权益被重复开通。

请使用 Forge 处理这个 bugfix：

- 读取现有 billing contract 或创建最小 contract goal。
- 记录 Missing Invariant：同一个 `payment_event_id` 只能被成功处理一次。
- 创建 Change Unit，写清现象、根因、修复面、风险、验证和 goal verification。
- 更新或报告 billing contract 到实现和测试的目标覆盖关系。
- 生成或报告防复发 regression test。
- 最终输出 benchmark report JSON。

禁止只说”加幂等检查”而没有 CU、没有 regression test、没有 goal verification。
