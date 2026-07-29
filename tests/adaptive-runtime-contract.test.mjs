import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const parse = (relativePath) => JSON.parse(read(relativePath));

test('Kernel owns constraints and outcomes without prescribing the action path', () => {
  const runtime = read('plugins/forge/skills/shared/concepts/adaptive-runtime.md');

  for (const responsibility of ['Objective', 'Authority', 'Scope', 'State', 'Evidence', 'Outcome']) {
    assert.match(runtime, new RegExp(`\\*\\*${responsibility}\\*\\*`));
  }
  for (const forbiddenProxy of [
    'fixed Skill chain',
    'Skill activation count or order',
    'implementation strategy or internal reasoning',
    'model capability from a model name',
    'self-report, stage completion, or action path',
  ]) {
    assert.ok(runtime.includes(forbiddenProxy), `missing Kernel non-interference rule: ${forbiddenProxy}`);
  }
  assert.match(runtime, /any, multiple, or zero Skills/);
  assert.match(runtime, /Skipping a Skill is legal/);
  assert.match(runtime, /not the production default/);
});

test('always-on project instructions allow direct action and establish one Chain Owner', () => {
  for (const file of ['AGENTS.md', 'plugins/forge/skills/init/references/agents-template.md']) {
    const content = read(file);
    assert.match(content, /Kernel/);
    assert.match(content, /直接行动/);
    assert.match(content, /任意、多个或零个 Skill/);
    assert.match(content, /Chain Owner/);
    assert.match(content, /唯一 Change Unit/);
    assert.match(content, /L0\/L1.*self-check/s);
    assert.match(content, /L2\/L3 或 P0\/P1.*独立 reviewer\/verifier/s);
    assert.match(content, /partial\/正确阻塞/);
  }
});

test('Chain Owner keeps one global state and child Skills return only local evidence', () => {
  const runtime = read('plugins/forge/skills/shared/concepts/adaptive-runtime.md');
  const history = read('plugins/forge/skills/shared/concepts/history-maintenance.md');

  assert.match(runtime, /single Chain Owner/);
  assert.match(runtime, /single consolidated Change Unit/);
  assert.match(runtime, /A child does not own global completion/);
  assert.match(history, /direct/);
  assert.match(history, /standalone/);
  assert.match(history, /child/);
  assert.match(history, /Chain Owner/);
});

test('verification and independent review are separate risk-scaled evidence', () => {
  for (const file of [
    'plugins/forge/skills/shared/concepts/adaptive-runtime.md',
    'plugins/forge/skills/review/SKILL.md',
  ]) {
    const content = read(file);
    assert.match(content, /L0\/L1/);
    assert.match(content, /L2\/L3|P0\/P1/);
    assert.match(content, /independent|独立/);
    assert.match(content, /self-check/);
  }
  for (const file of [
    'plugins/forge/skills/shared/concepts/delegation-matrix.md',
    'plugins/forge/skills/shared/concepts/evidence-policy.md',
  ]) {
    const content = read(file);
    assert.match(content, /L2\/L3|P0\/P1/);
    assert.match(content, /independent|独立/);
    assert.match(content, /self-check/);
  }
  assert.match(read('plugins/forge/skills/review/SKILL.md'), /不能称为独立 review/);
  const runtime = read('plugins/forge/skills/shared/concepts/adaptive-runtime.md');
  assert.match(runtime, /did not implement the change/);
  assert.match(runtime, /separate context\/actor/);
  assert.match(runtime, /predeclared or host-private check/);
  assert.match(runtime, /ordinary local tests is verification only/);
  assert.match(runtime, /same-context reread.*forbidden/s);
});

