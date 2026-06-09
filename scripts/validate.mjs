#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { loadRegistry, deriveSignalVocabulary } from './lib/registry.mjs';

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

function assertArrayOfStrings(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
  if (!Array.isArray(value)) return;
  for (const item of value) {
    assert(typeof item === 'string' && item.length > 0, `${label} must contain only non-empty strings`);
  }
}

const packageJson = json('package.json');
const claudePlugin = json('plugins/forge/.claude-plugin/plugin.json');
const codexPlugin = json('plugins/forge/.codex-plugin/plugin.json');
const claudeMarketplace = json('plugins/forge/.claude-plugin/marketplace.json');
const codexMarketplace = json('.agents/plugins/marketplace.json');
const runtimeRegistry = loadRegistry(root);

assert(
  packageJson.version === claudePlugin.version &&
    packageJson.version === codexPlugin.version,
  `version mismatch: package=${packageJson.version}, claude=${claudePlugin.version}, codex=${codexPlugin.version}`,
);

assert(packageJson.scripts?.validate === 'node scripts/validate.mjs', 'package.json: missing scripts.validate');
assert(packageJson.scripts?.test === "node --test 'tests/*.test.mjs'", 'package.json: missing scripts.test');
assert(packageJson.scripts?.['eval:skills'] === 'node scripts/evaluate-skills.mjs', 'package.json: missing scripts.eval:skills');
assert(packageJson.scripts?.['eval:skills:run'] === 'node scripts/run-skills-benchmark.mjs', 'package.json: missing scripts.eval:skills:run');
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

const allowedRuntimeRoles = new Set([
  'goal-refiner',
  'orchestrator',
  'decision-protocol',
  'planner',
  'executor',
  'verifier',
  'governance',
  'knowledge',
]);

const allowedRegistryPhases = new Set([
  'init',
  'explore',
  'define',
  'design',
  'detail',
  'plan',
  'planning',
  'build',
  'test',
  'review',
  'deploy',
  'cross-cutting',
]);

const allowedRegistryTypes = new Set(['domain', 'orchestrator', 'execution', 'governance']);
const allowedExternalTargets = new Set(['human decision', 'runtime release execution', 'skill maintenance']);

