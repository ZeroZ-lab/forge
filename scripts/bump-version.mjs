#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node scripts/bump-version.mjs <major.minor.patch>');
  process.exit(1);
}

// Files whose top-level `version` field tracks the release.
const manifestFiles = [
  'package.json',
  'plugins/forge/.claude-plugin/plugin.json',
  'plugins/forge/.codex-plugin/plugin.json',
];

// Marketplace manifests. Clients such as zcode detect updates by comparing
// `plugins[].version`, so the forge entry must carry the release version.
const marketplaceFiles = [
  '.claude-plugin/marketplace.json',
  'plugins/forge/.claude-plugin/marketplace.json',
  '.agents/plugins/marketplace.json',
];

for (const file of manifestFiles) {
  const fullPath = path.join(root, file);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const content = JSON.parse(raw);
  const old = content.version;
  if (old === version) {
    console.log(`${file}: already ${version}`);
    continue;
  }
  content.version = version;
  // Preserve original formatting: 2-space indent, trailing newline
  fs.writeFileSync(fullPath, `${JSON.stringify(content, null, 2)}\n`);
  console.log(`${file}: ${old} -> ${version}`);
}

for (const file of marketplaceFiles) {
  const fullPath = path.join(root, file);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const content = JSON.parse(raw);
  const entry = (content.plugins || []).find((plugin) => plugin.name === 'forge');
  if (!entry) {
    throw new Error(`${file}: no forge entry in plugins[]`);
  }
  const old = entry.version;
  if (old === version) {
    console.log(`${file}: already ${version}`);
    continue;
  }
  entry.version = version;
  // Preserve original formatting: 2-space indent, trailing newline
  fs.writeFileSync(fullPath, `${JSON.stringify(content, null, 2)}\n`);
  console.log(`${file}: forge entry ${old ?? '<missing>'} -> ${version}`);
}
