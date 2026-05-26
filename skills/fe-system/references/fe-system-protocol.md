# Fe System Protocol

## 设计意图

确认以下信息后再生成 token：

- 用户是谁，工作频率高不高。
- 产品是工具、SaaS、内容站、营销页、游戏还是数据面板。
- 视觉目标是专业、安静、高效、可信、活泼还是沉浸。
- 是否有品牌色、logo、字体或已有 UI 约束。
- 关键页面有哪些，页面密度应该偏高还是偏低。

## 搜索参考

需要当前市场参考时，搜索同类产品和设计系统。输出参考时只记录模式和取舍，不复制视觉外壳。

## 页面判断

- SaaS 和运营工具：信息密度优先，少装饰，表格、筛选、批量操作完整。
- 内容产品：阅读节奏、层级和可扫描性优先。
- 营销页面：首屏明确品牌或 offer，视觉资产必须服务产品识别。
- 游戏或互动产品：允许更强表现力，但操作状态必须清晰。

## Token 结构

### Primitive

- color：基础色阶、灰阶、语义源色。
- typography：font-family、size、line-height、weight。
- spacing：基准网格、组件间距、section 间距。
- radius/shadow/border：保持克制，卡片圆角默认不超过 8px，除非项目设计另有要求。

### Semantic

- surface、surface-muted、surface-raised。
- text、text-muted、text-inverse。
- primary、success、warning、danger、info。
- border、focus、overlay、disabled。

### Component

- button：size、variant、state。
- input/select/textarea：height、padding、focus、error。
- table/list：row height、header、selection、empty。
- dialog/popover/toast：layer、shadow、motion。

## 输出要求

`DESIGN.md` 不是灵感板，必须能被代码生成直接消费。每个 token 应有名称、值、用途。每个组件模式应说明结构、状态和不适用情况。

## 预览要求

需要预览时使用 `design-preview-template.html`，展示：

- 核心颜色和语义色。
- 字体层级。
- 按钮、输入、表格、卡片、弹窗、toast。
- 正常、hover、focus、disabled、error、empty、loading 状态。
