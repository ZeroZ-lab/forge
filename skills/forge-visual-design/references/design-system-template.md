# DESIGN.md — <Project Name>

> 设计系统：色彩、字体、间距、组件。所有页面消费本系统，不单独设计。

## 版本信息

| 项目 | 值 |
|------|-----|
| 版本 | v1.0 |
| 日期 | YYYY-MM-DD |
| 设计师 | |

---

## 色彩系统

### 主色

| Token | 值 | 用途 |
|-------|-----|------|
| color-primary | # | 主操作、链接 |
| color-secondary | # | 次要操作 |
| color-accent | # | 强调、高亮 |

### 语义色

| Token | 值 | 用途 |
|-------|-----|------|
| color-success | # | 成功状态 |
| color-warning | # | 警告状态 |
| color-error | # | 错误状态 |
| color-info | # | 信息提示 |

### 中性色

| Token | 值 | 用途 |
|-------|-----|------|
| gray-50 | # | 背景 |
| gray-100 | # | 卡片背景 |
| gray-300 | # | 边框 |
| gray-500 | # | 次要文本 |
| gray-700 | # | 正文 |
| gray-900 | # | 标题 |

### 暗色模式

> 如需支持，定义对应的暗色变体。

---

## 字体系统

### 字体家族

| 场景 | 字体 |
|------|------|
| 中文 | |
| 英文 | |
| 代码 | |

### 字体层级

| Token | 大小 | 字重 | 行高 | 用途 |
|-------|------|------|------|------|
| font-h1 | 32px | 700 | 1.2 | 页面标题 |
| font-h2 | 24px | 600 | 1.3 | 区块标题 |
| font-h3 | 20px | 600 | 1.4 | 子标题 |
| font-body | 16px | 400 | 1.5 | 正文 |
| font-small | 14px | 400 | 1.5 | 辅助文本 |
| font-caption | 12px | 400 | 1.4 | 标注 |

---

## 间距系统

**基准**：4px 网格

| Token | 值 | 用途 |
|-------|-----|------|
| space-1 | 4px | 紧凑间距 |
| space-2 | 8px | 元素内间距 |
| space-3 | 12px | 小组件间距 |
| space-4 | 16px | 标准间距 |
| space-6 | 24px | 区块内间距 |
| space-8 | 32px | 区块间间距 |
| space-12 | 48px | 大区块间距 |
| space-16 | 64px | 页面级间距 |

---

## 圆角

| Token | 值 | 用途 |
|-------|-----|------|
| radius-sm | 4px | 按钮、输入框 |
| radius-md | 8px | 卡片 |
| radius-lg | 12px | 弹窗 |
| radius-full | 9999px | 头像、徽章 |

---

## 阴影

| Token | 值 | 用途 |
|-------|-----|------|
| shadow-sm | | 卡片 |
| shadow-md | | 下拉菜单 |
| shadow-lg | | 弹窗 |

---

## 组件规范

### Button

**变体**：primary / secondary / ghost / danger  
**尺寸**：sm (32px) / md (40px) / lg (48px)  
**状态**：default / hover / active / disabled / loading

```
primary:  bg=primary  text=white   hover=primary-dark
secondary: bg=transparent text=primary border=primary
ghost:    bg=transparent text=gray-700 hover:bg=gray-100
danger:   bg=error    text=white
```

### Input

**状态**：default / focus / error / disabled  
**尺寸**：sm / md / lg（同 Button）

```
default: border=gray-300
focus:   border=primary ring=primary/20
error:   border=error   ring=error/20
```

### Card

```
padding: space-6
border-radius: radius-md
shadow: shadow-sm
border: 1px solid gray-100
```

### DataTable

```
header: bg=gray-50 font-weight=600
row:    border-bottom=gray-100 hover:bg=gray-50
cell:   padding=space-3 space-4
```

### StatusBadge

```
success: bg=success/10 text=success
warning: bg=warning/10 text=warning
error:   bg=error/10   text=error
info:    bg=info/10    text=info
```

---

## 动效规范

| 场景 | 时长 | 缓动 | 说明 |
|------|------|------|------|
| 按钮交互 | 150ms | ease-out | hover/active |
| 面板展开 | 200ms | ease-in-out | accordion/dropdown |
| 页面切换 | 300ms | ease-in-out | fade |
| Toast 出现 | 200ms | ease-out | slide-in |
| Toast 消失 | 150ms | ease-in | fade-out |

---

## 图标系统

| 项目 | 值 |
|------|-----|
| 图标库 | |
| 默认尺寸 | 20px |
| 风格 | outline / filled / duotone |
| 颜色 | currentColor（跟随文本） |

---

## 响应式

### 断点策略

| 断点 | 宽度 | 说明 |
|------|------|------|
| mobile | < 640px | 基础样式（mobile-first） |
| tablet | ≥ 768px | 布局增强 |
| desktop | ≥ 1024px | 完整布局 |

> 断点从内容推导，不从设备清单推导。当内容在当前宽度下变得难以阅读或操作时，就是加断点的时机。

### 移动端约束

- 触控目标 ≥ 44×44pt（Apple HIG）/ 48×48dp（Material Design）
- 正文 ≥ 16px（避免 iOS 自动缩放输入框）
- 主 CTA 在拇指区（屏幕中下 1/3）
- 表单单列排列
- 表格水平滚动或卡片化

### 响应式 Token 示例

```css
/* 基础（移动端） */
:root {
  --section-padding: 32px;
  --card-gap: 16px;
  --body-size: 16px;
}

/* 桌面增强 */
@media (min-width: 1024px) {
  :root {
    --section-padding: 64px;
    --card-gap: 24px;
    --body-size: 14px;
  }
}
```
