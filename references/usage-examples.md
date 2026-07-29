# Forge 自适应运行示例

## 1. 清晰小改：直接行动

```text
用户：把设置页按钮文案从“保存设置”改成“保存”

Kernel
  → 确认目标、范围、权限和验证方式
direct action
  → 修改最小文件
  → 运行相关测试/检查
  → L0 self-check
完成
  → 按项目政策记录必要证据；零 Skill 合法
```

不为进入流程创建 goal、plan、test-cases、review 报告或 Trace。完成只看目标与证据，不看 Skill 命中。

## 2. 小功能：按缺口加载能力

```text
用户：给任务加归档功能

Kernel
  → 目标与 AC 已清晰，但共享 feature 合同需要持久化
detail（可选）
  → 创建/更新 docs/features/task-archive/goal.md
Chain Owner
  → 直接实现 src/ + tests/
  → 运行最窄有效验证
  → 汇总一个 docs/change-units/CU-*.md
```

如果合同已经明确，可以跳过 `detail`；选择 `detail` 不自动要求 `codegen` 或 `review`。

## 3. 边界或技术不确定：只加载独特能力

```text
用户：给任务做一个更好用的搜索

define（边界不清时可选）
  → 明确用户、非目标和可测试完成标准
research（算法取舍确有不确定性时可选）
  → 给 BM25 / vector / hybrid 证据菜单
Chain Owner
  → 接受的决策写回 goal/project/ADR
  → 自主选择实现与验证路径
```

只有产品合约有独立 owner/审批时创建 PRD；只有研究证据需独立复核/交接时创建 research brief。

## 4. 跨模块或高风险

L2/L3 跨模块任务可按需使用 `detail`、`plan`、`test` 或领域能力。任务序列留在当前对话或 issue，不创建 `plan.md`。完成或 release-ready 前必须由独立 reviewer/verifier 复核；不可用时保持 partial/正确阻塞并披露残余风险。

## 5. Bugfix

局部 bugfix 默认先建立 red-capable 反馈，再做最小修复和回归验证。`codegen` 的 bugfix playbook 是可选能力；无可复现反馈时 safe stop，不用 goal 文档或 Skill 调用制造进度。

## 6. 显式兼容模式

需要复现 Forge 0.52.0 行为时，用户或 benchmark 可明确选择：

```text
legacy-chain: detail → codegen → review
```

该链是兼容 preset 和 effectiveness `legacy-chain` 基线，不是生产 adaptive runtime 的默认路径。

## 7. 测试、发布与思考

- `test-strategy` / `test-cases`：仅在风险治理或场景推导的边际价值明确时使用；自动化场景写入测试代码。
- `deploy`：普通发布用对话清单；生产 rollout、迁移、回滚或运维交接才创建独立计划。
- `think`：只用于显式结构化挑战；普通推理不需要激活 Skill。
- `review`：L0/L1 self-check 不称为独立 review；L2/L3、P0/P1 或显式审查才使用独立能力。

## 8. 读取与完成

读取顺序按相关性：用户目标和仓库状态 → 相关 goal/modules → `docs/project.md` → 相关 Change Unit → 存在且相关的 gated artifacts。

完成要求：

- 目标和权威事实已同步；
- 有实际运行证据，未验证项如实披露；
- 同一目标只有一个 Chain Owner 和一个汇总 CU；
- 不维护平行 changelog、timeline、status 或 trace；
- Skill 激活数量、顺序和动作路径不参与完成判定。
