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
    if (referencePath.startsWith('forge-')) return `skills/${referencePath}`;
    return `skills/${skillName}/${referencePath}`;
  });
}

function assertArrayOfStrings(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
  if (!Array.isArray(value)) return;
  for (const item of value) {
    assert(typeof item === 'string' && item.length > 0, `${label} must contain only non-empty strings`);
  }
}

const packageJson = json('package.json');
const claudePlugin = json('.claude-plugin/plugin.json');
const codexPlugin = json('.codex-plugin/plugin.json');
const claudeMarketplace = json('.claude-plugin/marketplace.json');
const runtimeRegistry = json('registry.yaml');

assert(
  packageJson.version === claudePlugin.version &&
    packageJson.version === codexPlugin.version,
  `version mismatch: package=${packageJson.version}, claude=${claudePlugin.version}, codex=${codexPlugin.version}`,
);

assert(packageJson.scripts?.validate === 'node scripts/validate.mjs', 'package.json: missing scripts.validate');
assert(packageJson.scripts?.test === 'node --test', 'package.json: missing scripts.test');

const skillsDir = path.join(root, 'skills');
const skillDirs = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'shared')
  .map((entry) => entry.name)
  .sort();

assert(skillDirs.length === 23, `expected 23 skills, found ${skillDirs.length}`);

const expectedSkillPaths = skillDirs.map((skillName) => `./skills/${skillName}`).sort();
const manifestSkillPaths = Array.isArray(claudePlugin.skills) ? [...claudePlugin.skills].sort() : [];
const expectedRegistryNames = skillDirs.map((skillName) => `forge-${skillName}`).sort();

assert(Array.isArray(claudePlugin.skills), '.claude-plugin/plugin.json: skills must explicitly enumerate installed skills');
assert(
  JSON.stringify(manifestSkillPaths) === JSON.stringify(expectedSkillPaths),
  '.claude-plugin/plugin.json: skills list must match skills/* exactly',
);

assert(runtimeRegistry.version === 1, 'registry.yaml: version must be 1');
assert(Array.isArray(runtimeRegistry.skills), 'registry.yaml: skills must be an array');

const registryNames = Array.isArray(runtimeRegistry.skills)
  ? runtimeRegistry.skills.map((skill) => skill.name).sort()
  : [];
assert(
  JSON.stringify(registryNames) === JSON.stringify(expectedRegistryNames),
  'registry.yaml: skills must cover skills/* exactly',
);

const allowedRuntimeRoles = new Set([
  'setpoint-generator',
  'orchestrator',
  'controller',
  'planner',
  'actuator',
  'sensor',
  'governance',
  'knowledge',
]);

const allowedRegistryPhases = new Set([
  'explore',
  'define',
  'design',
  'orchestration',
  'detail',
  'plan',
  'planning',
  'build',
  'test',
  'review',
  'deploy',
  'learn',
]);

const allowedRegistryTypes = new Set(['domain', 'orchestrator', 'execution', 'governance']);
const allowedExternalTargets = new Set(['human decision', 'runtime release execution', 'skill maintenance']);

