# DESIGN.md — <Project Name>

> 设计系统：三层 Token + 交互模式库。所有前端代码消费本系统，不单独设计。

## 版本信息

| 项目 | 值 |
|------|-----|
| 版本 | v1.0 |
| 日期 | YYYY-MM-DD |
| 产品气质 | {3-5 个形容词} |
| 推导链摘要 | {气质 → 核心视觉选择} |

---

## 产品气质

> {3-5 个形容词}

**推导链**：{气质 → 选择 → 理由}

**参考设计系统**：
| 系统 | 借鉴了什么 | 为什么 |
|------|-----------|-------|
| {系统 1} | | |
| {系统 2} | | |
| {系统 3} | | |

---

## Token 系统

### 三层结构说明

```
原始值（primitive）→ 语义层（semantic）→ 组件层（component）
     全局色板              用途命名              组件命名
     不直接引用            代码中引用            特定组件别名
```

### 原始值（Primitive）

> 全局色板。不直接在代码中使用，只被语义层引用。

**色彩**

| Token | 值 | 色阶说明 |
|-------|-----|---------|
| gray-50 | # | 最浅 |
| gray-100 | # | |
| gray-200 | # | |
| gray-300 | # | |
| gray-500 | # | 中间 |
| gray-700 | # | |
| gray-900 | # | 最深 |
| blue-500 | # | 主色基准 |
| ... | | |

**字号**

| Token | 值 |
|-------|-----|
| text-12 | 12px |
| text-14 | 14px |
| text-16 | 16px |
| text-20 | 20px |
| text-24 | 24px |
| text-32 | 32px |

**间距倍数**

| Token | 值 |
|-------|-----|
| space-4 | 4px |
| space-8 | 8px |
| space-12 | 12px |
| space-16 | 16px |
| space-24 | 24px |
| space-32 | 32px |
| space-48 | 48px |
| space-64 | 64px |

---

### 语义层（Semantic）

> 用途命名。代码中引用的层。

**表面色**

| Token | 原始值 | 用途 | 暗色模式 | 决策理由 |
|-------|-------|------|---------|---------|
| surface-primary | gray-50 | 页面背景 | #0A0A0A | |
| surface-secondary | gray-100 | 卡片/面板背景 | #171717 | |
| surface-tertiary | gray-200 | 输入框/分割线 | #262626 | |

**文本色**

| Token | 原始值 | 用途 | 暗色模式 | 决策理由 |
|-------|-------|------|---------|---------|
| text-primary | gray-900 | 标题、正文 | #FAFAFA | |
| text-secondary | gray-500 | 辅助文本 | #A3A3A3 | |
| text-tertiary | gray-300 | 占位符 | #737373 | |

**功能色**

| Token | 原始值 | 用途 | 暗色模式 | 决策理由 |
|-------|-------|------|---------|---------|
| color-accent | blue-500 | 主操作、链接 | | |
| color-success | | 成功状态 | | |
| color-warning | | 警告状态 | | |
| color-danger | | 错误状态 | | |

**间距**

| Token | 原始值 | 用途 | 决策理由 |
|-------|-------|------|---------|
| space-xs | space-4 | 图标与文字间距 | |
| space-sm | space-8 | 紧凑元素间距 | |
| space-md | space-16 | 标准元素间距 | |
| space-lg | space-24 | 区块间距 | |
| space-xl | space-48 | 页面区块分隔 | |

**圆角**

| Token | 值 | 用途 | 决策理由 |
|-------|-----|------|---------|
| radius-sm | 4px | 按钮、输入框 | |
| radius-md | 8px | 卡片 | |
| radius-lg | 12px | 弹窗 | |
| radius-full | 9999px | 头像、徽章 | |

**阴影**

| Token | 值 | 用途 | 决策理由 |
|-------|-----|------|---------|
| shadow-sm | | 卡片 | |
| shadow-md | | 下拉菜单 | |
| shadow-lg | | 弹窗 | |

---

### 组件层（Component）

> 语义层在特定组件中的别名。改主题时只改语义层，组件层自动跟随。

| 组件 Token | 语义 Token | 组件 | 决策理由 |
|-----------|-----------|------|---------|
| button-primary-bg | color-accent | Button | |
| button-primary-text | surface-primary | Button | |
| card-bg | surface-secondary | Card | |
| card-padding | space-lg | Card | |
| heading-color | text-primary | 标题 | |
| body-color | text-primary | 正文 | |
| input-border | surface-tertiary | Input | |
| input-focus-border | color-accent | Input | |

---

## 字体系统

### 字体家族