for (const skill of runtimeRegistry.skills ?? []) {
  assert(typeof skill.name === 'string' && skill.name.length > 0, 'SKILL.md frontmatter: each skill needs a name');
  const skillDir = skill._dir ?? skill.name;
  const expectedSkillPath = `plugins/forge/skills/${skillDir}/SKILL.md`;
  assert(exists(expectedSkillPath), `SKILL.md frontmatter: missing SKILL.md for ${skill.name} at ${expectedSkillPath}`);
  assert(allowedRegistryPhases.has(skill.phase), `SKILL.md frontmatter: ${skill.name} invalid phase "${skill.phase}"`);
  assert(allowedRegistryTypes.has(skill.type), `SKILL.md frontmatter: ${skill.name} invalid type "${skill.type}"`);
  assert(allowedRuntimeRoles.has(skill.role), `SKILL.md frontmatter: ${skill.name} invalid role "${skill.role}"`);
  for (const field of [
    'phase',
    'type',
    'role',
    'triggers',
    'avoid_when',
    'consumes',
    'signals_in',
    'signals_out',
    'escalates_when',
    'output_contract',
    'maturity',
    'stage_next',
    'feedback_to',
    'quality_gates',
    'signal_routes',
  ]) {
    assert(skill[field] !== undefined && skill[field] !== null, `SKILL.md frontmatter: ${skill.name}.${field} is required`);
  }
  for (const field of [
    'triggers',
    'avoid_when',
    'consumes',
    'signals_in',
    'signals_out',
    'escalates_when',
    'output_contract',
    'stage_next',
    'feedback_to',
    'quality_gates',
  ]) {
    assertArrayOfStrings(skill[field], `SKILL.md frontmatter: ${skill.name}.${field}`);
  }
  const hasDirectProduces = Array.isArray(skill.produces);
  const hasSplitProduces = Array.isArray(skill.own_produces) && Array.isArray(skill.orchestrated_produces);
  assert(
    hasDirectProduces || hasSplitProduces,
    `SKILL.md frontmatter: ${skill.name} must define produces or own_produces/orchestrated_produces`,
  );
  if (hasDirectProduces) assertArrayOfStrings(skill.produces, `SKILL.md frontmatter: ${skill.name}.produces`);
  if (hasSplitProduces) {
    assertArrayOfStrings(skill.own_produces, `SKILL.md frontmatter: ${skill.name}.own_produces`);
    assertArrayOfStrings(skill.orchestrated_produces, `SKILL.md frontmatter: ${skill.name}.orchestrated_produces`);
  }
  const producedArtifacts = hasDirectProduces
    ? skill.produces
    : [...(skill.own_produces ?? []), ...(skill.orchestrated_produces ?? [])];
  assert(
    producedArtifacts.includes('docs/change-units/CU-*.md'),
    `SKILL.md frontmatter: ${skill.name} must declare docs/change-units/CU-*.md`,
  );
  assert(Array.isArray(skill.signal_routes), `SKILL.md frontmatter: ${skill.name}.signal_routes must be an array`);
  if (Array.isArray(skill.signal_routes)) {
    for (const route of skill.signal_routes) {
      assert(route && typeof route === 'object' && !Array.isArray(route), `SKILL.md frontmatter: ${skill.name}.signal_routes entries must be objects`);
      assert(typeof route?.signal === 'string' && route.signal.length > 0, `SKILL.md frontmatter: ${skill.name}.signal_routes.signal is required`);
      assert(typeof route?.to === 'string' && route.to.length > 0, `SKILL.md frontmatter: ${skill.name}.signal_routes.to is required`);
      assert(typeof route?.when === 'string' && route.when.length > 0, `SKILL.md frontmatter: ${skill.name}.signal_routes.when is required`);
    }
  }
  assert(typeof skill.maturity === 'string' && skill.maturity.length > 0, `SKILL.md frontmatter: ${skill.name}.maturity is required`);
}

const registryByName = Object.fromEntries((runtimeRegistry.skills ?? []).map((skill) => [skill.name, skill]));

for (const skill of runtimeRegistry.skills ?? []) {
  for (const field of ['stage_next', 'feedback_to', 'quality_gates']) {
    for (const target of skill[field]) {
      assert(registryByName[target], `SKILL.md frontmatter: ${skill.name}.${field} references unknown skill "${target}"`);
      assert(target !== skill.name, `SKILL.md frontmatter: ${skill.name}.${field} must not reference itself`);
    }
  }
  for (const route of skill.signal_routes ?? []) {
    if (typeof route?.to === 'string') {
      assert(
        registryByName[route.to] || allowedExternalTargets.has(route.to),
        `SKILL.md frontmatter: ${skill.name}.signal_routes.to references unknown target "${route.to}"`,
      );
    }
  }
}

for (const role of ['orchestrator', 'goal-refiner', 'executor', 'verifier', 'governance', 'decision-protocol']) {
  assert(
    (runtimeRegistry.skills ?? []).some((skill) => skill.role === role),
    `SKILL.md frontmatter: missing role "${role}"`,
  );
}

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

assert(exists('docs/goal-verification.md'), 'docs/goal-verification.md: missing');
assert(exists('docs/skill-architecture-audit.md'), 'docs/skill-architecture-audit.md: missing');
assert(exists('docs/skill-suite-evaluation.md'), 'docs/skill-suite-evaluation.md: missing');
assertIncludes('docs/goal-verification.md', [
  'skills 是协议节点',
  'Runtime goal verification',
  'goal-refiner',
  'executor',
  'verifier',
  'consumes',
  'produces',
  'escalates_when',
]);
assertIncludes('docs/skill-architecture-audit.md', [
  '运行时目标验证判定',
  '运行时闭环',
  'SKILL.md',
  'docs/goal-verification.md',
]);
assertIncludes('docs/skill-suite-evaluation.md', [
  'Benchmark contract is valid',
  'A run proves skill effectiveness',
  'evals/skills-suite/manifest.json',
  'evals/skills-suite/report.schema.json',
]);

