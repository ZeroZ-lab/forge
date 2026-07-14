#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';

import { runPackedPluginSmoke } from './lib/packed-plugin-smoke.mjs';

function parseArgs(argv) {
  const options = {
    authFrom: process.env.CODEX_AUTH_FILE || null,
    codexBin: process.env.CODEX_BIN || null,
    runId: null,
    runDir: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--auth-from') {
      options.authFrom = argv[index + 1];
      index += 1;
    } else if (arg === '--codex-bin') {
      options.codexBin = argv[index + 1];
      index += 1;
    } else if (arg === '--run-id') {
      options.runId = argv[index + 1];
      index += 1;
    } else if (arg === '--output-dir') {
      options.runDir = argv[index + 1];
      index += 1;
    } else if (arg === '--help') {
      console.log([
        'Usage: node scripts/smoke-packed-plugin.mjs [options]',
        '',
        'Options:',
        '  --auth-from <file>  Copy auth.json into the temporary CODEX_HOME with mode 0600',
        '  --codex-bin <file>   Codex CLI executable (or set CODEX_BIN)',
        '  --run-id <id>        Stable identifier under .eval-runs/release-baseline',
        '  --output-dir <dir>   Override the evidence directory',
      ].join('\n'));
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  for (const [name, value] of Object.entries(options)) {
    if (value === undefined || value === '') throw new Error(`--${name} requires a value`);
  }
  return options;
}

try {
  const root = path.resolve(process.cwd());
  const options = parseArgs(process.argv.slice(2));
  const receipt = runPackedPluginSmoke(root, options);
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
