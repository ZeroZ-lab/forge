# <Page or Component> Module

> 只在 feature goal 不足以表达前端公共接口和不变量时创建。引用 goal AC/FD，不复制目标或完成标准。

## 责任与不变量

- 负责：
- 不负责：
- 必须始终成立：
- 来源：goal.md AC#/FD#

## 入口

- 路由/父组件：
- 使用方：

## 公共接口

```ts
type Props = {
  // public contract only
}
```

- 事件：
- 返回/副作用：

## 组件结构

```text
Page
├── ComponentA
└── ComponentB
```

## 数据消费

- Server state:
- Client state:
- Derived state:
- Cache/retry:

## 状态与恢复

| State | User-visible behavior | Recovery |
|-------|-----------------------|----------|
| loading | | |
| empty | | |
| error | | |
| disabled | | |
| success | | |

## 依赖

- API/module:
- Design tokens:
- External dependency:

## 模块特有约束

- Performance:
- Accessibility:
- Responsive behavior:
