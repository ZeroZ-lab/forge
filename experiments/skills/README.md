# Experimental Skills

New Forge skills start here when their trigger value, workflow, or cross-platform behavior is not yet proven.

An experimental skill must not appear in either plugin manifest. It may graduate to `plugins/forge/skills/` only when:

- its role and boundary are distinct from existing skills;
- its description has positive and negative routing fixtures;
- it has representative runtime benchmark evidence;
- its `SKILL.md` and references stay inside token budgets;
- Claude Code and Codex metadata behavior is either verified or explicitly platform-scoped;
- a Change Unit records the graduation decision.

Abandoned experiments move to `archive/skills/` with the rejection reason.

