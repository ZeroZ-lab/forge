/**
 * codex-bin.mjs — Shared utility to locate the Codex CLI binary.
 *
 * Used by run-skills-benchmark.mjs and install-local-codex-plugin.mjs.
 * Zero external dependencies. Pure Node.js built-ins.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

/**
 * Find the Codex CLI binary path.
 *
 * Resolution order:
 * 1. CODEX_BIN environment variable
 * 2. /Applications/Codex.app/Contents/Resources/codex (macOS)
 * 3. `command -v codex` via zsh login shell
 *
 * @returns {string|null} Absolute path to the codex binary, or null if not found.
 */
export function findCodexBin() {
  if (process.env.CODEX_BIN) return process.env.CODEX_BIN;
  const candidates = [
    '/Applications/Codex.app/Contents/Resources/codex',
    spawnSync('zsh', ['-lc', 'command -v codex'], { encoding: 'utf8' }).stdout.trim(),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}
