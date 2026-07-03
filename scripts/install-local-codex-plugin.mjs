#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { findCodexBin } from './lib/codex-bin.mjs';

const root = process.cwd();
const marketplaceName = 'forge-local';
const pluginName = 'forge';
const pluginVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

function run(codexBin, args, options = {}) {
  const result = spawnSync(codexBin, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.quiet ? 'pipe' : 'inherit',
  });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${codexBin} ${args.join(' ')} failed`);
  }
  return result;
}

const codexBin = findCodexBin();
if (!codexBin) {
  console.error('Codex CLI not found. Set CODEX_BIN or install Codex CLI.');
  process.exit(1);
}

const marketplaceRoot = path.join(root, '.eval-runs', 'local-codex-marketplace');
const pluginsDir = path.join(marketplaceRoot, 'plugins');
const pluginLink = path.join(pluginsDir, pluginName);
const manifestDir = path.join(marketplaceRoot, '.agents', 'plugins');
const manifestPath = path.join(manifestDir, 'marketplace.json');

fs.mkdirSync(pluginsDir, { recursive: true });
fs.mkdirSync(manifestDir, { recursive: true });
try {
  fs.unlinkSync(pluginLink);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
fs.symlinkSync(path.join(root, 'plugins/forge'), pluginLink, 'dir');

const marketplace = {
  name: marketplaceName,
  interface: {
    displayName: 'Forge Local',
  },
  plugins: [
    {
      name: pluginName,
      version: pluginVersion,
      source: {
        source: 'local',
        path: './plugins/forge',
      },
      policy: {
        installation: 'AVAILABLE',
        authentication: 'ON_INSTALL',
      },
      category: 'Engineering',
    },
  ],
};

fs.writeFileSync(manifestPath, JSON.stringify(marketplace, null, 2));

run(codexBin, ['plugin', 'remove', `${pluginName}@${marketplaceName}`], {
  allowFailure: true,
  quiet: true,
});
run(codexBin, ['plugin', 'marketplace', 'remove', marketplaceName], {
  allowFailure: true,
  quiet: true,
});
run(codexBin, ['plugin', 'marketplace', 'add', marketplaceRoot]);
run(codexBin, ['plugin', 'add', `${pluginName}@${marketplaceName}`]);

console.log(`Installed ${pluginName}@${marketplaceName} from ${marketplaceRoot}`);
