---
name: forge-fe-system
description: 设计系统落地——从产品意图推导可消费的 DESIGN.md + CSS tokens + 交互模式库。用户说"设计系统"、"配色"、"设计规范"、运行 /forge-design、或需要建立/更新 DESIGN.md 时触发。
---

# FE System — 设计系统落地

## 职责

把产品意图翻译成可消费的设计系统产物——DESIGN.md + CSS tokens + 交互模式库。

**核心洞察**：设计系统不是"一组颜色和字体"，是三层翻译链：原始值 → 语义 token → 组件 token。每个 token 必须带决策理由——没有理由的 token 是随机值。

**和 forge-visual-design 的关系**：本 Skill 替代 forge-visual-design。forge-visual-design 做设计决策（选什么风格），fe-system 把决策变成可消费的产物。上游决策 → 下游实现，合为一个 Skill。

## 与上下游的边界

**上游**：读 interaction-spec（交互规格）+ docs/project.md（业务目标、技术约束）
**下游**：DESIGN.md 交给 forge-fe-artifact（前端代码生成）和 forge-fe-accept（质量验收）

**和 forge-interaction-design 的切法**：
- interaction 定义**组件做什么**（行为、组合规则、交互模式）
- fe-system 定义**组件长什么样**（外观、色彩、间距）+ **页面怎么组织**（类型、布局）

**和 forge-fe-artifact 的切法**：
- fe-system 产出**可消费的 tokens 和模式**（设计约束）
- fe-artifact **消费** tokens 生成代码（代码实现）

## 核心方法论：三层 Token

```
原始值（primitive）     语义层（semantic）      组件层（component）
─────────────────     ─────────────────     ─────────────────
gray-50: #FAFAFA   →  surface-primary     →  card-bg
gray-100: #F5F5F5  →  surface-secondary   →  card-bg-hover
gray-900: #171717  →  text-primary        →  heading-color
blue-500: #3B82F6  →  color-accent        →  button-primary-bg
8px                →  space-unit          →  card-padding
```

**每一层都要记录为什么。** 不是 `card-padding: 16px`，而是 `card-padding: 16px（2 × space-unit，卡片内需要呼吸感但不浪费空间）`。

三层 Token 服务两个消费者：
- **开发者**：用语义 token 写代码（`color: var(--text-primary)` 不是 `color: #171717`）
- **AI**：用组件 token 生成代码（`bg: var(--card-bg)` 直接知道这个 token 给卡片用）

## 方法论：意图 → 系统 → 产物

### 第一步：定意图（Intent）

视觉设计从产品气质开始，不是从色号开始。

**核心问题**：
- 3-5 个形容词描述气质（"克制的科技感"不是"好看"）
- 气质从哪来？（品牌定位？目标用户？产品功能？）
- 有品牌指南吗？需要暗色模式？多平台？

**不变原则**：
- 气质决定一切——色彩、字体、间距都从气质推导
- 意图要具体到能验证——"克制" = 低饱和度 + 等宽字体 + 大留白
- 推导链格式：`气质 → 选择 → 理由`

### 第二步：搜索参考（Discover）

**搜索提取框架**（每个参考设计系统提取以下维度）：
- 色彩：几个主色？语义色怎么分？暗色模式怎么做？
- 间距：基准单位？层级规律？
- 字体：几个层级？行高规则？display tracking？
- 组件模式：状态怎么表达？变体怎么组织？

**对比分析**：3 个系统都做了 = 行业共识 · 只有 1 个做了 = 可能是特色 · 都没做 = 可能不需要

**不变原则**：不是抄，是了解 landscape 后做有意识选择 · 参考 3-5 个设计系统

**AI 搜索源**：Material、Ant、Chakra、Radix、Shadcn、Primer（GitHub）、Carbon（IBM）、Polaris（Shopify）· Token 标准：W3C Design Tokens、Style Dictionary

### 第三步：页面判断（Page Judgment）

在选颜色之前，先决定页面怎么组织。

**3.1 页面类型**：读 `references/page-archetypes.md`，根据内容目标选择类型
**3.2 布局模式**：读 `references/layout-patterns.md`，从页面类型推导布局
**3.3 组件组合**：读 `references/component-grammar.md`，从布局选择组件

**不变原则**：
- 内容决定布局，布局决定组件，组件决定样式
- 每个选择都要有理由（"为什么用 Bento Grid 而不是 Split？"）

### 第四步：视觉选择（Choose）

从意图推导每个视觉选择。

**选择三件套**：色彩 + 字体 + 间距

