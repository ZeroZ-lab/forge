# theme — 主题切换

> 依赖: DESIGN.md (颜色 token)

## 入口

- 非项目入口
- 被 import 方：sim-engine.js

## 需求

- F1: 暗色/亮色两套主题
- F2: 按钮一键切换
- F3: 主题偏好持久化到 localStorage

## 验收条件

- AC1: 亮色主题颜色映射完整（背景白、文字深、强调色不变）
- AC2: 切换时所有 CSS 变量同时更新
- AC3: localStorage 存储 'theme' 键，刷新后保持

## 数据模型

```
ThemeVars {
  '--bg-primary': string
  '--bg-secondary': string
  '--bg-tertiary': string
  '--text-primary': string
  '--text-secondary': string
  '--text-muted': string
}
```

## 公共接口

> 被 sim-engine.js 调用。

```
initTheme(): void
  → 从 localStorage 读取 'theme' 键，应用对应主题
  → 无记录则默认 'dark'

toggleTheme(): string
  → 切换 dark ↔ light，保存到 localStorage，返回当前主题名

getCurrentTheme(): string
  → 返回 'dark' | 'light'
```

## 内部函数

> 模块内部使用，不导出。

```
applyTheme(): void
  → 将当前主题的 CSS 变量写入 document.documentElement.style
```

## 依赖关系

```
无外部 import（直接操作 DOM 和 localStorage）
```

## 文件映射

```
src/ui/theme.js
```
