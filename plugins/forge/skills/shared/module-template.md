# module-template.md — 模块模板

> 只在 goal.md 不足以表达模块边界时创建。模块文档定义公共接口、不变量、依赖和模块特有约束，不复制 feature 目标与验收条件。
> 目标：100-200 行。
> 后端模块侧重接口合约，前端模块侧重组件结构和数据消费。按模块类型选择对应段落。
> 完成标准追溯：引用 goal.md AC/FD，不在本文件重写。
> 约束引用：共享约束引用 goal.md FD#，不重复内容。

---

# <Module Name> 模块

> 自描述头（agent 读取预算提示）：一句话说明本模块覆盖什么、不含什么（指向同级模块）、读这个是否就够。
> 例：「覆盖：评论端点的请求/响应合约。不含数据模型（见 db.md）。读这个就够，无需回 goal.md。」
> 依赖共享决策 FD#，遵循共享约束。

## 入口

- 是否项目入口？哪个文件 boot？
- 被哪些模块 import？

## 责任与不变量

- 负责：
- 不负责：
- 必须始终成立：
- 来源：goal.md FD#/AC#

---

## 数据模型

```
<ModelName>: {
  id: string (ULID)
  ...
  createdAt: string (ISO 8601)
}
```

---

## 公共接口

> 被其他模块调用的函数或组件。参数需要类型签名。

```
functionName(param1: Type1, param2: Type2): ReturnType
  → 功能描述
```

> 前端组件：

```
ComponentName: React.FC<{ prop1: Type1, prop2: Type2 }>
  → 功能描述
  → 从 store/hook 读取的数据
```

---

## 组件结构

> 前端模块必填。组件树伪代码 + 关键属性 + 交互行为。
> 后端模块可省略此节。

```
ParentComponent
├── ChildA
│   ├── prop={value}
│   └── onClick → handler()
├── ChildB
│   └── conditional rendering
└── 交互事件
    ├── onPointerOver → ...
    └── onClick → ...
```

---

## 数据消费

> 前端模块必填。从 store/hook/context/API 读取的数据。
> 后端模块可省略此节（改为"依赖注入"或"数据库查询"）。

```
from store: fieldA, fieldB, actionC()
from hook: useSomething() → { data, loading, error }
from API: GET /path → ResponseType
```

---

## 依赖关系

> import 哪些模块的哪些函数？

```
from module-a: functionX, functionY
from module-b: typeZ
```

---

## 接口合约

> 后端模块必填。HTTP 端点的请求/响应/错误合约。
> 前端模块可省略此节（已在组件结构和数据消费中覆盖）。

```
METHOD /path
  Auth: Bearer JWT required
  Request: {
    field: type (constraints)
  }
  Response: 200/201
    { ... }
  Errors:
    - 400 ERROR_CODE (description)
    - 401 TOKEN_EXPIRED / TOKEN_INVALID
    - 404 RESOURCE_NOT_FOUND
  Notes:
    - ...
```

---

## 模块特有约束

> 只放这个模块独有的约束，共享约束在 goal.md。

### 性能

-

### 其他

-
