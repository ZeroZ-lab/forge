# Runtime Control Graph Fix Plan

> 日期：2026-05-25  
> 目标：修复 `registry.yaml` 当前把阶段流转、反馈回路、质量门和外部执行目标压成同一组 `upstream/downstream` 的问题，让 Forge 的运行时控制面更准确表达控制论 / MAPE-K 闭环。

## 1. 当前问题

### P1：图语义被互逆约束压扁

当前 `registry.yaml` 用 `upstream` / `downstream` 表达所有关系，并由 validator 强制互逆。这解决了 dangling edge，但引入了新问题：

- 正常阶段流转、反馈回路、质量门、可选回流被混在同一张图里。
- `forge-codegen` 与 `forge-test`、`forge-detail`、`forge-review` 互为上下游，语义上不清楚是“下一阶段”还是“偏差回流”。
- 后续如果用 registry 做 routing，容易把 feedback path 误当作默认 workflow path。

### P2：README 对测试能力描述偏强

当前 `node --test` 只是静态 metadata / doc smoke test，不模拟真实 skill routing、偏差回流或 recovery 执行。README 应改成“验证运行时控制面的静态完整性”。

### P2：registry array 字段校验不够严

validator 只校验字段是 array，没有校验元素都是 string。后续 registry 可能混入对象、数字或 null，导致控制面漂移。

## 2. 修复原则

1. 不回到泛泛 `upstream/downstream`。
2. 不把 feedback edge 伪装成 stage edge。
3. 不要求图全局互逆；只有声明为双向关系的边才需要互逆。
4. 不改变 plugin discovery：`skills/forge-*` flat list 保持不变。
5. `registry.yaml` 继续保持 JSON-compatible YAML，暂不引入 YAML parser。

## 3. 目标结构

删除 `upstream` / `downstream`，改用 typed edges。默认阶段流只保留一个源字段：`stage_next`。前置关系由工具或阅读者从 `stage_next` 反向推导，不在 registry 中同时维护 `stage_after`，避免双源冲突。

```json
{
  "name": "forge-codegen",
  "stage_next": ["forge-review", "forge-test", "forge-deploy"],
  "feedback_to": ["forge-detail"],
  "quality_gates": ["forge-review", "forge-fe-accept"],
  "signal_routes": [
    {
      "signal": "L1 deviation",
      "to": "forge-detail",
      "when": "same-class L1 >= 2"
    },
    {
      "signal": "L2 drift",
      "to": "human decision",
      "when": "setpoint contradiction"
    }
  ],
  "external_downstream": []
}
```

字段含义：

| 字段 | 含义 | 是否必须指向 skill |
|------|------|--------------------|
| `stage_next` | 默认阶段流中的后续 skill；只表示正常 workflow，不表示反馈 | 是 |
| `feedback_to` | 偏差、漂移或失败时回流的 skill | 是 |
| `quality_gates` | 当前产物需要经过的审查 / 验收 skill | 是 |
| `signal_routes` | 具体信号的路由规则 | `to` 可为 skill 或外部决策点 |
| `external_downstream` | 非 skill 的外部落点 | 否 |

允许的外部目标固定为：

- `human decision`
- `runtime release execution`
- `skill maintenance`

`signal_routes.to` 如果不是 22 个 `forge-*` skill，必须属于上述白名单。

### 字段淘汰策略

`upstream` / `downstream` 不保留兼容层，直接从 `registry.yaml` 删除。

执行规则：

1. typed edges 是唯一事实源：`stage_next`、`feedback_to`、`quality_gates`、`signal_routes`。
2. validator 不再接受 `upstream` / `downstream` 作为必需字段。
3. 如未来确实需要前置关系，只能由 `stage_next` 推导生成，不得手写第二套图。

## 4. 分阶段执行

### Phase 1：文档口径修正

修改：

- `README.md`
- `docs/runtime-control-loop.md`
- `docs/skill-architecture-audit.md`

动作：

- README 把行为测试描述改成“静态控制面完整性测试”。
- runtime-control 文档说明 registry 使用 typed edges。
- audit 文件把“upstream/downstream 互逆”改成“typed edges 引用完整”。
- 删除 `docs/runtime-control-loop.md` 中“`upstream` / `downstream` 只引用 `forge-*` skill”的维护约束，改成 typed edges 约束。
- 删除 `docs/skill-architecture-audit.md` 中“`upstream` / `downstream` 只引用 skill 且保持互逆”的测试覆盖表述。

