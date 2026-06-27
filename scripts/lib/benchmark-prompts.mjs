/**
 * benchmark-prompts.mjs — Prompt builders for the Forge skills-suite benchmark.
 *
 * Extracted from run-skills-benchmark.mjs so prompt construction is unit-testable
 * without spawning the Codex CLI.
 *
 * Blinding contract (eval-integrity): the Forge arm prompt must NOT serialize any
 * per-case oracle answer. It receives only:
 *   - the case id/title (identifiers, not answers),
 *   - the fixture task text (product task + acceptance criteria),
 *   - the report schema (field names/types only — no expected values),
 *   - the PUBLISHED skill registry NAMES (so the agent knows which skills exist,
 *     but not which ones this case expects).
 * The oracle (expected_skills / expected_artifacts / oracle_checks / required_evidence
 * / forbidden_behaviors) is scored by evaluate-skills independently; the agent never
 * sees expected answers.
 *
 * Zero external dependencies. Pure Node.js built-ins via re-exports.
 */

import { sanitizeNoForgeFixture } from './benchmark-helpers.mjs';
import { formatCaseRunContract } from './run-report.mjs';

/**
 * Build the Forge-arm prompt for a benchmark case.
 *
 * @param {object} testCase              manifest case (only id/title are read; the
 *   oracle/expected_* fields are deliberately NOT serialized).
 * @param {string} fixture               raw fixture task text.
 * @param {string[]} [publishedSkillNames] names of all published Forge skills
 *   (registry全集, names only — NOT per-case expected_skills).
 * @returns {string} the blinded Forge prompt.
 */
export function forgePromptForCase(testCase, fixture, publishedSkillNames = []) {
  const skillNames = Array.isArray(publishedSkillNames)
    ? publishedSkillNames.filter((name) => typeof name === 'string' && name.length > 0)
    : [];
  const skillList = skillNames.length > 0 ? skillNames.join(', ') : '(none published)';
  return `你正在运行 Forge skills-suite benchmark。必须真实使用已安装的 Forge skills，而不是只做静态判断。

工作边界：
- 只在当前临时工作目录内创建或修改文件。
- 不要编辑 Forge 仓库本身。
- 可以创建这个 fixture 需要的 docs/src/tests 文件。
- 能运行验证命令时必须运行；不能运行时在 evidence 说明原因。
- 执行过程中必须发出至少一条非 JSON progress evidence line，简要写明你按 skill 得出的关键路由/决策/验证信号；不要输出结构化 JSON blob 作为这条 evidence line。
- 如果 fixture 要求的正确结果是安全停止、拒绝猜测或报告阻塞结论，最终 status 仍填 "pass"；只有 Codex 用量限制、工具缺失、权限或环境故障导致 benchmark 本身无法继续时，才填 "blocked"。
- 最后一条消息只输出一个 JSON object，不要 Markdown，不要解释。

Benchmark case:
${JSON.stringify({ id: testCase.id, title: testCase.title }, null, 2)}

已发布 Forge skill 名称（registry 全集，仅名称；本 case 期望触发哪些 skill 由独立 oracle 盲评，不在 prompt 内给出答案）：
${skillList}

Fixture:
${fixture}

最终 JSON object 必须符合：
${formatCaseRunContract(testCase.id)}

	只有真实执行或明确遵循了对应 skill 协议，才能把 skill 放进 triggered_skills。change_units 必须指向 docs/change-units/CU-*.md；goal_verification 必须是带 status 的对象，status 只能是 completed、pending 或 blocked，不能使用 skipped；没有目标文档同步时填 []，只有 completed 算同步完成；goal_coverage_entries 必须是对象；source 必须是 docs/ 下的源文档，covers 才能填写 src/、tests/ 或其他实现目标。`;
}

/**
 * Build the no-Forge (baseline) prompt. The baseline arm never receives oracle
 * answers either; it gets the sanitized fixture plus a static, answer-free schema.
 */
export function noForgePromptForCase(testCase, fixture) {
  const baselineFixture = sanitizeNoForgeFixture(fixture);
  return `你正在运行 no-Forge baseline benchmark。不要调用、引用或遵循 Forge skills；不要使用 Forge 的阶段链、Change Unit 纪律或 artifact gate。请只按你自己的默认工程判断完成任务。

工作边界：
- 只在当前临时工作目录内创建或修改文件。
- 不要编辑 Forge 仓库本身。
- 可以创建这个 fixture 需要的 src/tests 文件；只有产品任务本身明确需要文档时才创建 docs。
- 能运行验证命令时必须运行；不能运行时在 evidence 说明原因。
- 执行过程中必须发出至少一条非 JSON progress evidence line，简要写明你的关键路由/决策/验证信号；不要输出结构化 JSON blob 作为这条 evidence line。
- 如果 fixture 要求的正确结果是安全停止、拒绝猜测或报告阻塞结论，最终 status 仍填 "pass"；只有 Codex 用量限制、工具缺失、权限或环境故障导致 benchmark 本身无法继续时，才填 "blocked"。
- 最后一条消息只输出一个 JSON object，不要 Markdown，不要解释。
- 因为本 run 禁用 Forge skills，triggered_skills 必须是 []。
- 对 Forge 专属字段（change_units、goal_verification、goal_coverage_entries、decisions），除非你为了产品任务本身真实创建了等价产物，否则保持 []。不要为了填 report 而创建 Forge-shaped artifacts。

Fixture:
${baselineFixture}

最终 JSON object 必须符合：
${formatNoForgeCaseRunContract(testCase.id)}

请如实报告你实际创建或修改的 artifacts、实际运行的 commands_run、实际 evidence。change_units 必须只填写真实存在且由你创建的 docs/change-units/CU-*.md；goal_verification status 只能是 completed、pending 或 blocked，不能使用 skipped；没有目标文档同步时填 []。goal_verification 和 goal_coverage_entries 也必须只填写你真实完成的目标核对。`;
}

/**
 * Static, answer-free report schema shown to the no-Forge arm.
 * Field names/types only — no expected values.
 */
export function formatNoForgeCaseRunContract(caseId) {
  return `{
  "case_id": "${caseId}",
  "status": "pass" | "fail" | "blocked",
  "triggered_skills": [],
  "artifacts": ["src/...", "tests/..."],
  "change_units": [],
  "goal_verification": [],
  "goal_coverage_entries": [],
  "commands_run": ["exact command"],
  "decisions": [],
  "forbidden_behaviors": [],
  "evidence": ["short evidence strings"],
  "notes": "short note"
}`;
}

/**
 * Dispatch to the correct prompt builder for the given mode.
 * @param {object} testCase
 * @param {string} fixture
 * @param {'forge'|'no-forge'} mode
 * @param {string[]} [publishedSkillNames] required for the forge arm (blinded registry).
 */
export function promptForCase(testCase, fixture, mode, publishedSkillNames = []) {
  return mode === 'no-forge'
    ? noForgePromptForCase(testCase, fixture)
    : forgePromptForCase(testCase, fixture, publishedSkillNames);
}
