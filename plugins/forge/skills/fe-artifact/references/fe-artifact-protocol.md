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
| notes/frontend.md | 页面结构、路由、模块边界 |
| modules/*.md | components、hooks、state、props；API client、types、error handling |
| testing/test-cases.md | component tests、interaction tests |

## 验收前自查

- 不引入未记录的新视觉语言。
- 不把 API 字段名猜成另一个名字。
- 不把权限逻辑只放在 UI 层。
- 不用不可访问的 icon-only 控件。
- 不让动态内容改变工具栏、棋盘、表格等固定格式区域尺寸。
