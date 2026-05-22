---
name: forge-codegen
description: 从 contract.md 和 modules/ 生成 src/ 和 tests/——文档是源代码，代码是投影。用户说"生成代码"、"写代码"、"build"、或有 plan.md 需要生成实现代码时触发。
disable-model-invocation: true
---

# Codegen — 构建阶段

## 职责

从详设文档（contract.md + modules/）生成可运行的代码（src/ + tests/）。

**原则**：文档是源代码，代码是投影。模型越强，同一份文档生成的代码越好。

## 决策点

### C1: 文件结构

**问**：
- contract.md 里定义了哪些目录结构？
- 每个模块对应哪些文件？
- 测试文件放在哪里？

**不变原则**：
- 文件结构从 contract.md 推导，不是从技术惯例推导
- 测试文件和源码文件对应（src/routes/tasks.ts → tests/routes/tasks.test.ts）
- 每个文件职责单一

**记录**：文件清单（路径 + 职责 + 来源文档）

### C2: 代码生成

**问**：
- 每个文件需要实现哪些功能？
- 哪些逻辑可以从 contract.md 直接推导？
- 哪些逻辑需要 AI 补充实现？

**不变原则**：
- 接口定义从 contract.md 推导（端点、参数、返回值）
- 业务逻辑从 modules/ 推导（每个模块的具体实现）
- AI 补充的部分要标注（// AI-generated: ...）

**记录**：代码清单（每文件：接口定义 + 业务逻辑 + AI 补充）

### C3: 测试生成

**问**：
- 每个端点需要哪些测试？
- 正常路径、边界情况、错误处理怎么覆盖？
- 测试数据怎么构造？

**不变原则**：
- 测试从 contract.md 的验收条件推导
- 每个端点至少 3 个测试（正常、边界、错误）
- 测试数据要可重复（不依赖外部状态）

**记录**：测试清单（每端点：测试用例 + 数据构造）

### C4: 依赖安装

**问**：
- 需要安装哪些依赖？
- 哪些是生产依赖，哪些是开发依赖？
- 版本号怎么确定？

**不变原则**：
- 依赖从 technical-design 推导
- 优先使用 contract.md 指定的版本
- 开发依赖和生产依赖要分开

**记录**：依赖清单（包名 + 版本 + 类型 + 理由）

### C5: 配置生成

**问**：
- 需要哪些配置文件？
- 配置项从哪里来？
- 环境变量怎么管理？

**不变原则**：
- 配置文件从 contract.md 推导
- 敏感信息用环境变量
- 配置要有默认值（开发环境）

**记录**：配置清单（文件 + 配置项 + 来源 + 默认值）

## 文档约束

**src/ 必须包含：**
1. 路由文件（src/routes/*.ts）— 从 contract.md 端点定义推导
2. Schema 文件（src/schemas/*.ts）— 从 contract.md 数据模型推导
3. 业务逻辑（src/services/*.ts）— 从 modules/ 业务规则推导
4. 数据库访问（src/models/*.ts）— 从 contract.md 数据模型推导
5. 中间件（src/middleware/*.ts）— 从 contract.md 横切关注点推导

**tests/ 必须包含：**
1. 路由测试（tests/routes/*.test.ts）— 从 contract.md 验收条件推导
2. Schema 测试（tests/schemas/*.test.ts）— 从 contract.md 数据模型推导
3. 业务逻辑测试（tests/services/*.test.ts）— 从 modules/ 业务规则推导
4. 集成测试（tests/integration/*.test.ts）— 从 contract.md 端到端流程推导

**不应包含：**
- 文档（那是 docs/ 的事）
- 部署配置（那是 发布 的事）
- 监控配置（那是 发布 的事）

## 恒久约定

### 文件结构格式
```markdown
## 文件结构

```
src/
├── routes/
│   ├── tasks.ts          # 任务路由（来自 contract.md）
│   └── users.ts          # 用户路由（来自 contract.md）
├── schemas/
│   ├── task.ts           # 任务 Schema（来自 contract.md）
│   └── user.ts           # 用户 Schema（来自 contract.md）
├── services/
│   ├── task.ts           # 任务业务逻辑（来自 modules/tasks.md）
│   └── user.ts           # 用户业务逻辑（来自 modules/users.md）
└── models/
    ├── task.ts           # 任务数据访问（来自 contract.md）
    └── user.ts           # 用户数据访问（来自 contract.md）
```
```

### 代码生成格式
```markdown
## 代码生成

### src/routes/tasks.ts
**来源**：contract.md 端点定义  
**接口定义**：
- POST /tasks → createTask()
- GET /tasks → listTasks()
- GET /tasks/:id → getTask()

**业务逻辑**：
- createTask(): 从 modules/tasks.md 推导
- listTasks(): 从 modules/tasks.md 推导
- getTask(): 从 modules/tasks.md 推导

**AI 补充**：
- 错误处理（400、401、404、500）
- 日志记录
```

### 测试生成格式
```markdown
## 测试生成

### tests/routes/tasks.test.ts
**来源**：contract.md 验收条件

**测试用例**：
1. POST /tasks 201 — 正常创建任务
2. POST /tasks 400 — 缺少必填字段
3. POST /tasks 401 — 未认证

**数据构造**：
- validTask: { title: "Test", description: "..." }
- invalidTask: { title: "" }
```

## 入口/出口条件

**入口条件**：
- 有 contract.md + modules/（来自 /forge-detail）
- 有 plan.md（来自 /forge-plan 
- 或用户已有详设和任务分解（跳过 detail 和 plan）

**出口条件**：
- 生成了 src/ 和 tests/
- 所有端点都有实现
- 所有端点都有测试
- 测试通过（npm test）
- 用户确认是否继续（进入 写测试）

## 何时不使用

- 只有文档，没有代码（不需要生成代码）
- 已有完整代码（直接进入 写测试）
- 纯文档项目（跳过构建阶段）

## 红旗清单

- 代码和 contract.md 不一致 → 强制对齐（"端点定义对吗？"）
- 测试覆盖不足 → 强制补充（"每个端点至少 3 个测试"）
- 没有错误处理 → 强制补充（"400、401、404、500 怎么处理？"）
- 依赖版本不确定 → 强制指定（"contract.md 里指定了什么版本？"）
- 配置没有默认值 → 强制补充（"开发环境怎么跑？"）

## 验证清单

- [ ] 文件结构是否从 contract.md 推导？
- [ ] 所有端点是否都有实现？
- [ ] 所有端点是否都有测试（至少 3 个）？
- [ ] 测试是否通过（npm test）？
- [ ] 是否有错误处理（400、401、404、500）？
- [ ] 依赖是否从 technical-design 推导？
- [ ] 配置是否有默认值？
