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

const packageJson = json('package.json');
const claudePlugin = json('.claude-plugin/plugin.json');
const codexPlugin = json('.codex-plugin/plugin.json');

assert(
  packageJson.version === claudePlugin.version &&
    packageJson.version === codexPlugin.version,
  `version mismatch: package=${packageJson.version}, claude=${claudePlugin.version}, codex=${codexPlugin.version}`,
);

assert(packageJson.scripts?.validate === 'node scripts/validate.mjs', 'package.json: missing scripts.validate');
assert(claudePlugin.skills === './skills/', '.claude-plugin/plugin.json: skills must point to ./skills/');

const skillsDir = path.join(root, 'skills');
const forgeSkillDirs = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('forge-'))
  .map((entry) => entry.name)
  .sort();

assert(forgeSkillDirs.length === 18, `expected 18 forge-* skills, found ${forgeSkillDirs.length}`);

for (const skillName of forgeSkillDirs) {
  const skillPath = `skills/${skillName}/SKILL.md`;
  assert(exists(skillPath), `${skillPath}: missing`);
  if (!exists(skillPath)) continue;

  const content = read(skillPath);
  const declaredName = content.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  assert(declaredName === skillName, `${skillPath}: frontmatter name "${declaredName}" does not match directory`);
  assert(lineCount(content) <= 200, `${skillPath}: exceeds 200 lines`);
}

const stalePatterns = [
  ['AGENTS.md', /BA1-BA5/],
  ['README.md', /9 个决策 Command|9 个 Command|8 阶段 × 18 个 Skill/],
  ['AGENTS.md', /Phase 1 数据库|Phase 2 API/],
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
