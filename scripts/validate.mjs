#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
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
    fail(`${relativePath}: invalid JSON (${error.message})`);
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
    if (referencePath.startsWith('forge-')) return `skills/${referencePath}`;
    return `skills/${skillName}/${referencePath}`;
  });
}

const packageJson = json('package.json');
const claudePlugin = json('.claude-plugin/plugin.json');
const codexPlugin = json('.codex-plugin/plugin.json');
const claudeMarketplace = json('.claude-plugin/marketplace.json');

assert(
  packageJson.version === claudePlugin.version &&
    packageJson.version === codexPlugin.version,
  `version mismatch: package=${packageJson.version}, claude=${claudePlugin.version}, codex=${codexPlugin.version}`,
);

assert(packageJson.scripts?.validate === 'node scripts/validate.mjs', 'package.json: missing scripts.validate');

const skillsDir = path.join(root, 'skills');
const forgeSkillDirs = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('forge-'))
  .map((entry) => entry.name)
  .sort();

assert(forgeSkillDirs.length === 21, `expected 21 forge-* skills, found ${forgeSkillDirs.length}`);

const expectedSkillPaths = forgeSkillDirs.map((skillName) => `./skills/${skillName}`).sort();
const manifestSkillPaths = Array.isArray(claudePlugin.skills) ? [...claudePlugin.skills].sort() : [];

assert(Array.isArray(claudePlugin.skills), '.claude-plugin/plugin.json: skills must explicitly enumerate installed skills');
assert(
  JSON.stringify(manifestSkillPaths) === JSON.stringify(expectedSkillPaths),
  '.claude-plugin/plugin.json: skills list must match skills/forge-* exactly',
);

for (const skillName of forgeSkillDirs) {
  const skillPath = `skills/${skillName}/SKILL.md`;
  assert(exists(skillPath), `${skillPath}: missing`);
  if (!exists(skillPath)) continue;

  const content = read(skillPath);
  const declaredName = content.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = content.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  const shortName = skillName.replace(/^forge-/, '');
  assert(
    declaredName === shortName,
    `${skillPath}: frontmatter name "${declaredName}" must match short skill name "${shortName}"`,
  );
  assert(Boolean(description), `${skillPath}: frontmatter description is required`);
  assert(lineCount(content) <= 200, `${skillPath}: exceeds 200 lines`);

  for (const referencePath of referencedMarkdownFiles(skillName, content)) {
    assert(exists(referencePath), `${skillPath}: referenced file is missing: ${referencePath}`);
  }
}

const requiredProtocols = {
  'forge-fe-system': {
    path: 'skills/forge-fe-system/references/fe-system-protocol.md',
    markers: ['# Fe System Protocol', '## Token 结构', '### Primitive', '### Semantic', '### Component'],
  },
  'forge-fe-artifact': {
    path: 'skills/forge-fe-artifact/references/fe-artifact-protocol.md',
    markers: ['# Fe Artifact Protocol', '## 五层翻译详解', '### 1. 意图层', '### 5. 适配层'],
  },
  'forge-fe-accept': {
    path: 'skills/forge-fe-accept/references/fe-accept-protocol.md',
    markers: ['# Fe Accept Protocol', '## 四维验收', '## 报告格式', '## 执行证据'],
  },
  'forge-review': {
    path: 'skills/forge-review/references/review-protocol.md',
    markers: ['# Review Protocol', '## 文档审查维度', '## 代码审查维度', '## 报告格式'],
  },
};

for (const [skillName, protocol] of Object.entries(requiredProtocols)) {
  const skillPath = `skills/${skillName}/SKILL.md`;
  const referenceName = protocol.path.replace(`skills/${skillName}/`, '');
  assert(read(skillPath).includes(referenceName), `${skillPath}: must reference ${referenceName}`);
  assert(exists(protocol.path), `${protocol.path}: missing`);
  if (exists(protocol.path)) assertIncludes(protocol.path, protocol.markers);
}

