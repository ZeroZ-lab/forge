# Fe Artifact Protocol

## 五层翻译详解

### 1. 意图层

回答页面为什么存在：

- 用户目标是什么。
- 主操作是什么，危险操作是什么。
- 页面成功状态、空状态和失败状态是什么。
- 信息密度应偏工作台、内容阅读还是营销展示。

### 2. 接口层

从 API 合约推导：

- request/response 类型。
- 错误码和用户可见提示。
- loading、retry、pagination、optimistic update。
- auth、tenant、permission、idempotency 等横切约束。

### 3. 状态层

区分：

- 远端状态：server data、cache、mutation。
- 本地状态：表单、筛选、选中、展开。
- 派生状态：统计、排序、权限判断。
- 持久状态：主题、偏好、草稿。

### 4. 视图层

从 DESIGN.md 推导：

- layout、导航、toolbar、content density。
- 组件层级和组合方式。
- hover、focus、disabled、loading、empty、error。
- 桌面、平板、移动端断点。

### 5. 适配层

最后检查：

- 可访问性：label、role、keyboard、focus ring。
- 性能：列表虚拟化、懒加载、避免无意义 rerender。
- 恢复：错误重试、表单保护、离线或慢网提示。
- 国际化和长文本：不硬编码固定宽度承载长词。

## 交接检查点

生成前输出：

- 本次读取了哪些文档。
- 将生成哪些文件。
- 哪些设计或接口来自文档，哪些是合理推导。
- 哪些不确定点需要用户确认。

## 输出规则

| 文档来源 | 实现目标 |
|----------|----------|
| DESIGN.md tokens | CSS variables、theme、component variants |
| goal.md（前端合约） | 页面结构、路由、模块边界 |
| modules/*.md | components、hooks、state、props；API client、types、error handling |
| goal AC + current scenario matrix | component tests、interaction tests |

## 验收前自查

- 不引入未记录的新视觉语言。
- 不把 API 字段名猜成另一个名字。
- 不把权限逻辑只放在 UI 层。
- 不用不可访问的 icon-only 控件。
- 不让动态内容改变工具栏、棋盘、表格等固定格式区域尺寸。

## 实现结果回执

preview、实现、验证和验收是四个不同事实：

- `preview available`：预览表面可访问；它可以成为 verifier 的目标，但本身不是通过证据。
- implemented：changed files 已真实保留。
- verified：verifier 对明确 target 返回 passed，且 evidence 可复查。
- accepted：仅由 fe-accept 的独立验收产生，fe-artifact 始终不得自报。

每次保留前端变更时返回：

| 字段 | 规则 |
|------|------|
| `result` | `implemented_unverified` / `verification_failed` / `verified` |
| `changed_files` | 实际保留的文件路径，至少一个 |
| `preview_status` | `not_run` / `available` / `unavailable`；与 result 正交 |
| `preview_evidence` | preview 未运行时为 `null`；其他状态必须记录 URL、输出或不可用原因 |
| `verifier` | 实际工具或命令；未运行时为 `not_run` |
| `verification_target` | verifier 检查的行为、构建或视觉表面；未运行时为 `not_run` |
| `verification_outcome` | `not_run` / `failed` / `passed`，必须与 result 一致 |
| `evidence` | 未运行时为 `null`；passed/failed 时必须是可复查的输出、报告或 artifact |
| `unverified_items` | 未覆盖或失败后仍未确认的内容；not_run/failed 时至少一项 |
| `rollback` | 每次保留变更都提供的恢复方式 |

回执不包含 `accepted` 或其派生布尔值。standalone 按共享历史契约写一个 Change Unit；child 只把本回执交给 Chain Owner，由其统一持久化。开发服务器成功启动本身不能把 result 提升为 `verified`。
