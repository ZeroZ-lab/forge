# contract-template.md — 共享骨架模板

> 每个 feature 的 contract.md 用这个模板。只放共享部分，模块细节放 modules/*.md。
> 目标：~100 行，几乎不变。

---

# <Feature Name>

> 一句话：这个 feature 做什么、为谁做。

## 共享决策

| # | 决策 | 选择 | 详情 |
|---|------|------|------|
| D1 | 资源建模 | （父子/扁平/图） | 资源列表 + 关系 |
| D2 | 分页 | （page/cursor/混合） | 默认 pageSize + 排序 |
| D3 | 错误格式 | （RFC 9457/轻量/自定义） | schema + code 规范 |
| D4 | 权限失败 | （403/404/混合） | 哪些资源用哪种 |
| D5 | 幂等 | （Idempotency-Key/业务去重/不处理） | 哪些端点需要 |
| D6 | 并发 | （version/ETag/不处理） | 哪些资源需要 |
| D7 | 认证 | （JWT/Session/API Key） | 过期策略 |

> 每个决策的完整理由和被拒方案记录在下方。

### D1: 资源建模

**选择**：  
**理由**：  
**拒绝**：  

### D2: 分页策略

**选择**：  
**理由**：  
**拒绝**：  
**默认排序**：  

### D3: 错误格式

**选择**：  
**理由**：  
**拒绝**：  
**格式**：  
```json
{
  "type": "https://api.example.com/errors/<error-type>",
  "title": "Human Readable Title",
  "status": 400,
  "detail": "Specific error description.",
  "extensions": {
    "code": "UPPER_SNAKE_CASE",
    "requestId": "req_xxx"
  }
}
```

### D4: 权限失败策略

**选择**：  
**理由**：  
**拒绝**：  

### D5: 幂等策略

**选择**：  
**理由**：  
**拒绝**：  
**规则**：  

### D6: 并发控制

**选择**：  
**理由**：  
**拒绝**：  
**规则**：  

### D7: 认证方式

**选择**：  
**理由**：  
**拒绝**：  
**规则**：  

---

## 共享数据模型

> 多个模块共用的数据模型（如 User）。模块专属模型放 modules/*.md。

```
User: {
  id: string (ULID)
  email: string (unique)
  name: string
  role: "admin" | "member"
  tenantId: string
  createdAt: string (ISO 8601)
  updatedAt: string (ISO 8601)
}
```

---

## 共享约束

### 安全

- 多租户隔离：所有查询必须带 tenantId（从认证上下文中提取）
- 不暴露内部字段：tenantId、deletedAt 不出现在 API 响应中

### 性能

- 列表查询必须走索引
- pageSize 上限 100

### 兼容性

- 不删除已有 response 字段
- 新增字段必须可选
- 不修改已有字段的类型或语义
- breaking change 必须版本化

---

## 技术选型

| 层 | 选择 | 理由 |
|---|------|------|
| Runtime | | |
| Framework | | |
| Validation | | |
| Database | | |
| ORM | | |
| Auth | | |
| ID | | |

---

## 模块索引

| 模块 | 文件 | 端点数 | 说明 |
|------|------|--------|------|
| | modules/xxx.md | | |

---

## 代码映射

```
contract.md ──────────→ src/middleware/  (auth, error, idempotency)
                         src/db/schema.ts (所有模块的表)

modules/<name>.md ────→ src/routes/<name>.ts
                         src/schemas/<name>.schema.ts
                         src/services/<name>.service.ts
                         tests/<name>.contract.test.ts
```

---

## 编排

> 模块间的调用顺序和事件绑定。模块文档只记"这个模块做什么"，这里记"谁在什么时机调用谁"。
> 这部分是胶水代码的文档——没有它，重建时每个模块能写对，但不知道怎么串起来。

### 入口文件

`src/<entry-file>` — 唯一的入口，负责初始化所有模块并启动主循环。

### 启动序列

```
1. <第一步>: <哪个模块的哪个函数>
2. <第二步>: <哪个模块的哪个函数>
   └── <子步骤>: <初始化时附带的创建>
3. ...
N. <最后一步>: 启动主循环 / 监听端口
```

### 主循环 / 请求处理

```
<每帧/每请求> 执行:
  │
  ├── <阶段 1>: <调用哪个模块的什么函数>
  ├── <阶段 2>: <调用哪个模块的什么函数>
  │   ├── for each <实体>:
  │   │   ├── <子步骤>
  │   │   └── <子步骤>
  │   └── <后处理>
  └── <阶段 N>: <输出/渲染>
```

### 事件绑定

| 事件源 | 触发条件 | 调用 | 所在模块 |
|--------|---------|------|---------|
| | | | |

### 模式优先级

> 当多个控制/处理源同时存在时的优先级（如果适用）

```
<最高优先级> > <次优先> > ... > <默认行为>
```
