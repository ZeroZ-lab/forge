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

const files = [
  'package.json',
  'plugins/forge/.claude-plugin/plugin.json',
  'plugins/forge/.codex-plugin/plugin.json',
];

for (const file of files) {
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
