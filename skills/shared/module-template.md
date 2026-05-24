# module-template.md — 模块模板

> 每个模块用这个模板。自包含：需求 + 验收条件 + 数据模型 + 接口合约 + 约束。
> 目标：100-200 行。

---

# <Module Name> 模块

> 依赖共享决策 D1-D7，遵循共享约束。

## 入口

- 是否项目入口？哪个文件 boot？
- 被哪些模块 import？

## 需求

- F1:
- F2:

## 验收条件

- AC1:
- AC2:

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

> 被其他模块调用的函数。参数需要类型签名。

```
functionName(param1: Type1, param2: Type2): ReturnType
  → 功能描述
```

---

## 内部函数

> 模块内部使用，不需要导出。

```
helperFunction(param: Type): void
  → 内部实现细节
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

> 只放这个模块独有的约束，共享约束在 contract.md。

### 索引

-

### 性能

-
