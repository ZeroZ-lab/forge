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

## 禁止重复

- 完整复制上游文档的表格或列表到新文档（导致同步维护灾难）
- 在不同文档中对同一约束使用不同措辞（会导致歧义和矛盾）
- 在新文档中扩展上游约束的范围而不标注（如 project.md 说 "≥80% 覆盖率"，testing/goal.md 说 "不做覆盖率门槛"）

## 检查方法

生成文档时，对每个约束/数据模型/接口段落检查：
1. 这个信息是否已在上游文档中定义？
2. 如果是 → 引用编号，不复制内容
3. 如果需要精化 → 标注来源 + 只写精化部分
4. 如果是新增 → 标注"新增"
