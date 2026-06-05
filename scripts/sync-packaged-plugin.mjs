#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const packagedRoot = path.join(root, 'plugins', 'forge');

function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(packagedRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDir(sourceRelativePath, targetRelativePath = sourceRelativePath) {
  const source = path.join(root, sourceRelativePath);
  const target = path.join(packagedRoot, targetRelativePath);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourceChild = path.join(sourceRelativePath, entry.name);
    const targetChild = path.join(targetRelativePath, entry.name);
    if (entry.isDirectory()) copyDir(sourceChild, targetChild);
    if (entry.isFile()) copyFileToTarget(sourceChild, targetChild);
  }
}

function copyFileToTarget(sourceRelativePath, targetRelativePath) {
  const source = path.join(root, sourceRelativePath);
  const target = path.join(packagedRoot, targetRelativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

fs.mkdirSync(packagedRoot, { recursive: true });
copyFile('.codex-plugin/plugin.json');
copyFile('.claude-plugin/plugin.json');
copyDir('skills');

console.log('Synced packaged Forge plugin into plugins/forge.');
