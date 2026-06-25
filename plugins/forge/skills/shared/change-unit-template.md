# change-unit-template.md — Change Unit

> 每次 feature、bugfix、refactor、release 或 methodology update 使用一个 Change Unit。CU 是变更历史、风险和**验证证据**的唯一事实源——证据指命令 + 真实输出，不是「测试通过」这类结论（见 `${CLAUDE_SKILL_DIR}/../shared/concepts/evidence-policy.md`）。

---

# CU-{YYYYMMDD}-{slug}

## Type

- Feature / Bugfix / Refactor / Performance / Security / Documentation / Methodology / Release

## Intent

- Trigger:
- Goal:
- Out of scope:

## Behavior Change

- User-visible behavior:
- Internal behavior:
- Contract change:
- Data change:

## Affected Surface

- Features:
- Modules:
- Contracts:
- Code implementation:
- Tests:
- Operations:

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Pending | Pending | Pending |

## Verification

> 证据形态见 `${CLAUDE_SKILL_DIR}/../shared/concepts/evidence-policy.md`。证据 = 命令 + 真实输出,不是结论字符串。

- Commands (with exit codes): `<cmd>` → exit 0 / `<output excerpt>`
- Red-capable evidence (bugfix only): before=`<cmd + failure output>`, after=`<cmd + pass output>`
- Not verified (with blocking reason): `<为什么无法执行>`

## Rollback

- Revert path:
- Data rollback:
- Safe stop condition:

## Docs To Sync

- [ ] feature goal.md
- [ ] project.md / ADR
- [ ] modules
- [ ] testing docs
- [ ] deploy docs

## Completion Evidence

- Code diff:
- Test evidence (command + output, not conclusion):
- Doc sync result:
- Residual risk:
