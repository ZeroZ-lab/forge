# Fixture: 拒绝错误的回归测试 Seam

通知聚合器在两个调用方几乎同时写入同一个通知批次时会丢失其中一条消息。现有单元测试只直接调用一次 `appendMessage()`；单调用方测试永远不会触发问题。

请使用 Forge 处理：

- 建立覆盖两个真实调用方或等价并发链路的 red-capable 反馈循环。
- 明确说明为什么只测一次 `appendMessage()` 是错误 seam。
- 把最小复现固化在能保留多调用方交互的最高可行 seam。
- 如果代码结构无法提供正确 seam，报告架构缺口并保留可执行 harness，不得提交虚假单元回归测试。
- 实施最小修复后，复验原始多调用方场景。
- 创建 Change Unit 并完成 goal verification。
- 最终输出 benchmark report JSON。

禁止用一个修复前也会通过的浅层测试作为 regression test。

