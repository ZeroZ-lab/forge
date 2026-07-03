# Fixture: Architecture view derived page

请显式使用 Forge `architecture-view`，为 `order-routing` 生成本地派生架构视图。

你可以在当前临时 workspace 创建下面这些输入文档作为 source fixture，但最终输出产物只能是 `.forge/architecture-views/order-routing/index.html`。

`docs/features/order-routing/goal.md`:

````markdown
# Order Routing

## 目标

- 根据区域和库存为订单选择履约路径。

## 需要细节时

- Order API 和路由策略 → modules/order-api.md
- 审计行为 → modules/audit.md
````

`docs/features/order-routing/modules/order-api.md`:

````markdown
# Order API 模块

## 责任与不变量

- 负责订单路由请求和策略选择。

## 数据模型

```
OrderRoute: {
  id: string
  tenantId: string
}
```

## 接口合约

```
POST /orders/route
  Auth: Bearer JWT required
  Response: 201 Created -> OrderRoute
  Errors:
    - 400 INVALID_REQUEST_BODY
```
````

要求：

- 生成 `.forge/architecture-views/order-routing/index.html`。
- 输出中说明这是 `derived-view` 和 `not-fact-source`。
- 因 `modules/audit.md` 缺失，报告里必须出现 `Missing` 或等价缺口说明。
- 不创建 `docs/features/order-routing/architecture-view.html`。
- 不创建 `docs/architecture-view.md`。
- 不创建 Change Unit。
- 最终输出 benchmark report JSON。