**不变原则**：
- 主色 ≤ 3 · 色彩有语义（成功=绿、警告=黄、错误=红）· WCAG 对比度 4.5:1
- 字体层级清晰 · 行高 1.5-1.8 · 正文 ≥ 14px · display 字号用负 tracking
- 间距有规律（4px 或 8px 基准）· 留白是设计工具不是浪费
- 克制优先："删掉它产品会变丑吗？"不会就不需要
- **移动端约束**：触控目标 ≥ 44×44pt · 移动端正文 ≥ 16px · 断点从内容推导不从设备推导

### 第五步：构建三层 Token（Build）

把视觉选择翻译成三层 Token 系统。

**原始值**：全局色板 + 字号 + 间距倍数。不直接用于组件。
**语义层**：surface / text / color / space / radius / shadow + 用途。代码中引用的层。
**组件层**：card-bg / button-primary-bg / heading-color。语义层在特定组件中的别名。

**不变原则**：
- 原始值命名用色名 + 色阶（gray-50）
- 语义层命名用途不用颜色（text-primary 不是 text-gray-900）
- 组件层命名组件 + 属性（card-bg 不是 bg-white）
- 暗色模式只改原始值和语义层的映射，组件层不变
- 每个 token 带一行决策理由

**Token 格式**：CSS 变量（`--surface-primary: #FFFFFF`），写入 DESIGN.md。

### 第六步：交互模式库（Patterns）

定义产品中重复出现的交互模式——不是组件实现，是组合规则。

**常见模式**：表单模式 · 列表模式 · 导航模式 · 反馈模式（toast/dialog/inline）· 数据展示模式（表格/卡片/图表）

每个模式记录：
```markdown
### 列表模式
- 结构：筛选栏 + 列表体 + 分页/加载更多
- 空状态：引导创建（不用"暂无数据"）
- 加载态：骨架占位（不用 spinner）
- 错误态：内联重试（不用全屏错误页）
- 移动端：筛选栏折叠为底部弹出
- 决策理由：列表是产品核心交互，需要快速扫描，骨架比 spinner 焦虑感低
```

### 第七步：验证（Validate）

**反 AI 味检查清单**：
- 和 Material/Ant/Chakra 默认值对比——雷同则强制差异化
- 把主色换成蓝色，产品会失去辨识度吗？不会 = 选择不够有意图
- 设计系统能从产品气质推导出来吗？不能 = 选择是任意的
- 有没有刻意的"不完美"？完全对称 = AI 味
- 组件状态完整吗？（默认/悬停/聚焦/禁用/加载）

### 第八步：预览（Preview）

文字规格无法验证视觉感受——必须看到真实渲染。

**AI 行为**：从 DESIGN.md 生成 design-preview.html（单文件，零依赖，浏览器直接打开），包含色板、字体层级、间距系统、组件展示、页面布局示例。发现不协调 → 改 DESIGN.md → 重新生成预览。

## AI 的角色

| 阶段 | AI 角色 | 行为 |
|------|---------|------|
| 意图 | 气质翻译者 | 把抽象气质翻译成具体视觉方向 |
| 搜索 | 设计搜索者 | 结构化提取参考系统的色彩/间距/字体/组件维度 |
| 页面判断 | 结构决策者 | 从内容目标选择页面类型→布局→组件 |
| 视觉选择 | 意图守护者 | 每个选择追问"这和气质有什么关系？" |
| Token 构建 | Token 架构师 | 三层翻译，每个 token 带理由 |
| 模式库 | 模式抽象者 | 从交互需求提取可复用组合规则 |
| 验证 | 反模板检查者 | 和默认值对比，指出雷同 |
| 预览 | 渲染生成者 | 生成 design-preview.html 验证视觉 |

## 决策点

### S1: 色彩系统
**问**：有品牌指南吗？产品气质？暗色模式？
**不变原则**：推导链（气质→色彩→理由）· 主色 ≤ 3 · 语义色 · WCAG 4.5:1
**记录**：三层 token + 暗色变体 + 推导链 + 拒绝记录

### S2: 字体系统
**问**：有品牌字体吗？多语言？加载策略？
**不变原则**：层级清晰 · 行高 1.5-1.8 · display 负 tracking · 正文 ≥ 14px
**记录**：字体家族 + 层级 + 行高规则 + 推导链

### S3: 间距系统
**问**：基准单位？响应式间距？
**不变原则**：4px 或 8px 基准 · 有规律倍数 · 留白是设计工具
**记录**：基准 + 层级 + 响应式规则

