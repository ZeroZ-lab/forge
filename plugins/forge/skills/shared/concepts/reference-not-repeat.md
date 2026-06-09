# 引用而非重复（Reference, Don't Repeat）

上游文档定义的信息，下游文档引用编号，不复述内容。

## 引用层次

| 信息源头 | 下游引用方式 |
|---------|------------|
| project.md PD# | PRD / goal / plan / test 引用 "project.md PD3"，不重复具体内容 |
| goal.md FD# | plan / test / codegen 引用 "goal.md FD4"，不重复 |
| PRD US-XX / AC-XX-X | test-cases / plan 引用 "US-01 / AC-01-1"，不重复验收条件全文 |
| modules/\<name\>.md | codegen 读取完整内容，plan 引用模块名 |
| DESIGN.md | frontend modules / fe-system 引用 "DESIGN.md Token 系统"，不重复 Token 值 |

## 何时允许重复

1. **精化**：下游文档需要精化上游信息（如 PRD 把 project.md 的通用性能目标细化到具体命令）
   → 标注"精化自 project.md PD# 性能"

2. **新增**：约束是新增的（如 PRD 新增 project.md 没有的安全约束）
   → 标注"PRD 新增，不在 project.md 中"

3. **上下文摘要**：一行摘要帮助读者理解，不展开
   → 如 "路径 sandbox（PD3）"

## 接口 / 行为的单一权威（Single Source of Truth）

约束之外，**接口签名**和**可观察行为**也必须单源，否则会出现"同一件事被两份文档说了两遍且说法不同"的矛盾。

| 信息类型 | 唯一权威 | 其他文档怎么做 |
|---------|---------|--------------|
| 组件 Props / interface 签名 | 该组件的 module spec | goal.md / notes 只列类型名 + 一行说明，引用 module，不重写签名 |
| 共享数据模型 | goal.md 共享数据模型 | module / notes 引用类型名，不复制字段 |
| 可观察行为（验收点） | PRD 的 AC-XX-X | notes / module 可"精化"AC 但必须引用编号，**不得改变其断言** |
| PRD 点名的具体技术 | PRD | 下游若要否决（如改用别的方案），必须回流 define 升级 PRD，**禁止静默替换** |

**典型矛盾（必须避免）**：
- `modelUrl: string`（notes）vs `modelUrl?: string`（module）——同一 Props 两处签名不一致。
- AC「无操作 5 秒后自转」（PRD）vs「交互结束即恢复」（module）——module 改写了 AC 断言。
- AC「CountUp 滚动」（PRD）vs「用 CSS transition 替代」（notes）——下游静默否决 PRD 具名技术。

## 禁止重复

- 完整复制上游文档的表格或列表到新文档（导致同步维护灾难）
- 在不同文档中对同一约束使用不同措辞（会导致歧义和矛盾）
- 在新文档中扩展上游约束的范围而不标注（如 project.md 说 "≥80% 覆盖率"，testing/strategy.md 说 "不做覆盖率门槛"）
- 同一接口/Props 在两份文档各写一遍签名（取单源，其余引用）
- 下游文档改写或否决上游 AC / 具名技术而不回流升级（取单源 + escalate）

## 检查方法

生成文档时，对每个约束/数据模型/接口段落检查：
1. 这个信息是否已在上游文档中定义？
2. 如果是 → 引用编号，不复制内容
3. 如果需要精化 → 标注来源 + 只写精化部分
4. 如果是新增 → 标注"新增"

**矛盾检测（跨文档）**：对同一接口/Props/AC/具名技术，如果它在多份文档中出现：
1. 签名/断言是否完全一致？不一致 → 报矛盾，取单源（接口取 module spec，行为取 PRD AC）。
2. 下游是否改写或否决了上游 AC / PRD 具名技术？是 → 报矛盾，回流 define 升级，禁止静默替换。
3. 同一 Props 是否在两份文档各写了一遍签名？是 → 取单源，其余改为引用。
