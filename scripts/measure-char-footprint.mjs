#!/usr/bin/env node

import process from 'node:process';

import {
  measureRuntimeFootprint,
  RUNTIME_FOOTPRINT_BUDGETS,
  runtimeFootprintFailures,
} from './lib/runtime-footprint.mjs';

const root = process.cwd();
const json = process.argv.includes('--json');
const knownArgs = new Set([
  '--json',
  '--max-kernel-adapter-chars',
  '--max-project-agents-chars',
  '--max-metadata-chars',
  '--max-platform-metadata-chars',
  '--max-selected-skill-chars',
  '--max-selected-bundle-chars',
  '--max-total-chars',
]);
for (const arg of process.argv.slice(2)) {
  const name = arg.split('=', 1)[0];
  if (name === '--max-default-chain-chars' || name === '--max-skill-chars') {
    throw new Error(
      `${name} was removed: the fixed chain is legacy-only. Use adaptive Kernel, metadata, selected-skill, selected-bundle, and total budgets.`,
    );
  }
  if (!knownArgs.has(name)) throw new Error(`Unknown argument: ${name}`);
}

function parseNumberArg(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`Invalid --${name}: ${value}`);
  return number;
}

const budgets = {
  kernel_adapter_chars:
    parseNumberArg('max-kernel-adapter-chars') ?? RUNTIME_FOOTPRINT_BUDGETS.kernel_adapter_chars,
  project_agents_chars:
    parseNumberArg('max-project-agents-chars') ?? RUNTIME_FOOTPRINT_BUDGETS.project_agents_chars,
  registry_metadata_chars:
    parseNumberArg('max-metadata-chars') ?? RUNTIME_FOOTPRINT_BUDGETS.registry_metadata_chars,
  platform_metadata_chars:
    parseNumberArg('max-platform-metadata-chars') ?? RUNTIME_FOOTPRINT_BUDGETS.platform_metadata_chars,
  max_selected_skill_chars:
    parseNumberArg('max-selected-skill-chars') ?? RUNTIME_FOOTPRINT_BUDGETS.max_selected_skill_chars,
  max_selected_bundle_chars:
    parseNumberArg('max-selected-bundle-chars') ?? RUNTIME_FOOTPRINT_BUDGETS.max_selected_bundle_chars,
  total_skill_chars:
    parseNumberArg('max-total-chars') ?? RUNTIME_FOOTPRINT_BUDGETS.total_skill_chars,
};
const result = measureRuntimeFootprint(root);
const failures = runtimeFootprintFailures(result, budgets);

if (json) {
  console.log(JSON.stringify({ ...result, budgets }, null, 2));
} else {
  console.log(`Generated AGENTS Kernel template: ${result.kernel_adapter.chars} chars`);
  console.log(`Current project AGENTS adapter: ${result.project_agents.chars} chars`);
  console.log(`Initial registry metadata: ${result.registry_metadata.chars} chars across ${result.registry_metadata.entries.length} Skills`);
  console.log(`Platform skill metadata adapters: ${result.platform_metadata.chars} chars across ${result.platform_metadata.entries.length} files`);
  console.log(`Largest selected Skill body: ${result.max_selected_skill.name} ${result.max_selected_skill.chars} chars`);
  console.log(`Largest selected capability bundle: ${result.max_selected_bundle.name} ${result.max_selected_bundle.chars} chars (${result.max_selected_bundle.references.length} linked Markdown references, recursive upper bound)`);
  console.log(`Legacy compatibility chain (${result.legacy_chain.join(' -> ')}): ${result.legacy_chain_total.chars} chars (reference only, not the production default)`);
  console.log(`All SKILL.md files: ${result.total.chars} chars`);
  console.log('\nTop SKILL.md files by size:');
  for (const skill of result.skills.slice(0, 10)) {
    console.log(`- ${skill.name}: ${skill.chars} chars, ${skill.lines} lines`);
  }
}

if (failures.length > 0) {
  console.error('\nAdaptive runtime footprint budget exceeded:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