for (const skill of runtimeRegistry.skills ?? []) {
  assert(typeof skill.name === 'string' && skill.name.startsWith('forge-'), 'registry.yaml: each skill needs a forge-* name');
  const expectedPath = `skills/${skill.name.replace(/^forge-/, '')}/SKILL.md`;
  assert(skill.path === expectedPath, `registry.yaml: ${skill.name} path must point to ${expectedPath}`);
  assert(exists(skill.path), `registry.yaml: missing path for ${skill.name}: ${skill.path}`);
  assert(allowedRegistryPhases.has(skill.phase), `registry.yaml: ${skill.name} invalid phase "${skill.phase}"`);
  assert(allowedRegistryTypes.has(skill.type), `registry.yaml: ${skill.name} invalid type "${skill.type}"`);
  assert(allowedRuntimeRoles.has(skill.runtime_role), `registry.yaml: ${skill.name} invalid runtime_role "${skill.runtime_role}"`);
  for (const field of [
    'triggers',
    'avoid_when',
    'consumes',
    'produces',
    'signals_in',
    'signals_out',
    'escalates_when',
    'output_contract',
    'stage_next',
    'feedback_to',
    'quality_gates',
  ]) {
    assertArrayOfStrings(skill[field], `registry.yaml: ${skill.name}.${field}`);
  }
  if ('external_downstream' in skill) {
    assertArrayOfStrings(skill.external_downstream, `registry.yaml: ${skill.name}.external_downstream`);
  }
  assert(Array.isArray(skill.signal_routes), `registry.yaml: ${skill.name}.signal_routes must be an array`);
  if (Array.isArray(skill.signal_routes)) {
    for (const route of skill.signal_routes) {
      assert(route && typeof route === 'object' && !Array.isArray(route), `registry.yaml: ${skill.name}.signal_routes entries must be objects`);
      assert(typeof route?.signal === 'string' && route.signal.length > 0, `registry.yaml: ${skill.name}.signal_routes.signal is required`);
      assert(typeof route?.to === 'string' && route.to.length > 0, `registry.yaml: ${skill.name}.signal_routes.to is required`);
      assert(typeof route?.when === 'string' && route.when.length > 0, `registry.yaml: ${skill.name}.signal_routes.when is required`);
    }
  }
  assert(typeof skill.maturity === 'string' && skill.maturity.length > 0, `registry.yaml: ${skill.name}.maturity is required`);
}

const registryByName = Object.fromEntries((runtimeRegistry.skills ?? []).map((skill) => [skill.name, skill]));

for (const skill of runtimeRegistry.skills ?? []) {
  for (const field of ['stage_next', 'feedback_to', 'quality_gates']) {
    for (const target of skill[field]) {
      assert(registryByName[target], `registry.yaml: ${skill.name}.${field} references unknown skill "${target}"`);
      assert(target !== skill.name, `registry.yaml: ${skill.name}.${field} must not reference itself`);
    }
  }
  for (const route of skill.signal_routes ?? []) {
    if (typeof route?.to === 'string') {
      assert(
        registryByName[route.to] || allowedExternalTargets.has(route.to),
        `registry.yaml: ${skill.name}.signal_routes.to references unknown target "${route.to}"`,
      );
    }
  }
}

for (const role of ['orchestrator', 'controller', 'actuator', 'sensor', 'governance', 'setpoint-generator']) {
  assert(
    (runtimeRegistry.skills ?? []).some((skill) => skill.runtime_role === role),
    `registry.yaml: missing runtime role "${role}"`,
  );
}

