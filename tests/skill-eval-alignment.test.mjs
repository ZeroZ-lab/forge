import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = new URL('..', import.meta.url);

async function markdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await markdownFiles(fullPath)));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

test('published skills carry eval transcript signals', async () => {
  const manifestPath = new URL('evals/skills-suite/manifest.json', root);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const skillDir = path.join(root.pathname, 'plugins/forge/skills');
  const corpus = (
    await Promise.all((await markdownFiles(skillDir)).map((file) => readFile(file, 'utf8')))
  ).join('\n');

  const missing = [];
  for (const testCase of manifest.cases) {
    for (const check of testCase.oracle_checks ?? []) {
      if (check.type !== 'transcript_contains') continue;
      const text = check.text ?? check.pattern;
      if (typeof text === 'string' && !corpus.includes(text)) {
        missing.push(`${testCase.id}: ${text}`);
      }
    }
  }

  assert.deepEqual(missing, []);
});

test('published skills carry eval decision-gate ids', async () => {
  const manifestPath = new URL('evals/skills-suite/manifest.json', root);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const skillDir = path.join(root.pathname, 'plugins/forge/skills');
  const corpus = (
    await Promise.all((await markdownFiles(skillDir)).map((file) => readFile(file, 'utf8')))
  ).join('\n');

  const missing = [];
  for (const testCase of manifest.cases) {
    for (const check of testCase.oracle_checks ?? []) {
      if (check.type !== 'decision_gate_reported') continue;
      if (typeof check.decision === 'string' && !corpus.includes(check.decision)) {
        missing.push(`${testCase.id}: ${check.decision}`);
      }
    }
  }

  assert.deepEqual(missing, []);
});

test('published skills keep Change Unit as the only history source', async () => {
  const skillDir = path.join(root.pathname, 'plugins/forge/skills');
  const corpus = (
    await Promise.all((await markdownFiles(skillDir)).map((file) => readFile(file, 'utf8')))
  ).join('\n');

  assert.doesNotMatch(corpus, /Changelog preserves decision history/i);
  assert.match(corpus, /Change Units preserve decision history/);
});
