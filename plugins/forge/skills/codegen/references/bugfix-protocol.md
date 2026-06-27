# Bugfix Protocol — 先建立红灯，再修复

> 适用于用户报告错误、失败、异常输出、性能回退或间歇性故障。目标不是先猜根因，而是先获得能识别用户具体症状的反馈循环。

## 入口判断

- 已有失败测试精确覆盖用户症状：直接复用，Phase 1–2 可视为已完成，但必须报告命令和失败证据。
- 问题可由一个快速命令稳定复现：执行完整协议。
- 纯拼写、注释或不影响运行时的文档错误：不使用本协议。

## Phase 1：建立 red-capable 反馈循环

优先顺序：

1. 覆盖真实调用路径的失败测试。
2. 对开发服务执行的 HTTP/CLI 脚本。
3. 浏览器自动化，断言 DOM、console 或 network。
4. 捕获并重放真实请求、事件或 trace。
5. 最小 throwaway harness。
6. 固定随机种子或高频循环的 property/fuzz harness。
7. 可自动运行的版本、配置或数据二分脚本。

完成条件：报告一个已经实际运行过的命令，并证明它同时满足：

- **Red-capable**：断言用户报告的具体症状，不只是“命令退出失败”。
- **真实锚定**：红灯必须引用真实代码路径或真实数据。一个不调用任何被测代码、只断言常量矛盾（如 `assert 1 === 2`）的测试不算 red-capable——它无法证明修复有效，只是形式上失败。
- **Deterministic**：相同输入给出相同判定；间歇性问题则固定并报告复现率。
- **Fast**：足以支持反复运行；若不能快速，说明耗时和缩窄方案。
- **Agent-runnable**：不依赖未描述的人类点击或观察。

没有 red-capable 命令时停止根因推断。报告已尝试的方法，并请求可复现环境、HAR/log/core dump/trace，或临时观测权限。

阻塞出口必须包含这些字段：

- `red-capable command unavailable`：说明没有可运行的红灯命令。
- `attempted feedback loops`：列出已尝试的测试、脚本、日志、重放或 harness。
- `requested production evidence`：明确请求 HAR、日志、trace、core dump、样本数据或临时观测权限。
- `未验证风险`：说明继续修改会造成的误修风险。
- `safe stop`：停止代码修改，不创建假 regression test，不改实现。

阻塞出口执行要求：

- 先输出一条非 JSON progress evidence line，原样包含：`Evidence: red-capable command unavailable; attempted feedback loops; requested production evidence; 未验证风险; safe stop.`
- 写最终报告前触发 `review` 做安全停止复核：确认未改 `src/`、`tests/`、project/goal 文档，未创建假 regression test，已请求生产证据。
- 只允许写 Change Unit 记录调查、缺失证据、未验证风险和 safe stop；不得用 goal/project 文档伪装进展。

> 红灯的「证据」= 修复前命令 + 失败输出，不是「我写了一个会失败的测试」这类描述。证据形态见 `${CLAUDE_SKILL_DIR}/../shared/concepts/evidence-policy.md`。

## Phase 2：复现并最小化

1. 运行反馈循环，确认出现的是用户描述的同一个问题。
2. 再运行至少一次；间歇性问题执行足够轮次并记录初始复现率。
3. 逐项删除输入、调用方、配置、数据和步骤，每次都重新运行。
4. 保留最小复现：再删任一关键元素都会让红灯消失。

性能问题必须先记录基线指标；不能用“感觉更快”作为红灯。

## Phase 3：提出可证伪假设

在修改实现前生成 3–5 个排序后的假设。每个假设使用：

> 如果 X 是根因，那么改变或观测 Y 后，反馈循环会出现 Z。

没有预测的解释不是可验证假设。优先测试能最大幅度缩小搜索空间的假设，不按最容易修改代码的顺序测试。

## Phase 4：单变量探测

- 每次只改变或观测一个变量。
- 优先 debugger/REPL，其次是边界处的定向日志。
- 临时日志统一使用唯一 `[DEBUG-<id>]` 前缀。
- 性能问题使用 profiler、query plan 或计时基线，不用海量日志代替测量。

探测结果必须明确写成“支持 / 否定 / 未区分”哪个假设。

## Phase 5：回归测试与修复

回归测试必须位于能复现真实故障模式的 seam：

1. 把最小复现固化为测试。
2. 运行并观察测试在修复前失败。
3. 只实施修复根因所需的最小改动。
4. 运行并观察测试通过。

> 「运行并观察」= 交出命令 + 真实输出（失败行 / 通过行），不是「测试先红后绿」的结论描述。两次输出都是必交证据，缺一次不算走完 Phase 5。

如果现有架构没有正确 seam（correct seam），不要增加一个无法复现真实故障的浅层测试。明确写出错误 seam 为什么不能证明用户症状，把“缺少可测试 seam”作为架构发现记录，并保留可执行复现 harness 作为验证证据。

存在 seam 争议时，决策 ID 使用 `test_seam`，在 Change Unit 的 Decisions 段记录 correct seam、错误 seam、选择理由和被拒方案。

间歇性问题修复后必须用同一个 harness 记录修复后复现率；不能只跑一次就声称已修复。

## Phase 6：原始场景复验与清理

完成前必须：

- 重新运行 Phase 1 的原始、未最小化场景并通过。
- 运行相关回归测试。
- 删除全部 `[DEBUG-<id>]` 临时探测。
- 删除 throwaway harness，或明确标记并记录其保留理由。
- 在 Change Unit 中记录现象、Missing Invariant、根因、修复面和验证证据。

## 输出证据

> 证据 = 命令 + 真实输出，不是结论。详见 `${CLAUDE_SKILL_DIR}/../shared/concepts/evidence-policy.md`。

Bugfix 完成报告至少包含：

- 用户症状与最小复现。
- red-capable 命令及修复前失败输出（命令 + 失败行，不是「测试失败了」）。
- 被验证的根因假设。
- 间歇性问题的初始复现率与修复后复现率。
- regression test 或“缺少正确 seam”的明确发现。
- correct seam 与错误 seam 的取舍说明（如果存在 seam 争议）。
- 修复后测试输出（命令 + 通过行）。
- 原始场景复验结果（命令 + 输出）。
- 未验证部分与残余风险。
