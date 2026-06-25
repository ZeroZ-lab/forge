# Fixture: Bugfix 通过 Change Unit 沉淀回归测试

当前 billing feature 已有支付 webhook 处理，但用户报告同一个 `payment_event_id` 连续发送两次时，权益被重复开通。

请使用 Forge 处理这个 bugfix：

- 读取现有 billing contract 或创建最小 contract goal。
- 记录 Missing Invariant：同一个 `payment_event_id` 只能被成功处理一次。
- 在修改实现前建立并实际运行 red-capable 命令，证明它精确捕获“同一事件导致权益开通两次”。
- 把复现缩到最小输入，并报告修复前失败结果。
- 创建 Change Unit，写清现象、根因、修复面、风险、验证和 goal verification。
- 更新或报告 billing contract 到实现和测试的目标覆盖关系。
- 先观察 regression test 在修复前失败，再实施最小修复。
- 修复后同时运行 regression test 和原始 webhook 重放场景。
- 最终输出 benchmark report JSON。

禁止只说“加幂等检查”而没有修复前红灯、CU、regression test、原始场景复验和 goal verification。