### S4: 页面结构
**问**：内容目标是什么？用户第一眼该看到什么？
**不变原则**：内容决定布局 · 每页有明确类型 · 布局选择有理由
**记录**：页面类型 + 布局模式 + 组件组合 + 选择理由

### S5: 组件 Token + 交互模式
**问**：基础组件有哪些？状态？交互模式？
**不变原则**：组件层 token 从语义层推导 · 状态完整 · 模式可组合
**记录**：组件 token 表 + 交互模式库 + 命名规范

## 文档约束

**DESIGN.md 必须包含**：产品气质 + 推导链 · 三层 Token（原始值→语义→组件）· 色彩系统 · 字体系统 · 间距系统 · 页面结构决策 · 交互模式库 · 拒绝记录 · 参考设计系统
**DESIGN.md 不应包含**：交互行为设计（interaction-design）· 代码实现（fe-artifact）

## 模板

- `${CLAUDE_SKILL_DIR}/references/design-system-template.md` — DESIGN.md 结构
- `${CLAUDE_SKILL_DIR}/references/design-preview-template.html` — 预览页面结构
- `${CLAUDE_SKILL_DIR}/references/page-archetypes.md` — 页面类型模型
- `${CLAUDE_SKILL_DIR}/references/layout-patterns.md` — 布局模式
- `${CLAUDE_SKILL_DIR}/references/component-grammar.md` — 组件语法

## 入口/出口条件

**入口**：有 interaction-spec.md（来自 forge-interaction-design）、用户已有交互设计，或由 forge-init 调用并已有项目级业务目标。
**出口**：DESIGN.md 已生成 · 三层 Token 完整 · 每个选择有推导链 · 通过反 AI 味检查 · design-preview.html 已生成并验证 · Token 统计摘要已输出 · 用户确认

### Token 统计摘要（出口必输出）

DESIGN.md 完成后，输出一份统计摘要供下游 Skill 消费：

```
📊 Token 统计：
  原始值：{N} 色 + {N} 字号 + {N} 间距 = {总计}
  语义层：{N} 表面色 + {N} 文本色 + {N} 功能色 + {N} 间距 + {N} 圆角 + {N} 阴影 = {总计}
  组件层：{N} token = {总计}
  交互模式：{N} 个
  暗色模式：✅ / ❌
  CSS 变量：{N} 个（可直接消费）
```

**为什么需要统计**：fe-artifact 和 fe-accept 需要知道 Token 的覆盖范围。如果组件层 Token 少于 10 个，说明抽象不够——很多组件会直接引用语义层，增加主题切换时的改动量。

## 何时不使用

纯后端 API · 已有完整设计系统 · 内部工具不需要精美设计（简化流程）

## 红旗清单

- 色彩选择和气质无关 → 强制推导
- 和 Material/Ant 默认值雷同 → 强制差异化
- 主色超过 3 个 → 强制收敛
- 对比度不符合 WCAG → 强制调整
- 没有参考设计系统 → 强制搜索
- Token 没有三层分离 → 强制分层（"这个 token 是原始值还是语义？"）
- Token 没有决策理由 → 强制补充
- 页面没有明确类型 → 强制判断
- 没有考虑移动端 → 强制检查（"触控目标够大吗？"）
- 桌面端布局直接缩放成移动端 → 强制 mobile-first

## 验证清单

- [ ] 产品气质是否具体到能推导视觉选择？
- [ ] 每个色彩/字体选择是否有推导链？
- [ ] 是否搜索并参考了 3-5 个设计系统？
- [ ] 三层 Token 是否完整（原始值→语义→组件）？
- [ ] 每个 Token 是否有决策理由？
- [ ] 页面类型是否明确？布局选择是否有理由？
- [ ] 是否通过反 AI 味检查？
- [ ] 对比度是否符合 WCAG？
- [ ] 交互模式库是否覆盖核心交互？
- [ ] design-preview.html 是否已生成并验证？
- [ ] 移动端：触控目标 ≥ 44pt？正文 ≥ 16px？布局从移动端开始？

## 历史维护（自动）

完成后追加 `docs/timeline.md`：`### {日期} — 设计系统建立 · 气质：{气质} · Token 数：{N} · 产出：DESIGN.md`。超 100 行时归档。

## 完成提示

```
✅ 设计系统完成！DESIGN.md + design-preview.html 已生成。

下一步你可以：
  /forge-detail  — 做技术详设（API + 数据库 + 前端）
  自然语言       — 直接说"生成前端代码"进入 fe-artifact
```
