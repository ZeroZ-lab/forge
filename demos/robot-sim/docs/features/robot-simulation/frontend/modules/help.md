# help — 帮助面板

> 无依赖

## 入口

- 非项目入口
- 被 import 方：sim-engine.js

## 需求

- F1: 按 H 或点击按钮打开帮助面板
- F2: 显示所有快捷键和功能说明
- F3: 点击面板外部或 Esc 关闭

## 验收条件

- AC1: 帮助面板为浮动覆盖层（position: fixed, z-index: 1000）
- AC2: 列出所有快捷键和对应功能
- AC3: Esc 键关闭
- AC4: 点击覆盖层背景区域关闭

## 公共接口

> 被 sim-engine.js 调用。

```
createHelpOverlay(): HTMLElement
  → 创建帮助面板 DOM + 注入样式到 document.head
  → 点击覆盖层背景关闭

toggleHelp(): void
  → 切换帮助面板的显示/隐藏
```

## 内部函数

> 模块内部使用，不导出。

```
HELP_CONTENT: string
  → 帮助面板的 HTML 内容（快捷键表格 + 功能说明列表）

HELP_STYLES: string
  → 帮助面板的 CSS 样式（覆盖层 + 面板 + 表格 + kbd）
```

## 依赖关系

```
无外部 import（纯 DOM 操作，样式内联注入）
```

## 文件映射

```
src/ui/help.js
```
