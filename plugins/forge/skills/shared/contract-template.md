# contract-template.md — 共享骨架模板

> 每个 feature 的 contract.md 用此模板。只放共享部分，模块细节放 modules/*.md。
> 目标：~100 行。含完整共享数据模型时 ≤ 200 行。几乎不变。
> 模块专属数据模型和接口签名放 modules/<name>.md，不在此展开。
> 决策编号使用 FD# 前缀（Feature Decision），与 project.md 的 PD#（Project Decision）、frontend/contract.md 的 FE#（Frontend Decision）、api/contract.md 的 API#（API Decision）和 database/contract.md 的 DB#（Database Decision）区分。

---

# <Feature Name>

> 一句话：这个 feature 做什么、为谁做。

## 共享决策

> 本 feature 特有的跨领域决策。领域专属决策放各领域 contract.md。
> 决策主题按实际领域填写——API 项目侧重资源建模/分页/认证，前端项目侧重框架/状态/样式，混合项目按需组合。

| # | 决策 | 选择 | 详情 |
|---|------|------|------|
| FD1 | （决策主题） | | （选择 + 详情） |
| FD2 | （决策主题） | | |
| FD3 | （决策主题） | | |

> 每个决策的完整理由和被拒方案记录在下方。

### FD1: {决策主题}

**选择**：  
**理由**：  
**拒绝**：

### FD2: {决策主题}

**选择**：  
**理由**：  
**拒绝**：

### FD3: {决策主题}

**选择**：  
**理由**：  
**拒绝**：

---

## 共享数据模型

> 多个模块共用的数据模型。模块专属模型放 modules/*.md。

```
<ModelName>: {
  id: string
  ...
  createdAt: string (ISO 8601)
}
```

---

## 共享约束

> 引用 project.md 共享约束（PD#），不复制内容。

### 本 Feature 新增约束
{仅写 project.md 中没有的新增约束，无新增则写"无"}

### 精化约束
{如果需要把 project.md 的通用约束精化到具体场景，标注来源。如"精化自 PD3：tile 限制 64"}

---

## 技术选型

> 引用 project.md 已有选型，只补充本 feature 特有的依赖。

| 层 | 选择 | 理由 |
|---|------|------|
| （按实际填写） | | |

---

## 领域索引

> 列出本 feature 涉及的所有领域。由 detail/test 阶段自动维护。

| 领域 | 目录 | 状态 | 说明 |
|------|------|------|------|
| （按实际填写） | api/ | v1.0 | |
| | frontend/ | v1.0 | |
| | database/ | v1.0 | |
| | testing/ | v1.0 | |

> 只列实际存在的领域。纯前端项目不列 API/Database。

---

## 模块索引

> 列出各领域下的模块文件。由 detail 阶段各领域 skill 自动维护。
> 纯单领域项目（如纯前端创意编码）可省略此节，直接在领域 contract.md 中列模块。

| 领域 | 模块 | 文件 | 说明 |
|------|------|------|------|
| frontend | | frontend/modules/xxx.md | |
| api | | api/modules/xxx.md | |

---

## 下游依赖

> 哪些下游文档依赖本 contract。detail 编排阶段用此表做漂移检测。
> 纯前端项目可省略此节。

| 下游文档 | 依赖内容 | 最后同步 |
|---------|---------|---------|
| | | |

---

## 代码映射

> 按实际领域填写。后端示例：

```
contract.md ──────────→ src/middleware/  (auth, error, idempotency)
                         src/db/schema.ts (所有模块的表)

modules/<name>.md ────→ src/routes/<name>.ts
                         src/schemas/<name>.schema.ts
                         src/services/<name>.service.ts
                         tests/<name>.contract.test.ts
```

> 前端示例：

```
contract.md ──────────→ src/components/scene/ (3D 组件)
                         src/components/ui/    (UI 组件)
                         src/stores/           (状态管理)

modules/<name>.md ────→ src/components/<Name>.tsx
                         src/hooks/use<Name>.ts
```

---

## 编排

> 模块间的调用顺序和事件绑定。模块文档只记"这个模块做什么"，这里记"谁在什么时机调用谁"。
> 这部分是胶水代码的文档——没有它，重建时每个模块能写对，但不知道怎么串起来。
> 详细结构使用 `${CLAUDE_SKILL_DIR}/../shared/contract-orchestration-template.md`。

### 入口文件

`src/<entry-file>` — 唯一入口，负责初始化模块并启动主流程。

### 编排索引

| 编排项 | 位置 | 说明 |
|--------|------|------|
| 启动序列 | `${CLAUDE_SKILL_DIR}/../shared/contract-orchestration-template.md` | 初始化顺序 |
| 主循环 / 请求处理 | `${CLAUDE_SKILL_DIR}/../shared/contract-orchestration-template.md` | 运行时调用链 |
| 事件绑定 | `${CLAUDE_SKILL_DIR}/../shared/contract-orchestration-template.md` | 事件源到模块调用 |
| 模式优先级 | `${CLAUDE_SKILL_DIR}/../shared/contract-orchestration-template.md` | 多控制源冲突处理 |
