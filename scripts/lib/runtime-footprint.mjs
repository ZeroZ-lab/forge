import fs from 'node:fs';
import path from 'node:path';

import { loadRegistry } from './registry.mjs';

export const LEGACY_CHAIN = Object.freeze(['detail', 'codegen', 'review']);
export const RUNTIME_FOOTPRINT_BUDGETS = Object.freeze({
  kernel_adapter_chars: 3000,
  project_agents_chars: 6000,
  registry_metadata_chars: 8500,
  platform_metadata_chars: 1500,
  max_selected_skill_chars: 4000,
  max_selected_bundle_chars: 20000,
  total_skill_chars: 56000,
});

const PROXY_CHARS_PER_TOKEN = 3.2;

function totals(items) {
  return {
    chars: items.reduce((sum, item) => sum + item.chars, 0),
    lines: items.reduce((sum, item) => sum + (item.lines ?? 0), 0),
    token_proxy: items.reduce((sum, item) => sum + item.token_proxy, 0),
  };
}

function measuredText(name, relativePath, text) {
  return {
    name,
    path: relativePath,
    chars: text.length,
    lines: text.replace(/\r?\n$/, '').split(/\r?\n/).length,
    token_proxy: Math.ceil(text.length / PROXY_CHARS_PER_TOKEN),
  };
}

function referencedMarkdownPaths(rootDir, entryPath) {
  const skillRoot = path.join(rootDir, 'plugins', 'forge', 'skills');
  const entryDirectory = path.dirname(path.join(rootDir, entryPath));
  const pending = [entryPath];
  const visited = new Set();
  const references = [];

  while (pending.length > 0) {
    const relativePath = pending.pop();
    if (visited.has(relativePath)) continue;
    visited.add(relativePath);
    const absolutePath = path.join(rootDir, relativePath);
    const content = fs.readFileSync(absolutePath, 'utf8');
    const matches = content.matchAll(
      /(\$\{CLAUDE_SKILL_DIR\}\/)?((?:\.\.\/shared|references)\/[A-Za-z0-9_./-]+\.md)\b/g,
    );
    for (const match of matches) {
      const resolved = path.normalize(
        path.join(match[1] ? entryDirectory : path.dirname(absolutePath), match[2]),
      );
      const relative = path.relative(rootDir, resolved).replaceAll(path.sep, '/');
      if (
        !resolved.startsWith(`${skillRoot}${path.sep}`)
        || !fs.existsSync(resolved)
        || !fs.statSync(resolved).isFile()
        || visited.has(relative)
      ) {
        continue;
      }
      references.push(relative);
      pending.push(relative);
    }
  }
  return [...new Set(references)].sort();
}

export function measureRuntimeFootprint(rootDir) {
  const skillRoot = path.join(rootDir, 'plugins', 'forge', 'skills');
  const skillNames = fs
    .readdirSync(skillRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(skillRoot, entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
  const skills = skillNames.map((skillName) => {
    const relativePath = `plugins/forge/skills/${skillName}/SKILL.md`;
    return measuredText(
      skillName,
      relativePath,
      fs.readFileSync(path.join(rootDir, relativePath), 'utf8'),
    );
  });

  const publicSkills = new Set(loadRegistry(rootDir).skills.map((skill) => skill.name));
  const selectableSkills = skills.filter((skill) => publicSkills.has(skill.name));
  const selectedSkillMax = [...selectableSkills].sort((a, b) => b.chars - a.chars)[0];
  const selectedBundles = selectableSkills.map((skill) => {
    const referencePaths = referencedMarkdownPaths(rootDir, skill.path);
    const references = referencePaths.map((relativePath) =>
      measuredText(
        path.basename(relativePath, '.md'),
        relativePath,
        fs.readFileSync(path.join(rootDir, relativePath), 'utf8'),
      ));
    return {
      name: skill.name,
      entry: skill,
      references,
      ...totals([skill, ...references]),
    };
  });
  const selectedBundleMax = [...selectedBundles].sort((a, b) => b.chars - a.chars)[0];
  const legacySkills = skills.filter((skill) => LEGACY_CHAIN.includes(skill.name));

  const metadataEntries = loadRegistry(rootDir).skills.map((skill) => {
    const text = [skill.name, skill.description ?? '', skill.when_to_use ?? ''].join('\n');
    return measuredText(skill.name, `plugins/forge/skills/${skill._dir}/SKILL.md#frontmatter`, text);
  });
  const kernelAdapterPath = 'plugins/forge/skills/init/references/agents-template.md';
  const kernelAdapter = measuredText(
    'generated-agents-kernel-template',
    kernelAdapterPath,
    fs.readFileSync(path.join(rootDir, kernelAdapterPath), 'utf8'),
  );
  const projectAgentsPath = 'AGENTS.md';
  const projectAgents = measuredText(
    'current-project-agents',
    projectAgentsPath,
    fs.readFileSync(path.join(rootDir, projectAgentsPath), 'utf8'),
  );
  const platformMetadataEntries = loadRegistry(rootDir).skills.flatMap((skill) => {
    const relativePath = `plugins/forge/skills/${skill._dir}/agents/openai.yaml`;
    if (!fs.existsSync(path.join(rootDir, relativePath))) return [];
    return [
      measuredText(
        skill.name,
        relativePath,
        fs.readFileSync(path.join(rootDir, relativePath), 'utf8'),
      ),
    ];
  });

  return {
    unit_note:
      'chars is the measured budget metric. token_proxy = chars/3.2 is only an English-text sketch and undercounts CJK-heavy content; never use it as an effectiveness claim.',
    token_proxy_basis: PROXY_CHARS_PER_TOKEN,
    kernel_adapter: kernelAdapter,
    project_agents: projectAgents,
    registry_metadata: {
      ...totals(metadataEntries),
      entries: [...metadataEntries].sort((a, b) => b.chars - a.chars),
    },
    platform_metadata: {
      ...totals(platformMetadataEntries),
      entries: [...platformMetadataEntries].sort((a, b) => b.chars - a.chars),
    },
    max_selected_skill: selectedSkillMax,
    max_selected_bundle: selectedBundleMax,
    selected_bundles: [...selectedBundles].sort((a, b) => b.chars - a.chars),
    legacy_chain: LEGACY_CHAIN,
    legacy_chain_total: totals(legacySkills),
    total: totals(skills),
    skills: [...skills].sort((a, b) => b.chars - a.chars),
  };
}

export function runtimeFootprintFailures(footprint, budgets = RUNTIME_FOOTPRINT_BUDGETS) {
  const failures = [];
  const checks = [
    ['generated Kernel template', footprint.kernel_adapter.chars, budgets.kernel_adapter_chars],
    ['current project AGENTS', footprint.project_agents.chars, budgets.project_agents_chars],
    ['registry metadata', footprint.registry_metadata.chars, budgets.registry_metadata_chars],
    ['platform metadata', footprint.platform_metadata.chars, budgets.platform_metadata_chars],
    ['max selected Skill', footprint.max_selected_skill.chars, budgets.max_selected_skill_chars],
    ['max selected capability bundle', footprint.max_selected_bundle.chars, budgets.max_selected_bundle_chars],
    ['total SKILL.md', footprint.total.chars, budgets.total_skill_chars],
  ];
  for (const [label, actual, maximum] of checks) {
    if (maximum !== undefined && actual > maximum) {
      failures.push(`${label} chars ${actual} exceeds ${maximum}`);
    }
  }
  return failures;
}