| 场景 | 字体 | 决策理由 |
|------|------|---------|
| 中文 | | |
| 英文 | | |
| 代码 | | |

### 字体层级

| Token | 大小 | 字重 | 行高 | 用途 | 决策理由 |
|-------|------|------|------|------|---------|
| font-h1 | text-32 | 700 | 1.2 | 页面标题 | |
| font-h2 | text-24 | 600 | 1.3 | 区块标题 | |
| font-h3 | text-20 | 600 | 1.4 | 子标题 | |
| font-body | text-16 | 400 | 1.5 | 正文 | |
| font-small | text-14 | 400 | 1.5 | 辅助文本 | |
| font-caption | text-12 | 400 | 1.4 | 标注 | |

---

## 动效规范

| 场景 | 时长 | 缓动 | 说明 | 决策理由 |
|------|------|------|------|---------|
| 按钮交互 | 150ms | ease-out | hover/active | |
| 面板展开 | 200ms | ease-in-out | accordion/dropdown | |
| 页面切换 | 300ms | ease-in-out | fade | |
| Toast 出现 | 200ms | ease-out | slide-in | |
| Toast 消失 | 150ms | ease-in | fade-out | |

---

## 图标系统

| 项目 | 值 | 决策理由 |
|------|-----|---------|
| 图标库 | | |
| 默认尺寸 | 20px | |
| 风格 | outline / filled / duotone | |
| 颜色 | currentColor（跟随文本）| |

---

## 响应式

### 断点策略

| 断点 | 宽度 | 说明 |
|------|------|------|
| mobile | < 640px | 基础样式（mobile-first）|
| tablet | ≥ 768px | 布局增强 |
| desktop | ≥ 1024px | 完整布局 |

> 断点从内容推导，不从设备清单推导。当内容在当前宽度下变得难以阅读或操作时，就是加断点的时机。

### 移动端约束

- 触控目标 ≥ 44×44pt（Apple HIG）/ 48×48dp（Material Design）
- 正文 ≥ 16px（避免 iOS 自动缩放输入框）
- 主 CTA 在拇指区（屏幕中下 1/3）
- 表单单列排列
- 表格水平滚动或卡片化

### 响应式 Token

```css
/* 基础（移动端） */
:root {
  --section-padding: 32px;
  --card-gap: 16px;
}

/* 桌面增强 */
@media (min-width: 1024px) {
  :root {
    --section-padding: 64px;
    --card-gap: 24px;
  }
}
```

---

## 交互模式库

> 不是组件实现，是组合规则。fe-artifact 消费这些模式生成代码。

### {模式名，如：列表模式}

- **结构**：{筛选栏 + 列表体 + 分页}
- **空状态**：{引导创建，不用"暂无数据"}
- **加载态**：{骨架占位，不用 spinner}
- **错误态**：{内联重试，不用全屏错误页}
- **移动端**：{筛选栏折叠为底部弹出}
- **决策理由**：{为什么这样组合}

### {模式名，如：表单模式}

- **结构**：
- **验证**：
- **提交态**：
- **错误反馈**：
- **移动端**：
- **决策理由**：

### {模式名，如：反馈模式}

- **Toast**：{轻量、自动消失、不阻断操作}
- **Dialog**：{需要用户确认、阻断操作}
- **Inline**：{表单字段级别的即时反馈}
- **选择规则**：{什么时候用哪种}
- **决策理由**：

---

## 页面结构

### 页面类型清单

| 页面 | 类型 | 布局模式 | 决策理由 |
|------|------|---------|---------|
| {页面名} | {Dashboard / List / Detail / ...} | {布局} | |

---

## 拒绝记录

> 明确记录拒绝了什么，防止未来重新做同样的决策。

| 拒绝了什么 | 为什么 |
|-----------|-------|
| | |

---

## CSS 变量输出

> 从三层 Token 生成的 CSS 变量。fe-artifact 直接引用。

```css
:root {
  /* === 原始值 === */
  --gray-50: #;
  --gray-100: #;
  /* ... */

  /* === 语义层 === */
  --surface-primary: var(--gray-50);
  --surface-secondary: var(--gray-100);
  --text-primary: var(--gray-900);
  --text-secondary: var(--gray-500);
  --color-accent: var(--blue-500);
  /* ... */

  /* === 组件层 === */
  --button-primary-bg: var(--color-accent);
  --card-bg: var(--surface-secondary);
  --card-padding: var(--space-lg);
  /* ... */
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  :root {
    --surface-primary: #0A0A0A;
    --surface-secondary: #171717;
    --text-primary: #FAFAFA;
    /* ... */
  }
}
```
