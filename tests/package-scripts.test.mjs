import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('release validation reuses the canonical npm test entrypoint', () => {
  assert.equal(packageJson.scripts?.test, "node --test 'tests/*.test.mjs'");
  assert.equal(packageJson.scripts?.prepublishOnly, 'npm run validate && npm test');
});
