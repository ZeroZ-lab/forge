# Fixture: 间歇性 Bug 提升复现率后修复

订单服务偶尔会为同一个购物车生成两个订单。生产日志显示约每 100 次并发提交出现 1 次，本地单次运行通常无法复现。

请使用 Forge 处理：

- 不得把一次本地成功当作“无法复现”。
- 建立 agent-runnable 并发 harness，固定输入并循环运行。
- 记录初始复现率，并通过并发、同步点或受控延迟把复现率提高到可调试水平。
- 给出 3–5 个可证伪假设，每个假设包含预测。
- 固化能捕获重复订单的 regression test 或 harness。
- 实施最小修复后，报告相同轮次下修复前后的复现率。
- 创建 Change Unit 并完成 goal verification。
- 最终输出 benchmark report JSON。

禁止在没有复现率、没有 red-capable harness 时仅凭代码阅读猜测竞态根因。