验收：

- 不再出现“行为测试证明 runtime 真实执行闭环”的表述。
- 不再把 `upstream/downstream` 描述为主要控制图。
- `docs/runtime-control-loop.md` 明确 `stage_next` / `feedback_to` / `quality_gates` / `signal_routes` 是控制图事实源。
- `docs/skill-architecture-audit.md` 明确 tests 校验 typed edge 引用完整，而不是 legacy edge 互逆。

### Phase 2：registry 结构迁移

修改：

- `registry.yaml`

动作：

- 为 22 个 skill 补 `stage_next`、`feedback_to`、`quality_gates`、`signal_routes`。
- 删除 `upstream/downstream`，不保留兼容字段。
- `forge-deploy`、`forge-learn` 的外部落点继续放 `external_downstream`。

重点映射：

| 链路 | 类型 |
|------|------|
| `define -> design -> detail -> plan -> codegen` | `stage_next` |
| `codegen -> review/test/deploy` | `stage_next` / `quality_gates` |
| `codegen L1/L2 -> detail/human` | `signal_routes` / `feedback_to` |
| `review drift -> detail` | `signal_routes` / `feedback_to` |
| `review attribution -> learn` | `signal_routes` |
| `deploy release -> runtime release execution` | `external_downstream` |

验收：

- `stage_next/feedback_to/quality_gates` 只引用 22 个 `forge-*` skill。
- `signal_routes.to` 可以引用 skill，也可以引用明确允许的外部目标。
- `signal_routes.to` 的外部目标只允许 `human decision`、`runtime release execution`、`skill maintenance`。
- 无需强制所有 typed edge 互逆；只有 `stage_next` 的反向关系可被推导，不需要双写。

### Phase 3：validator 升级

修改：

- `scripts/validate.mjs`

动作：

- 新增 `arrayOfStrings()` 检查，覆盖所有数组字段。
- 校验 typed edge 字段存在且为 string array。
- 校验 typed edge 的 skill 引用都存在。
- 校验 `signal_routes` 是对象数组，每项包含 `signal`、`to`、`when`。
- 校验 `signal_routes.to`：若不是 skill，必须属于 allowed external targets。
- 移除 `upstream/downstream` 的强互逆校验和必填校验。
- 保留关键控制链断言：
  - `codegen L1 -> detail`
  - `review attribution -> learn`
  - `deploy 无回滚 -> block`

验收：

- registry 中数组混入非 string 时 validate 失败。
- typed edge 指向不存在 skill 时 validate 失败。
- `signal_routes.to` 指向未登记外部目标时 validate 失败。
- feedback edge 不要求反向 edge。

### Phase 4：测试升级

修改：

- `tests/runtime-control.test.mjs`

动作：

- 测试 registry 覆盖 22 个 skill。
- 测试 typed edge 引用完整。
- 测试 signal route 覆盖快 / 中 / 慢回路。
- 测试 signal route 外部目标白名单。
- 测试 recovery blocker 存在。
- 测试文档口径不声称每个 skill 都必须完整 MAPE-K。

不做：

- 不模拟真实 skill 执行。
- 不伪造 runtime routing fixture。

验收：

- `node --test` 通过。
- 测试名称明确是 registry/static control surface，不暗示端到端 runtime 已执行。

## 5. 推荐改动顺序

1. 先改文档措辞，降低测试能力声明。
2. 再迁移 `registry.yaml` typed edges。
3. 再改 validator，先让新 registry 过。
4. 再改 tests，覆盖 typed edges。
5. 最后跑验证并复查 graph 语义。

## 6. 验证命令

```bash
node scripts/validate.mjs
node --test
git diff --check
git status --short --branch
```

## 7. 完成标准

- `registry.yaml` 不再依赖全局互逆 `upstream/downstream` 表达控制图。
- `stage_next` 是默认阶段流唯一事实源；前置关系不双写。
- 正常阶段流、反馈回路、质量门、外部目标在字段层明确区分。
- 外部目标由白名单约束。
- validator 能阻止 registry 引用不存在的 skill 和非 string array 元素。
- tests 只声称静态控制面覆盖，不夸大为真实 runtime execution 覆盖。
- `node scripts/validate.mjs` 和 `node --test` 均通过。
