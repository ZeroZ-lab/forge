# Module Depth — 模块深度词汇与 grilling agenda

> improve skill 的架构词汇表。术语来自 Ousterhout《A Philosophy of Software Design》的深/浅模块理念，映射到 Forge 原生概念。用这些词，不要漂移成 component/service/boundary。

## 词汇

| 术语 | 定义 | Forge 原生对应 |
|------|------|----------------|
| module | 一段有明确接口与实现的代码单元；接口是它的成本，实现是它的价值 | `shared/module-template.md` 的「模块」 |
| interface | 调用方必须知道的东西（参数、约束、副作用） | `module-template.md` 的「公共接口」 |
| implementation | 接口背后的真实逻辑 | 模块内部代码 |
| depth | 接口复杂度与实现复杂度的差；差越大越深 | Forge 新引入 |
| deep | 接口小、实现大；用很少的信息调用很多逻辑 | Forge 新引入 |
| shallow | 接口几乎和实现一样复杂；模块没替调用方省事 | Forge 新引入 |
| seam | 可替换的接缝；同一 interface 背后可换实现 | `codegen/references/bugfix-protocol.md` 的 test seam |
| adapter | 把一个 interface 桥到某实现的单点 | Forge「运行时 adapter」概念 |
| leverage | 一处改动影响 N 个调用点；接口是杠杆的支点 | Forge 新引入 |
| locality | 相关逻辑集中在同一模块，bug 集中在一处 | Forge 新引入 |

## 判定

**deletion test**：怀疑一个模块浅时，问——删掉它会让复杂度**集中**（剩下的一个模块吸收它的工作，接口反而更窄）还是只是**搬移**（复杂度平移到别处）？「集中」是加深信号，「搬移」不是。

**原则**：

- interface is the test surface——测试应打接口，不打内部；难通过接口测说明接口选错了。
- one adapter = hypothetical seam, two = real——只有一个 adapter 时 seam 是猜的，两个独立 adapter 才证明 seam 有价值。
- deep = 小接口大实现——加深的目标是缩接口、吸实现。

## grilling agenda（交接 `$think` 用）

用户选定候选后，improve 交接 `$think` 走设计树。agenda：

1. **约束**：这个加深受哪些不变量、性能、兼容性约束？
2. **依赖**：加深后的模块依赖谁、被谁依赖？方向是否反转？
3. **模块形状**：加深后的 interface 是什么？实现吸收了哪些原浅模块？
4. **seam 后面**：seam 背后放什么实现？prod 用哪个、test 用哪个？够两个 adapter 了吗？
5. **存活测试**：哪些现有测试仍打得住？哪些要改打新接口？哪些浅模块的纯函数测试可以删？

## Forge 映射注

- 领域词活在 `docs/project.md` 的「领域语言」表（非 `CONTEXT.md`）。新命名的加深模块若用了 project.md 没有的概念，在 think/learn 阶段提议加入该表（AI 提议，人确认）。
- 承重否决理由（用户用硬理由否决某候选）用 `plugins/forge/skills/shared/adr-template.md` 的 `Revisit trigger` 字段承载——只有「未来复查者需要它来避免重复提议」时才提议 ADR，ephemeral/self-evident 理由不记。
- ADR 触发条件遵循 `technical-design`：难逆、反直觉、需独立复核的项目决策才创建 `docs/adr/*.md`。
