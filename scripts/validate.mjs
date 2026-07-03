#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { loadBenchmarkContract } from './lib/benchmark-contract.mjs';
import { loadEffectivenessContract } from './lib/effectiveness-contract.mjs';
import { loadRegistry } from './lib/registry.mjs';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function filesUnder(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return [];

  return fs.readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const childPath = path.join(relativePath, entry.name);
    if (entry.isDirectory()) return filesUnder(childPath);
    if (entry.isFile()) return [childPath];
    return [];
  });
}

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function json(relativePath) {
  try {
    return JSON.parse(read(relativePath));
  } catch (error) {
    fail(`${relativePath}: invalid JSON-compatible YAML (${error.message})`);
    return {};
  }
}

function lineCount(text) {
  return text.replace(/\r?\n$/, '').split(/\r?\n/).length;
}

function indexOfOrFail(text, needle, file) {
  const index = text.indexOf(needle);
  if (index === -1) fail(`${file}: missing "${needle}"`);
  return index;
}

function assertIncludes(relativePath, markers) {
  const content = read(relativePath);
  for (const marker of markers) {
    assert(content.includes(marker), `${relativePath}: missing "${marker}"`);
  }
}

function referencedMarkdownFiles(skillName, content) {
  const matches = content.matchAll(/(?:^|[\s`(])((?:forge-[\w-]+\/)?references\/[\w.-]+\.md)\b/gm);
  return [...matches].map((match) => {
    const referencePath = match[1];
    if (referencePath.startsWith('forge-')) return `plugins/forge/skills/${referencePath}`;
    return `plugins/forge/skills/${skillName}/${referencePath}`;
  });
}

const packageJson = json('package.json');
const claudePlugin = json('plugins/forge/.claude-plugin/plugin.json');
const codexPlugin = json('plugins/forge/.codex-plugin/plugin.json');
const rootMarketplace = json('.claude-plugin/marketplace.json');
const claudeMarketplace = json('plugins/forge/.claude-plugin/marketplace.json');
const codexMarketplace = json('.agents/plugins/marketplace.json');
const runtimeRegistry = loadRegistry(root);

assert(
  packageJson.version === claudePlugin.version &&
    packageJson.version === codexPlugin.version,
  `version mismatch: package=${packageJson.version}, claude=${claudePlugin.version}, codex=${codexPlugin.version}`,
);

// Marketplaces carry `plugins[].version` so update-aware clients (e.g. zcode)
// can detect new releases. Every forge entry must match the release version.
const marketplaceFiles = [
  ['.claude-plugin/marketplace.json', rootMarketplace],
  ['plugins/forge/.claude-plugin/marketplace.json', claudeMarketplace],
  ['.agents/plugins/marketplace.json', codexMarketplace],
];
for (const [file, marketplace] of marketplaceFiles) {
  const entry = marketplace.plugins?.find((plugin) => plugin.name === 'forge');
  assert(entry, `${file}: no forge entry in plugins[]`);
  assert(
    entry.version === packageJson.version,
    `${file}: forge version ${entry.version ?? '<missing>'} must match package.json ${packageJson.version}`,
  );
}

assert(packageJson.scripts?.validate === 'node scripts/validate.mjs', 'package.json: missing scripts.validate');
assert(packageJson.scripts?.test === "node --test 'tests/*.test.mjs'", 'package.json: missing scripts.test');
assert(packageJson.scripts?.['eval:skills'] === 'node scripts/evaluate-skills.mjs', 'package.json: missing scripts.eval:skills');
assert(packageJson.scripts?.['eval:effectiveness'] === 'node scripts/validate-effectiveness-suite.mjs', 'package.json: missing scripts.eval:effectiveness');
assert(packageJson.scripts?.['eval:skills:run'] === 'node scripts/run-skills-benchmark.mjs', 'package.json: missing scripts.eval:skills:run');
assert(packageJson.scripts?.['metrics:chars'] === 'node scripts/measure-char-footprint.mjs', 'package.json: missing scripts.metrics:chars');
assert(packageJson.scripts?.['plugin:install:local'] === 'node scripts/install-local-codex-plugin.mjs', 'package.json: missing scripts.plugin:install:local');
assert(codexPlugin.skills === './skills', 'plugins/forge/.codex-plugin/plugin.json: skills must point to ./skills');
assert(exists('plugins/forge/skills'), 'plugins/forge/skills: missing');
assert(exists('scripts/evaluate-skills/index.mjs'), 'scripts/evaluate-skills/index.mjs: missing');
assert(
  codexMarketplace.plugins?.find((plugin) => plugin.name === 'forge')?.source?.path === './plugins/forge',
  '.agents/plugins/marketplace.json: forge source.path must point to ./plugins/forge',
);
const skillsDir = path.join(root, 'plugins/forge/skills');
const skillDirs = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'shared')
  .map((entry) => entry.name)
  .sort();
const skillCount = skillDirs.length;
const guideCount = skillDirs.includes('guide') ? 1 : 0;
const derivedViewSkills = ['architecture-view'];
const derivedViewCount = derivedViewSkills.filter((skillName) => skillDirs.includes(skillName)).length;
const protocolSkillCount = skillCount - guideCount - derivedViewCount;
const skillLineLimit = 350;

assert(skillDirs.length > 0, 'expected at least one skill');

const expectedSkillPaths = skillDirs.map((skillName) => `./skills/${skillName}`).sort();
const manifestSkillPaths = Array.isArray(claudePlugin.skills) ? [...claudePlugin.skills].sort() : [];
const expectedRegistryNames = skillDirs.map((skillName) => skillName).sort();

assert(Array.isArray(claudePlugin.skills), 'plugins/forge/.claude-plugin/plugin.json: skills must explicitly enumerate installed skills');
assert(
  JSON.stringify(manifestSkillPaths) === JSON.stringify(expectedSkillPaths),
  'plugins/forge/.claude-plugin/plugin.json: skills list must match skills/* exactly',
);

assert(Array.isArray(runtimeRegistry.skills), 'SKILL.md frontmatter: skills must be an array');

const registryNames = Array.isArray(runtimeRegistry.skills)
  ? runtimeRegistry.skills.map((skill) => skill.name).sort()
  : [];
assert(
  JSON.stringify(registryNames) === JSON.stringify(expectedRegistryNames),
  'SKILL.md frontmatter: skill names must cover plugins/forge/skills/* exactly',
);

for (const skillName of skillDirs) {
  const skillPath = `plugins/forge/skills/${skillName}/SKILL.md`;
  assert(exists(skillPath), `${skillPath}: missing`);
  if (!exists(skillPath)) continue;

  const content = read(skillPath);
  const declaredName = content.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = content.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  const shortName = skillName;
  assert(
    declaredName === shortName,
    `${skillPath}: frontmatter name "${declaredName}" must match directory name "${shortName}"`,
  );
  assert(Boolean(description), `${skillPath}: frontmatter description is required`);
  assert(lineCount(content) <= skillLineLimit, `${skillPath}: exceeds ${skillLineLimit} lines`);

  for (const referencePath of referencedMarkdownFiles(skillName, content)) {
    assert(exists(referencePath), `${skillPath}: referenced file is missing: ${referencePath}`);
  }
}

assertIncludes('plugins/forge/skills/guide/SKILL.md', [
  'disable-model-invocation: true',
  '只推荐，不调用其他 skill',
]);
assertIncludes('plugins/forge/skills/guide/agents/openai.yaml', [
  'allow_implicit_invocation: false',
]);
assertIncludes('plugins/forge/skills/shared/SKILL.md', [
  'disable-model-invocation: true',
  '不进入 registry',
]);
assertIncludes('plugins/forge/skills/shared/agents/openai.yaml', [
  'allow_implicit_invocation: false',
]);
assert(exists('docs/skill-invocation-policy.md'), 'docs/skill-invocation-policy.md: missing');
assertIncludes('docs/skill-invocation-policy.md', [
  'disable-model-invocation: true',
  'allow_implicit_invocation: false',
  '保留生命周期 Skill 的隐式触发',
]);

const defaultRuntimeChain = ['detail', 'codegen', 'review'];
const defaultRuntimeChainChars = defaultRuntimeChain.reduce((sum, skillName) => {
  return sum + read(`plugins/forge/skills/${skillName}/SKILL.md`).length;
}, 0);
const totalSkillChars = skillDirs.reduce((sum, skillName) => {
  return sum + read(`plugins/forge/skills/${skillName}/SKILL.md`).length;
}, read('plugins/forge/skills/shared/SKILL.md').length);
assert(
  defaultRuntimeChainChars <= 4500,
  `default runtime chain char budget exceeded: ${defaultRuntimeChainChars} chars > 4500 chars`,
);
assert(
  totalSkillChars <= 56000,
  `total SKILL.md char budget exceeded: ${totalSkillChars} chars > 56000 chars`,
);

assert(exists('docs/skill-architecture-audit.md'), 'docs/skill-architecture-audit.md: missing');
assert(exists('docs/skill-suite-evaluation.md'), 'docs/skill-suite-evaluation.md: missing');
assertIncludes('plugins/forge/skills/shared/rubrics/skill-quality.md', [
  'Completion criterion',
  'No-op control',
  'Single source',
  'Progressive disclosure',
  'Premature-completion resistance',
  'Invocation cost',
]);
assertIncludes('experiments/skills/README.md', [
  'must not appear in either plugin manifest',
  'runtime benchmark evidence',
]);
assertIncludes('archive/skills/README.md', [
  'must not appear in Claude or Codex plugin manifests',
  'experiments/skills/',
]);
assertIncludes('docs/skill-suite-evaluation.md', [
  'Benchmark contract is valid',
  'A run satisfies scenario compliance',
  'compliance/regression harness',
  'evals/skills-suite/manifest.json',
  'evals/skills-suite/report.schema.json',
]);

const sharedKnowledgeFiles = [
  'plugins/forge/skills/shared/concepts/control-loop.md',
  'plugins/forge/skills/shared/concepts/document-as-goal.md',
  'plugins/forge/skills/shared/concepts/execution-discipline.md',
  'plugins/forge/skills/shared/concepts/artifact-policy.md',
  'plugins/forge/skills/shared/concepts/history-maintenance.md',
  'plugins/forge/skills/shared/rubrics/skill-quality.md',
  'plugins/forge/skills/shared/rubrics/goal-quality.md',
  'plugins/forge/skills/shared/rubrics/implementation-quality.md',
  'plugins/forge/skills/shared/red-flags/goal-drift.md',
  'plugins/forge/skills/shared/red-flags/scope-creep.md',
  'plugins/forge/skills/shared/red-flags/unsafe-implementation.md',
  'plugins/forge/skills/shared/change-unit-template.md',
  'plugins/forge/skills/shared/goal-template.md',
];

for (const file of sharedKnowledgeFiles) {
  assert(exists(file), `${file}: missing runtime knowledge file`);
  if (exists(file)) {
    assert(lineCount(read(file)) <= 200, `${file}: exceeds 200 lines`);
  }
}

const historyAwareSkills = [
  'api-design',
  'architecture-view',
  'brainstorm',
  'business-alignment',
  'codegen',
  'db-design',
  'define',
  'deploy',
  'design',
  'detail',
  'fe-accept',
  'fe-system',
  'frontend-design',
  'interaction-design',
  'init',
  'learn',
  'plan',
  'research',
  'review',
  'technical-design',
  'test',
  'test-cases',
  'test-strategy',
  'think',
];
for (const skillName of historyAwareSkills) {
  assert(
    read(`plugins/forge/skills/${skillName}/SKILL.md`).includes('shared/concepts/history-maintenance.md'),
    `plugins/forge/skills/${skillName}/SKILL.md: history persistence must use the shared module`,
  );
}

const artifactAwareSkills = [
  'api-design',
  'architecture-view',
  'brainstorm',
  'business-alignment',
  'codegen',
  'db-design',
  'define',
  'deploy',
  'design',
  'detail',
  'fe-accept',
  'fe-system',
  'frontend-design',
  'init',
  'interaction-design',
  'learn',
  'plan',
  'research',
  'review',
  'technical-design',
  'test',
  'test-cases',
  'test-strategy',
  'think',
];
for (const skillName of artifactAwareSkills) {
  assert(
    read(`plugins/forge/skills/${skillName}/SKILL.md`).includes('shared/concepts/artifact-policy.md'),
    `plugins/forge/skills/${skillName}/SKILL.md: artifact creation must use the shared policy`,
  );
}

assert(exists('scripts/evaluate-skills.mjs'), 'scripts/evaluate-skills.mjs: missing');
assert(exists('scripts/evaluate-skills/index.mjs'), 'scripts/evaluate-skills/index.mjs: missing');
assert(exists('scripts/run-skills-benchmark.mjs'), 'scripts/run-skills-benchmark.mjs: missing');
assert(exists('scripts/lib/benchmark-contract.mjs'), 'scripts/lib/benchmark-contract.mjs: missing');
assert(exists('scripts/lib/run-report.mjs'), 'scripts/lib/run-report.mjs: missing');
assert(exists('scripts/install-local-codex-plugin.mjs'), 'scripts/install-local-codex-plugin.mjs: missing');
assert(exists('evals/skills-suite/README.md'), 'evals/skills-suite/README.md: missing');
assert(exists('evals/skills-suite/report.schema.json'), 'evals/skills-suite/report.schema.json: missing');
try {
  loadBenchmarkContract(root, runtimeRegistry);
} catch (error) {
  for (const issue of error.issues ?? [error.message]) fail(`evals/skills-suite/manifest.json: ${issue}`);
}
try {
  loadEffectivenessContract(root);
} catch (error) {
  for (const issue of error.issues ?? [error.message]) fail(`evals/effectiveness-suite/manifest.json: ${issue}`);
}

const requiredProtocols = {
  'codegen': {
    path: 'plugins/forge/skills/codegen/references/bugfix-protocol.md',
    markers: ['# Bugfix Protocol', '## Phase 1', 'Red-capable', '## Phase 6', '## 输出证据'],
  },
  'fe-system': {
    path: 'plugins/forge/skills/fe-system/references/fe-system-protocol.md',
    markers: ['# Fe System Protocol', '## Token 结构', '### Primitive', '### Semantic', '### Component'],
  },
  'fe-artifact': {
    path: 'plugins/forge/skills/fe-artifact/references/fe-artifact-protocol.md',
    markers: ['# Fe Artifact Protocol', '## 五层翻译详解', '### 1. 意图层', '### 5. 适配层'],
  },
  'fe-accept': {
    path: 'plugins/forge/skills/fe-accept/references/fe-accept-protocol.md',
    markers: ['# Fe Accept Protocol', '## 四维验收', '## 报告格式', '## 执行证据'],
  },
  'review': {
    path: 'plugins/forge/skills/review/references/review-protocol.md',
    markers: ['# Review Protocol', '## 文档审查维度', '## 代码审查维度', '## 偏差归因维度', '## 报告格式'],
  },
};

for (const [skillName, protocol] of Object.entries(requiredProtocols)) {
  const skillPath = `plugins/forge/skills/${skillName}/SKILL.md`;
  const referenceName = protocol.path.replace(`plugins/forge/skills/${skillName}/`, '');
  assert(read(skillPath).includes(referenceName), `${skillPath}: must reference ${referenceName}`);
  assert(exists(protocol.path), `${protocol.path}: missing`);
  if (exists(protocol.path)) assertIncludes(protocol.path, protocol.markers);
}

assertIncludes('plugins/forge/skills/shared/module-template.md', ['## 入口', '## 责任与不变量', '## 公共接口', '## 依赖关系']);
assert(
  lineCount(read('plugins/forge/skills/shared/module-template.md')) <= 200,
  'plugins/forge/skills/shared/module-template.md: exceeds 200 lines',
);
assert(
  lineCount(read('plugins/forge/skills/shared/goal-template.md')) <= 200,
  'plugins/forge/skills/shared/goal-template.md: exceeds 200 lines',
);
assertIncludes('plugins/forge/skills/shared/goal-template.md', [
  '## 目标',
  '## 边界',
  '## 完成标准',
  '## 决策记录',
]);

const marketplaceDescription = claudeMarketplace.plugins?.find((plugin) => plugin.name === 'forge')?.description ?? '';
assert(
  marketplaceDescription.includes(`${skillCount} 个已发布 skill`) &&
    marketplaceDescription.includes(`${protocolSkillCount} 个决策协议`) &&
    marketplaceDescription.includes(`${derivedViewCount} 个派生视图 skill`),
  `plugins/forge/.claude-plugin/marketplace.json: forge description must mention ${skillCount} published skills, ${protocolSkillCount} protocol skills, and ${derivedViewCount} derived-view skills`,
);
assert(
  read('README.md').includes(`8 阶段 × ${protocolSkillCount} 个协议 Skill + ${derivedViewCount} 个派生视图 Skill + ${guideCount} 个 Guide`),
  `README.md: must document ${protocolSkillCount} protocol skills + ${derivedViewCount} derived-view skills + ${guideCount} guide`,
);
assert(
  read('AGENTS.md').includes(`${protocolSkillCount} 个决策协议 + ${derivedViewCount} 个派生视图 skill + ${guideCount} 个显式 guide`),
  `AGENTS.md: must document ${protocolSkillCount} protocol skills + ${derivedViewCount} derived-view skills + ${guideCount} guide`,
);
assertIncludes('AGENTS.md', ['## 执行协议', '最小变更', '不引入未要求的抽象']);
assertIncludes('plugins/forge/skills/init/references/agents-template.md', ['## 执行纪律', '权威文档', '最窄有效验证']);
assertIncludes('plugins/forge/skills/shared/concepts/execution-discipline.md', [
  '# Execution discipline',
  '## Runtime meaning',
  '## Decision boundaries',
  '## Inheritance rule',
]);

const stalePatterns = [
  ['AGENTS.md', /BA1-BA5/],
  ['README.md', /9 个决策 Command|9 个 Command|8 阶段 × 18 个 Skill|18 个 skill|18 个 `forge-\*` skill/],
  ['AGENTS.md', /Phase 1 数据库|Phase 2 API/],
  ['README.md', /Command 链|决策 Command|\/(brainstorm|init|define|design|detail|plan|test|deploy)(?![-\w.])/],
  ['AGENTS.md', /命令系统|Command|\/(brainstorm|init|define|design|detail|plan|test|deploy)(?![-\w.])/],
  ['references/usage-examples.md', /\/(brainstorm|init|define|design|detail|plan|test|deploy)(?![-\w.])/],
  ['AGENTS.md', /demos\/robot-sim|Robot Simulation/],
  ['README.md', /demos\/robot-sim|Robot Simulation/],
  ['README.md', /产出：`plan\.md` \+ `test-cases\.md`|testing\/contract\.md` \+ `test-cases\.md`/],
  ['AGENTS.md', /产出：`plan\.md` \+ `test-cases\.md`|testing\/contract\.md` \+ `test-cases\.md`/],
];

for (const [file, pattern] of stalePatterns) {
  assert(!pattern.test(read(file)), `${file}: stale pattern still present: ${pattern}`);
}

const removedHookFiles = [
  '.codex/hooks.json',
  'hooks/hooks.json',
  'hooks/session-start.sh',
  'hooks/careful.sh',
  'hooks/resolve.sh',
];

for (const file of removedHookFiles) {
  assert(!exists(file), `${file}: hooks were removed; do not reintroduce hook config without a new maintenance plan`);
}

const detailSkillPath = 'plugins/forge/skills/detail/SKILL.md';
const detailSkill = read(detailSkillPath);
const apiPhase = indexOfOrFail(detailSkill, 'Phase 1: API 设计', detailSkillPath);
const dbPhase = indexOfOrFail(detailSkill, 'Phase 2: 数据库设计', detailSkillPath);
assert(apiPhase < dbPhase, `${detailSkillPath}: API phase must precede database phase`);

const orchestratorInternalStepPatterns = [
  ['plugins/forge/skills/design/SKILL.md', /\b(?:I|S)[1-5]\b/],
  ['plugins/forge/skills/detail/SKILL.md', /\b(?:API[1-7]|DB[1-5]|FE[1-5])\b/],
  ['plugins/forge/skills/test/SKILL.md', /\b(?:T|TC)[1-5]\b/],
];
for (const [skillPath, pattern] of orchestratorInternalStepPatterns) {
  assert(
    !pattern.test(read(skillPath)),
    `${skillPath}: orchestrator interface must use child outputs and exit conditions, not internal step ids`,
  );
}

assertIncludes('plugins/forge/skills/plan/SKILL.md', [
  '垂直切片',
  '对话或 issue tracker',
  '不创建 `plan.md`',
]);
assertIncludes('plugins/forge/skills/test-cases/SKILL.md', [
  '场景矩阵',
  '测试代码',
  '不创建 `testing/test-cases.md`',
]);
assertIncludes('plugins/forge/skills/shared/concepts/artifact-policy.md', [
  '## Default durable sources',
  '## Independent-artifact gate',
  '## Non-artifacts by default',
]);

const deploySkillPath = 'plugins/forge/skills/deploy/SKILL.md';
const deploySkill = read(deploySkillPath);
for (const marker of ['### RL1:', '### RL2:', '### RL3:', '### RL4:', '### RL5:']) {
  assert(deploySkill.includes(marker), `${deploySkillPath}: missing ${marker}`);
}

const codegenSkillPath = 'plugins/forge/skills/codegen/SKILL.md';
const codegenSkill = read(codegenSkillPath);
for (const marker of ['读', '生', '验', '修', '运行验证']) {
  assert(codegenSkill.includes(marker), `${codegenSkillPath}: missing goal verification marker "${marker}"`);
}

assert(
  !exists('docs/features/task-management/implementation'),
  'docs/features/task-management/implementation: remove non-runnable example code from the repo',
);

for (const file of filesUnder('docs/features')) {
  if (file.includes('/implementation/src/tests/') && read(file).includes('expect(true).toBe(true)')) {
    fail(`${file}: placeholder implementation test is not allowed`);
  }
}

// Canonical artifact naming: frontmatter and bodies must use the real on-disk
// layout. Detail down-drill is a single layer: feature-level decisions live in
// goal.md (API#/DB#/FE# + shared data models) and per-module contracts live in
// modules/*.md. The legacy domain-summary layer (notes/<domain>.md) was collapsed
// into goal.md + modules/ — see CU-20260609-collapse-notes-into-modules.
// Optional gated names include testing/strategy.md and deploy/plan.md.
const forbiddenArtifactNames = [
  'api/goal.md',
  'database/goal.md',
  'frontend/goal.md',
  'testing/goal.md',
  'deploy/goal.md',
  'api/modules',
  'frontend/modules',
  'notes/api.md',
  'notes/frontend.md',
  'notes/database.md',
];
for (const file of filesUnder('plugins/forge/skills')) {
  if (!file.endsWith('.md')) continue;
  const content = read(file);
  for (const name of forbiddenArtifactNames) {
    if (content.includes(name)) {
      fail(`${file}: legacy artifact name "${name}" — use canonical layout (goal.md for decisions, modules/*.md for module contracts, testing/strategy.md, deploy/plan.md)`);
    }
  }
}

// The live docs/features examples must follow the same canonical layout as the
// skills. Historical references may remain in archives, Change Units, or fixtures,
// but active feature directories should not reintroduce per-domain goal files.
if (exists('docs/features')) {
  const forbiddenFeatureArtifacts = [
    'api/goal.md',
    'database/goal.md',
    'frontend/goal.md',
    'testing/goal.md',
    'deploy/goal.md',
    'api/modules',
    'frontend/modules',
    'changelog.md',
    'plan.md',
    'testing/test-cases.md',
  ];

  for (const feature of fs.readdirSync(path.join(root, 'docs/features'), { withFileTypes: true })) {
    if (!feature.isDirectory()) continue;
    const featureDir = path.join('docs/features', feature.name);
    for (const name of forbiddenFeatureArtifacts) {
      assert(
        !exists(path.join(featureDir, name)),
        `${featureDir}/${name}: legacy docs layout — use goal.md + modules/*.md, testing/strategy.md, deploy/plan.md`,
      );
    }
  }

  for (const file of filesUnder('docs/features')) {
    assert(!/\/trace-[^/]+\.md$/.test(file), `${file}: Trace is superseded by the Change Unit`);
  }
}

// Independent-artifact gate: gated artifacts must not self-attest their own
// admission. The「独立产物门」in AGENTS.md requires an external anchor — a
// different owner, update cycle, or review responsibility. Previously the
// validator only checked naming/structure, so the writing agent could self-
// certify the gate (e.g. deploy/plan.md:「需要独立运维维护周期」). Enforce the
// gate substance mechanically: a gated artifact under docs/features
// (PRD.md, testing/strategy.md, deploy/plan.md, interaction-spec.md,
// research-brief.md) or docs/adr/*.md must carry either an externally
// resolvable `gate_owner:` (issue URL, CODEOWNERS path, or named owner) or an
// explicit `demo: true` / `exempt: demo` exemption for example features.
const gatedFeatureArtifactRe =
  /(?:^|\/)(?:PRD\.md|testing\/strategy\.md|deploy\/plan\.md|interaction-spec\.md|research-brief\.md)$/;
const gateOwnerRe = /^gate_owner:\s*\S[^\r\n]*$/m;
const demoExemptRe = /^demo:\s*true\b/m;
const exemptDemoRe = /^exempt:\s*demo\b/m;

function hasGateAnchor(content) {
  if (gateOwnerRe.test(content)) return true;
  if (demoExemptRe.test(content)) return true;
  if (exemptDemoRe.test(content)) return true;
  return false;
}

function assertGatedArtifactGate(file) {
  const content = read(file);
  if (!hasGateAnchor(content)) {
    fail(
      `${file}: gated artifact 缺少独立 owner 锚定或 demo 豁免 — add frontmatter \`gate_owner: <issue URL | CODEOWNERS path | named owner>\` or \`demo: true\` (AGENTS.md 独立产物门)`,
    );
  }
}

if (exists('docs/features')) {
  for (const file of filesUnder('docs/features')) {
    if (!gatedFeatureArtifactRe.test(file)) continue;
    assertGatedArtifactGate(file);
  }
}

if (exists('docs/adr')) {
  for (const file of filesUnder('docs/adr')) {
    if (!file.endsWith('.md')) continue;
    assertGatedArtifactGate(file);
  }
}

for (const legacyActiveFile of ['docs/timeline.md', 'docs/status.md', 'docs/idea-brief.md']) {
  assert(!exists(legacyActiveFile), `${legacyActiveFile}: active derived/process document is not allowed`);
}

// Feature-level index integrity: when a feature uses the modules/ down-drill
// layer, goal.md must act as a reliable index. Every modules/*.md file must be
// referenced from goal.md (so a read-budget-limited agent can discover it), and
// every modules/<x>.md pointer in goal.md must resolve to an existing file
// (no dangling pointers). Only fires when docs/features/<f>/modules/ exists, so
// it never breaks features that keep all detail inline in goal.md.
const featuresRoot = 'docs/features';
if (exists(featuresRoot)) {
  for (const entry of fs.readdirSync(path.join(root, featuresRoot), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const featureDir = path.join(featuresRoot, entry.name);
    const goalPath = path.join(featureDir, 'goal.md');
    const modulesDir = path.join(featureDir, 'modules');
    if (!exists(goalPath) || !exists(modulesDir)) continue;

    const goalContent = read(goalPath);
    const moduleFiles = fs
      .readdirSync(path.join(root, modulesDir), { withFileTypes: true })
      .filter((m) => m.isFile() && m.name.endsWith('.md'))
      .map((m) => m.name);

    for (const moduleFile of moduleFiles) {
      assert(
        goalContent.includes(`modules/${moduleFile}`),
        `${goalPath}: missing index pointer to modules/${moduleFile} (goal.md「需要细节时」must list every module)`,
      );
    }

    const pointerMatches = goalContent.matchAll(/modules\/([\w.-]+\.md)/g);
    for (const match of pointerMatches) {
      const pointedFile = path.join(modulesDir, match[1]);
      assert(
        exists(pointedFile),
        `${goalPath}: dangling pointer modules/${match[1]} — no such file under ${modulesDir}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error('Forge validation failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Forge validation passed (${skillDirs.length} skills, version ${packageJson.version}).`);