for (const skillName of skillDirs) {
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

assert(exists('docs/runtime-control-loop.md'), 'docs/runtime-control-loop.md: missing');
assert(exists('docs/skill-architecture-audit.md'), 'docs/skill-architecture-audit.md: missing');
assertIncludes('docs/runtime-control-loop.md', [
  'skills 是协议节点，不是控制系统本体',
  'Runtime MAPE-K 映射',
  '快回路',
  '中回路',
  '慢回路',
  'runtime role',
  'consumes',
  'produces',
  'signals_in',
  'signals_out',
  'escalates_when',
]);
assertIncludes('docs/skill-architecture-audit.md', [
  '运行时控制回路判定',
  '运行时闭环',
  'registry.yaml',
  'docs/runtime-control-loop.md',
]);

for (const skillName of expectedRegistryNames) {
  assert(
    read('docs/skill-architecture-audit.md').includes(`### ${skillName}`),
    `docs/skill-architecture-audit.md: missing audit entry for ${skillName}`,
  );
}

const sharedKnowledgeFiles = [
  'skills/shared/concepts/mape-k.md',
  'skills/shared/concepts/control-loop.md',
  'skills/shared/concepts/document-as-source.md',
  'skills/shared/concepts/execution-discipline.md',
  'skills/shared/rubrics/skill-quality.md',
  'skills/shared/rubrics/contract-quality.md',
  'skills/shared/rubrics/projection-quality.md',
  'skills/shared/red-flags/contract-drift.md',
  'skills/shared/red-flags/scope-creep.md',
  'skills/shared/red-flags/unsafe-projection.md',
  'skills/shared/output-contracts/deviation-report.md',
  'skills/shared/output-contracts/review-result.md',
  'skills/shared/output-contracts/runtime-control.md',
];

for (const file of sharedKnowledgeFiles) {
  assert(exists(file), `${file}: missing runtime knowledge file`);
  if (exists(file)) {
    assert(lineCount(read(file)) <= 200, `${file}: exceeds 200 lines`);
  }
}

for (const orchestrator of ['forge-init', 'forge-design', 'forge-detail', 'forge-test']) {
  const skillPath = registryByName[orchestrator]?.path ?? `skills/${orchestrator.replace(/^forge-/, '')}/SKILL.md`;
  assertIncludes(skillPath, ['## 运行时角色', '## 输入状态读取', '## 分支与恢复', '## 运行时信号']);
}

assert(
  registryByName['forge-codegen']?.signal_routes?.some((route) => route.signal === 'L1 deviation' && route.to === 'forge-detail'),
  'registry.yaml: fast-to-middle loop must route L1 deviation from forge-codegen to forge-detail',
);
assert(
  registryByName['forge-review']?.signal_routes?.some((route) => route.signal === 'skill/document/code attribution' && route.to === 'forge-learn'),
  'registry.yaml: review-to-learn loop must route attributed deviations to forge-learn',
);
assert(
  registryByName['forge-deploy']?.escalates_when?.includes('无回滚方案'),
  'registry.yaml: deploy must block when rollback is missing',
);

const requiredProtocols = {
  'forge-fe-system': {
    path: 'skills/fe-system/references/fe-system-protocol.md',
    markers: ['# Fe System Protocol', '## Token 结构', '### Primitive', '### Semantic', '### Component'],
  },
  'forge-fe-artifact': {
    path: 'skills/fe-artifact/references/fe-artifact-protocol.md',
    markers: ['# Fe Artifact Protocol', '## 五层翻译详解', '### 1. 意图层', '### 5. 适配层'],
  },
  'forge-fe-accept': {
    path: 'skills/fe-accept/references/fe-accept-protocol.md',
    markers: ['# Fe Accept Protocol', '## 四维验收', '## 报告格式', '## 执行证据'],
  },
  'forge-review': {
    path: 'skills/review/references/review-protocol.md',
    markers: ['# Review Protocol', '## 文档审查维度', '## 代码审查维度', '## 偏差归因维度', '## 报告格式'],
  },
};

for (const [skillName, protocol] of Object.entries(requiredProtocols)) {
  const skillPath = registryByName[skillName]?.path ?? `skills/${skillName.replace(/^forge-/, '')}/SKILL.md`;
  const referenceName = protocol.path.replace(`skills/${skillName.replace(/^forge-/, '')}/`, '');
  assert(read(skillPath).includes(referenceName), `${skillPath}: must reference ${referenceName}`);
  assert(exists(protocol.path), `${protocol.path}: missing`);
  if (exists(protocol.path)) assertIncludes(protocol.path, protocol.markers);
}

assertIncludes('skills/shared/module-template.md', ['## 入口', '## 公共接口', '## 内部函数', '## 依赖关系']);
assert(
  lineCount(read('skills/shared/module-template.md')) <= 200,
  'skills/shared/module-template.md: exceeds 200 lines',
);
assert(
  lineCount(read('skills/shared/contract-template.md')) <= 200,
  'skills/shared/contract-template.md: exceeds 200 lines',
);
assertIncludes('skills/shared/contract-template.md', [
  '## 模块索引',
  '## 下游依赖',
  '## 代码映射',
  '## 编排',
  '### 入口文件',
  'contract-orchestration-template.md',
]);
assert(exists('skills/shared/contract-orchestration-template.md'), 'skills/shared/contract-orchestration-template.md: missing');
assertIncludes('skills/shared/contract-orchestration-template.md', [
  '### 入口文件',
  '### 启动序列',
  '### 主循环 / 请求处理',
  '### 事件绑定',
  '### 模式优先级',
]);

const marketplaceDescription = claudeMarketplace.plugins?.find((plugin) => plugin.name === 'forge')?.description ?? '';
assert(
  marketplaceDescription.includes('23 个决策协议 skill'),
  '.claude-plugin/marketplace.json: forge description must mention "23 个决策协议 skill"',
);
assert(read('README.md').includes('8 阶段 × 23 个 Skill'), 'README.md: must document 8 阶段 × 23 个 Skill');
assert(read('README.md').includes('registry.yaml'), 'README.md: must document registry.yaml runtime control surface');
assert(read('README.md').includes('docs/runtime-control-loop.md'), 'README.md: must document runtime control loop doc');
assert(read('AGENTS.md').includes('23 个决策协议'), 'AGENTS.md: must document 23 个决策协议');
assert(read('AGENTS.md').includes('信号传递'), 'AGENTS.md: must document signal passing between control loops');
assert(read('AGENTS.md').includes('registry.yaml'), 'AGENTS.md: must document registry.yaml runtime control surface');
assert(read('AGENTS.md').includes('docs/runtime-control-loop.md'), 'AGENTS.md: must document runtime control loop doc');
assertIncludes('AGENTS.md', ['### AI 执行纪律', '最小变更', '不引入未要求的抽象']);
assertIncludes('skills/init/references/agents-template.md', ['## AI 执行纪律', '需要同步的契约文件', '执行可用验证']);
assertIncludes('skills/shared/concepts/execution-discipline.md', [
  '# Execution discipline',
  '## Runtime meaning',
  '## Decision boundaries',
  '## Projection rule',
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

const detailSkillPath = registryByName['forge-detail']?.path ?? 'skills/detail/SKILL.md';
const detailSkill = read(detailSkillPath);
const apiPhase = indexOfOrFail(detailSkill, 'Phase 1: API 设计', detailSkillPath);
const dbPhase = indexOfOrFail(detailSkill, 'Phase 2: 数据库设计', detailSkillPath);
assert(apiPhase < dbPhase, `${detailSkillPath}: API phase must precede database phase`);

const planSkillPath = registryByName['forge-plan']?.path ?? 'skills/plan/SKILL.md';
const planSkill = read(planSkillPath);
for (const marker of ['### P1:', '### P2:', '### P3:', '### P4:', '### P5:']) {
  assert(planSkill.includes(marker), `${planSkillPath}: missing ${marker}`);
}

const testCasesSkillPath = registryByName['forge-test-cases']?.path ?? 'skills/test-cases/SKILL.md';
const testCasesSkill = read(testCasesSkillPath);
for (const marker of ['### TC1:', '### TC2:', '### TC3:', '### TC4:', '### TC5:']) {
  assert(testCasesSkill.includes(marker), `${testCasesSkillPath}: missing ${marker}`);
}
assert(testCasesSkill.includes('testing/test-cases.md'), `${testCasesSkillPath}: must use testing/test-cases.md`);

const deploySkillPath = registryByName['forge-deploy']?.path ?? 'skills/deploy/SKILL.md';
const deploySkill = read(deploySkillPath);
for (const marker of ['### RL1:', '### RL2:', '### RL3:', '### RL4:', '### RL5:']) {
  assert(deploySkill.includes(marker), `${deploySkillPath}: missing ${marker}`);
}

const learnSkillPath = registryByName['forge-learn']?.path ?? 'skills/learn/SKILL.md';
const learnSkill = read(learnSkillPath);
for (const marker of ['### L1:', '### L2:', '### L3:', '### L4:']) {
  assert(learnSkill.includes(marker), `${learnSkillPath}: missing ${marker}`);
}

const codegenSkillPath = registryByName['forge-codegen']?.path ?? 'skills/codegen/SKILL.md';
const codegenSkill = read(codegenSkillPath);
for (const marker of ['L0（噪声）', 'L1（偏差）', 'L2（漂移）', '前馈', '信号传递', '健康检查', '归因：']) {
  assert(codegenSkill.includes(marker), `${codegenSkillPath}: missing cybernetic marker "${marker}"`);
}

assert(
  !exists('docs/features/task-management/implementation'),
  'docs/features/task-management/implementation: remove non-runnable projection examples from the repo',
);

for (const file of filesUnder('docs/features')) {
  if (file.includes('/implementation/src/tests/') && read(file).includes('expect(true).toBe(true)')) {
    fail(`${file}: placeholder implementation test is not allowed`);
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