test('core capabilities have use, skip, and no-successor boundaries', () => {
  for (const skillName of ['detail', 'codegen', 'review']) {
    const content = read(`plugins/forge/skills/${skillName}/SKILL.md`);
    assert.match(content, /shared\/concepts\/adaptive-runtime\.md/);
    assert.match(content, /## Use \/ skip \/ no-op/);
    assert.match(content, /Skip|跳过|不使用/);
    assert.match(content, /No-op|no-op|空操作/);
    assert.match(content, /不自动|不要求后继|不触发后继/);
  }

  const guide = read('plugins/forge/skills/guide/SKILL.md');
  assert.match(guide, /direct action/);
  assert.match(guide, /零 Skill 合法/);
  assert.match(guide, /legacy-chain/);
  assert.match(guide, /只推荐不执行/);
});

test('implicit discovery metadata requires deliberate value instead of generic task matching', () => {
  const skillRoot = path.join(root, 'plugins/forge/skills');
  const skillNames = fs
    .readdirSync(skillRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'shared')
    .map((entry) => entry.name);
  const overlyBroad = [];
  const missingActivationGate = [];

  for (const skillName of skillNames) {
    const content = read(`plugins/forge/skills/${skillName}/SKILL.md`);
    if (/^disable-model-invocation:\s*true$/m.test(content)) continue;
    const description = content.match(/^description:\s*(.+)$/m)?.[1] ?? '';
    const whenToUse = content.match(/^when_to_use:\s*(.+)$/m)?.[1] ?? '';
    const metadata = `${description} ${whenToUse}`;

    if (
      /Use after\b|Use when (?:starting|creating|preparing|choosing|designing)\b|Use when work spans\b|Use when acceptance criteria need\b/i.test(whenToUse)
    ) {
      overlyBroad.push(skillName);
    }
    if (
      !/(?:explicit|asks?|unclear|unresolved|uncertain|uncertainty|vague|risk|conflict|gap|trade-off|red-capable|documented|user describes|明确|显式)/i.test(metadata)
    ) {
      missingActivationGate.push(skillName);
    }
  }

  assert.deepEqual(overlyBroad, [], `generic implicit triggers: ${overlyBroad.join(', ')}`);
  assert.deepEqual(
    missingActivationGate,
    [],
    `implicit metadata lacks an explicit request, uncertainty, or risk gate: ${missingActivationGate.join(', ')}`,
  );
});

test('plugin entry metadata presents adaptive runtime and the host boundary', () => {
  for (const file of [
    'plugins/forge/.claude-plugin/plugin.json',
    'plugins/forge/.codex-plugin/plugin.json',
  ]) {
    const manifest = parse(file);
    const text = JSON.stringify(manifest);
    assert.match(text, /adaptive|自适应|Kernel-first/i);
    assert.match(text, /direct|直接/i);
    assert.match(text, /best-effort|始终加载/i);
    assert.doesNotMatch(text, /默认主链|default runtime chain/i);
  }
});

test('production docs distinguish adaptive runtime from the explicit legacy harness', () => {
  const productionDocs = [
    'README.md',
    'docs/advanced.md',
    'docs/skill-invocation-policy.md',
    'docs/usage-scenarios.md',
    'references/usage-examples.md',
  ];
  for (const file of productionDocs) {
    const content = read(file);
    assert.match(content, /Kernel|adaptive|自适应/i);
    assert.match(content, /direct|直接/i);
    assert.match(content, /legacy|兼容/i);
  }

  const suiteManifest = parse('evals/skills-suite/manifest.json');
  assert.match(suiteManifest.description, /legacy capability compliance/i);
  assert.ok(suiteManifest.cases.some((entry) => entry.id === 'legacy-chain-small-feature'));
  assert.ok(!suiteManifest.cases.some((entry) => entry.id === 'default-chain-small-feature'));

  const legacyCase = suiteManifest.cases.find((entry) => entry.id === 'legacy-chain-small-feature');
  assert.deepEqual(legacyCase.expected_skills, ['detail', 'codegen', 'review']);
  assert.match(read(legacyCase.fixture), /legacy compatibility preset/i);
});