for (const skillName of expectedRegistryNames) {
  const auditContent = read('docs/skill-architecture-audit.md');
  assert(
    auditContent.includes(`### forge-${skillName}`) || auditContent.includes(`### ${skillName}`),
    `docs/skill-architecture-audit.md: missing audit entry for ${skillName}`,
  );
}

const sharedKnowledgeFiles = [
  'plugins/forge/skills/shared/concepts/control-loop.md',
  'plugins/forge/skills/shared/concepts/document-as-goal.md',
  'plugins/forge/skills/shared/concepts/execution-discipline.md',
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

const skillsEvalManifest = json('evals/skills-suite/manifest.json');
assert(exists('scripts/evaluate-skills.mjs'), 'scripts/evaluate-skills.mjs: missing');
assert(exists('scripts/evaluate-skills/index.mjs'), 'scripts/evaluate-skills/index.mjs: missing');
assert(exists('scripts/run-skills-benchmark.mjs'), 'scripts/run-skills-benchmark.mjs: missing');
assert(exists('scripts/install-local-codex-plugin.mjs'), 'scripts/install-local-codex-plugin.mjs: missing');
assert(exists('evals/skills-suite/README.md'), 'evals/skills-suite/README.md: missing');
assert(exists('evals/skills-suite/report.schema.json'), 'evals/skills-suite/report.schema.json: missing');
assert(skillsEvalManifest.version === 2, 'evals/skills-suite/manifest.json: version must be 2');
assert(skillsEvalManifest.name === 'forge-skills-suite-benchmark', 'evals/skills-suite/manifest.json: unexpected benchmark name');
assert(Array.isArray(skillsEvalManifest.cases), 'evals/skills-suite/manifest.json: cases must be an array');
assert(
  skillsEvalManifest.cases?.length >= 10,
  'evals/skills-suite/manifest.json: must define at least 10 benchmark cases',
);

const evalCoveredSkills = new Set();
const evalCaseIds = new Set();
const allowedEvalCheckTypes = new Set([
  'artifact_reported',
  'change_unit_reported',
  'goal_covers',
  'command_reported',
  'decision_gate_reported',
  'goal_verified',
  'evidence_contains',
  'forbidden_behavior_absent',
  'skill_triggered',
]);

for (const testCase of skillsEvalManifest.cases ?? []) {
  assert(
    typeof testCase.id === 'string' && /^[a-z0-9-]+$/.test(testCase.id),
    'evals/skills-suite/manifest.json: case id must be kebab-case',
  );
  assert(!evalCaseIds.has(testCase.id), `evals/skills-suite/manifest.json: duplicate case id ${testCase.id}`);
  evalCaseIds.add(testCase.id);
  assert(typeof testCase.fixture === 'string' && exists(testCase.fixture), `${testCase.id}: fixture is missing`);
  assertArrayOfStrings(testCase.expected_skills, `${testCase.id}.expected_skills`);
  assertArrayOfStrings(testCase.expected_artifacts, `${testCase.id}.expected_artifacts`);
  assertArrayOfStrings(testCase.required_evidence, `${testCase.id}.required_evidence`);
  assertArrayOfStrings(testCase.forbidden_behaviors, `${testCase.id}.forbidden_behaviors`);
  assert(Array.isArray(testCase.oracle_checks) && testCase.oracle_checks.length > 0, `${testCase.id}: oracle_checks are required`);
  assert(
    testCase.oracle_checks.some((check) => check.type === 'change_unit_reported'),
    `${testCase.id}: must check Change Unit reporting`,
  );

  for (const skillName of testCase.expected_skills ?? []) {
    assert(registryByName[skillName], `${testCase.id}: unknown expected skill ${skillName}`);
    evalCoveredSkills.add(skillName);
  }
  for (const check of testCase.oracle_checks ?? []) {
    assert(allowedEvalCheckTypes.has(check.type), `${testCase.id}: unknown oracle check type ${check.type}`);
    if (check.type === 'goal_verified') {
      assert(
        testCase.expected_artifacts.includes(check.target),
        `${testCase.id}: goal_verification target ${check.target} must be listed in expected_artifacts`,
      );
    }
  }
}

for (const skillName of expectedRegistryNames) {
  assert(evalCoveredSkills.has(skillName), `evals/skills-suite/manifest.json: missing benchmark coverage for ${skillName}`);
}

for (const orchestrator of ['init', 'design', 'detail', 'test']) {
  const skillPath = `plugins/forge/skills/${orchestrator}/SKILL.md`;
  assertIncludes(skillPath, ['## 运行时角色', '## 输入状态读取', '## 分支与恢复', '## 运行时信号']);
}

assert(
  registryByName['codegen']?.signal_routes?.some((route) => route.signal === 'goal not met' && route.to === 'detail'),
  'SKILL.md frontmatter: fast-to-middle loop must route goal-not-met signal from codegen to detail',
);
assert(
  registryByName['deploy']?.escalates_when?.includes('无回滚方案'),
  'SKILL.md frontmatter: deploy must block when rollback is missing',
);

const requiredProtocols = {
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

assertIncludes('plugins/forge/skills/shared/module-template.md', ['## 入口', '## 公共接口', '## 内部函数', '## 依赖关系']);
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
  marketplaceDescription.includes(`${skillCount} 个决策协议 skill`),
  `plugins/forge/.claude-plugin/marketplace.json: forge description must mention "${skillCount} 个决策协议 skill"`,
);
assert(read('README.md').includes(`7 阶段 × ${skillCount} 个 Skill`), `README.md: must document 7 阶段 × ${skillCount} 个 Skill`);
assert(
  read('README.md').includes('SKILL.md') || read('README.md').includes('registry.yaml'),
  'README.md: must document SKILL.md frontmatter runtime control surface',
);
assert(read('README.md').includes('docs/goal-verification.md'), 'README.md: must document runtime control loop doc');
assert(read('AGENTS.md').includes(`${skillCount} 个决策协议`), `AGENTS.md: must document ${skillCount} 个决策协议`);
assert(read('AGENTS.md').includes('信号传递'), 'AGENTS.md: must document signal passing between goal verification loops');
assert(read('AGENTS.md').includes('SKILL.md'), 'AGENTS.md: must document SKILL.md frontmatter');
assert(read('AGENTS.md').includes('docs/goal-verification.md'), 'AGENTS.md: must document runtime control loop doc');
assertIncludes('AGENTS.md', ['### AI 执行纪律', '最小变更', '不引入未要求的抽象']);
assertIncludes('plugins/forge/skills/init/references/agents-template.md', ['## AI 执行纪律', '需要同步的目标文件', '执行可用验证']);
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

const planSkillPath = 'plugins/forge/skills/plan/SKILL.md';
const planSkill = read(planSkillPath);
for (const marker of ['### P1:', '### P2:', '### P3:', '### P4:', '### P5:']) {
  assert(planSkill.includes(marker), `${planSkillPath}: missing ${marker}`);
}

const testCasesSkillPath = 'plugins/forge/skills/test-cases/SKILL.md';
const testCasesSkill = read(testCasesSkillPath);
for (const marker of ['### TC1:', '### TC2:', '### TC3:', '### TC4:', '### TC5:']) {
  assert(testCasesSkill.includes(marker), `${testCasesSkillPath}: missing ${marker}`);
}
assert(testCasesSkill.includes('testing/test-cases.md'), `${testCasesSkillPath}: must use testing/test-cases.md`);

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

if (failures.length > 0) {
  console.error('Forge validation failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Forge validation passed (${skillDirs.length} skills, version ${packageJson.version}).`);