assertIncludes('skills/shared/module-template.md', ['## 入口', '## 公共接口', '## 内部函数', '## 依赖关系']);
assertIncludes('skills/shared/contract-template.md', [
  '## 模块索引',
  '## 代码映射',
  '## 编排',
  '### 入口文件',
  '### 事件绑定',
]);

const marketplaceDescription = claudeMarketplace.plugins?.find((plugin) => plugin.name === 'forge')?.description ?? '';
assert(
  marketplaceDescription.includes('21 个决策协议 skill'),
  '.claude-plugin/marketplace.json: forge description must mention "21 个决策协议 skill"',
);
assert(read('README.md').includes('8 阶段 × 21 个 Skill'), 'README.md: must document 8 阶段 × 21 个 Skill');
assert(read('AGENTS.md').includes('21 个决策协议'), 'AGENTS.md: must document 21 个决策协议');

const stalePatterns = [
  ['AGENTS.md', /BA1-BA5/],
  ['README.md', /9 个决策 Command|9 个 Command|8 阶段 × 18 个 Skill|18 个 skill|18 个 `forge-\*` skill/],
  ['AGENTS.md', /Phase 1 数据库|Phase 2 API/],
  ['README.md', /Command 链|决策 Command|\/(brainstorm|init|define|design|detail|plan|test|deploy)(?![-\w])/],
  ['AGENTS.md', /命令系统|Command|\/(brainstorm|init|define|design|detail|plan|test|deploy)(?![-\w])/],
  ['references/usage-examples.md', /\/(brainstorm|init|define|design|detail|plan|test|deploy)(?![-\w])/],
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

const detailSkill = read('skills/forge-detail/SKILL.md');
const apiPhase = indexOfOrFail(detailSkill, 'Phase 1: API 设计', 'skills/forge-detail/SKILL.md');
const dbPhase = indexOfOrFail(detailSkill, 'Phase 2: 数据库设计', 'skills/forge-detail/SKILL.md');
assert(apiPhase < dbPhase, 'skills/forge-detail/SKILL.md: API phase must precede database phase');

const planSkill = read('skills/forge-plan/SKILL.md');
for (const marker of ['### P1:', '### P2:', '### P3:', '### P4:', '### P5:']) {
  assert(planSkill.includes(marker), `skills/forge-plan/SKILL.md: missing ${marker}`);
}

const testCasesSkill = read('skills/forge-test-cases/SKILL.md');
for (const marker of ['### TC1:', '### TC2:', '### TC3:', '### TC4:', '### TC5:']) {
  assert(testCasesSkill.includes(marker), `skills/forge-test-cases/SKILL.md: missing ${marker}`);
}
assert(testCasesSkill.includes('testing/test-cases.md'), 'skills/forge-test-cases/SKILL.md: must use testing/test-cases.md');

const deploySkill = read('skills/forge-deploy/SKILL.md');
for (const marker of ['### RL1:', '### RL2:', '### RL3:', '### RL4:', '### RL5:']) {
  assert(deploySkill.includes(marker), `skills/forge-deploy/SKILL.md: missing ${marker}`);
}

const implementationReadme = 'docs/features/task-management/implementation/README.md';
assert(exists(implementationReadme), `${implementationReadme}: missing boundary README`);
if (exists(implementationReadme)) {
  const content = read(implementationReadme);
  assert(content.includes('not a runnable sample application'), `${implementationReadme}: must state non-runnable boundary`);
  assert(content.includes('Do not cite it as evidence'), `${implementationReadme}: must forbid runtime validation claims`);
}

const implementationFiles = fs
  .readdirSync(path.join(root, 'docs/features/task-management/implementation/src/tests'), { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => `docs/features/task-management/implementation/src/tests/${entry.name}`);

const hasPlaceholderTests = implementationFiles.some((file) => read(file).includes('expect(true).toBe(true)'));
assert(
  !hasPlaceholderTests || exists(implementationReadme),
  'implementation placeholder tests require a boundary README',
);

if (failures.length > 0) {
  console.error('Forge validation failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Forge validation passed (${forgeSkillDirs.length} skills, version ${packageJson.version}).`);
