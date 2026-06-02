# frontend-module-template.md — 前端模块模板

> frontend-design 专用。产出 frontend/modules/*.md。
> 目标：100-200 行。每个组件自包含：需求 + 验收条件 + 组件结构 + 数据消费 + 约束。

---

# <Component> 模块

> 依赖共享决策 FD#，遵循共享约束。

## 入口

- 是否项目入口组件？哪个文件引用？
- 被哪些其他组件 import？

## 需求

- US-XX: （用户故事编号）
- 功能点描述

## 验收条件

- AC1: （可测试的验收条件）
- AC2:

---

## 数据模型

> 本组件专属的类型定义。共享类型在 contract.md。

```typescript
interface ComponentProps {
  prop1: type
  prop2: type
}
```

---

## 公共接口

```
ComponentName: React.FC<{ prop1: Type1, prop2?: Type2 }>
  → 功能描述
  → 渲染什么内容
```

---

## 组件结构

> 组件树伪代码（JSX 结构 + 关键属性 + 条件渲染 + 交互事件）。

```
ComponentName (position/layout 说明)
├── ChildA
│   ├── prop={value}
│   └── style/token 引用
├── ChildB (条件渲染: condition)
│   └── 嵌套结构
└── 交互事件
    ├── onClick → handler()
    ├── onPointerOver → hover 效果
    └── onKeyDown → 快捷键处理
```

---

## 数据消费

> 从 store / hook / context / API 读取的数据。

```
from storeName: fieldA, fieldB, actionC()
from useHookName: { data, loading, error }
from context: contextValue
```

---

## 内部函数

> 组件内部使用，不导出。

```
helperFunction(param: Type): ReturnType
  → 功能描述
```

---

## 依赖关系

> import 哪些模块的哪些函数/组件？

```
from stores/storeName: fieldA, actionB
from hooks/useHookName: hookFunction
from components/OtherComponent: OtherComponent
from lucide-react: IconName
```

---

## 模块特有约束

> 只放这个组件独有的约束，共享约束在 contract.md。

### 性能

- （React.memo / useMemo / useCallback 策略）

### 交互

- （动画时长 / 反馈机制 / 键盘支持）

### 样式

- （响应式断点 / 暗色模式 / 组件特有 Token）
