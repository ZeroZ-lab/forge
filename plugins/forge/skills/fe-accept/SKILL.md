---
name: fe-accept
description: Reviews frontend implementation quality across behavior, visual fidelity, responsiveness, accessibility, and performance evidence. Use for lightweight page checks or full frontend acceptance review.
when_to_use: Use when the user asks to accept frontend work, inspect a page, compare implementation with design, check visual quality, responsive behavior, accessibility, performance, or frontend release readiness.
---

# Fe Accept — 前端质量验收

## 职责

对已生成或已修改的前端实现做验收，判断它是否满足 `DESIGN.md`、interaction-spec 和 frontend modules 的设计目标。

这是 QA + 设计验收 skill，不负责重新设计，不把主观审美当成唯一标准。

## 执行纪律

- **D5**：不重新设计，不把主观审美当成唯一标准
- **D7**：前端可运行时必须启动预览做真实验证，不凭截图通过
- **D8**：同类问题反复出现 → 归因到上游 skill（设计系统缺失 or 合约歧义）

## 上下游边界

**上游**：`DESIGN.md`、interaction-spec、goal.md（前端决策）、modules/*.md、实际前端代码和测试。

**下游**：验收报告、缺陷清单、豁免记录，交给 codegen 修复或 review 审查。

## 何时不使用
- 无前端实现（没有代码可验收）
- 无 DESIGN.md（没有设计标准可对照）
- 前端不可运行且用户只提供截图 → 可以做有限验收，标注"非真实验证"

## 核心方法论

四维验收：

1. **功能正确**：用户路径、状态、错误、权限、数据流。
2. **视觉一致**：token、布局、组件、状态、品牌气质。
3. **适应性**：响应式、键盘、屏幕阅读器、长文本、慢网。
4. **性能边界**：首屏、交互响应、列表规模、动画和资源。

详细维度和报告模板见 `references/fe-accept-protocol.md`。

**最小执行规则**（不读 protocol 文件时仍需遵守）：
- 四维都必须检查（功能/视觉/适应性/性能），不能只查功能
- 每个问题必须有证据（截图/日志/复现步骤）+ 影响 + 修复建议
- P0/P1 是阻塞问题，不是建议

## 验收流程

1. **准备**：读取设计、交互、模块、API 和待验收代码。
2. **确定范围**：列出页面、组件、状态和视口。
3. **运行验证**：执行可用测试、启动预览、截图或浏览器检查。
4. **逐项比对**：按四维验收，记录证据和失败条件。
5. **报告结论**：通过、阻塞、可豁免、需返工。
6. **循环修复**：P0/P1 必须修复后重新验收。

## 必查项

- 主流程是否可完成。
- loading、empty、error、disabled、success 是否完整。
- 表单校验和服务端错误是否可读。
- 权限和租户隔离是否只展示允许操作。
- token 是否来自 `DESIGN.md`。
- 桌面和移动端是否无重叠、无横向溢出。
- 键盘焦点顺序是否合理。
- 大列表或高频交互是否有性能边界。

## 入口/出口条件

**入口**：已有前端实现或可预览 artifact；有可对照的设计系统和模块文档。

**出口**：验收报告已生成，P0/P1 问题明确，豁免项有理由和责任人。

## 运行时信号

- 输入：frontend artifact ready
- 输出：P0/P1/P2 frontend issues、acceptance status
- 路由：详见本文件 frontmatter.signal_routes
- 升级：无法运行或预览却要求通过 · P0/P1 未修复

## 红旗清单
- 只看截图不操作真实路径 → 强制启动预览做真实验证
- 只检查桌面不检查移动端 → 强制补充移动端验证
- 只检查 happy path 不检查失败状态 → 强制补充 loading/error/empty/disabled
- 视觉和 DESIGN.md 不一致却未记录 → 强制记录差异 + 标注是否需要修正
- 无法运行或无法预览却宣称通过 → 禁止通过，标注"未验证"
- 把 P0/P1 写成建议而不是阻塞问题 → 纠正（P0/P1 必须修复后才能发布）

## 验证清单

- [ ] 是否读取了所有上游设计和模块文档？
- [ ] 是否执行了真实预览或测试？
- [ ] 是否覆盖功能、视觉、适应性、性能四维？
- [ ] 是否列出证据、影响和修复建议？
- [ ] 是否区分阻塞、建议和豁免？

## 历史维护

完成后追加 feature `changelog.md`；若验收导致发布状态变化，也追加 `docs/timeline.md`。

## 完成提示

```
前端验收完成：报告已生成，阻塞项和豁免项已列出。

下一步：
  - 修复阻塞项
  - 做独立审查
  - 规划发布
```


