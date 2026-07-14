import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const workflowPath = path.join(root, '.github/workflows/ci.yml');

test('package declares the maintained Node LTS support contract', () => {
  assert.equal(packageJson.engines?.node, '>=22 <23 || >=24 <25');
  assert.equal(
    packageJson.scripts?.['check:supported'],
    'npm test && npm run validate && npm run eval:skills',
  );
});

test('CI runs the canonical contract on every supported Node major', () => {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  const matrix = workflow.match(/^\s*node:\s*\[([^\]]+)\]\s*$/m);

  assert.ok(matrix, 'CI must declare a compact Node matrix');
  assert.deepEqual(
    matrix[1].split(',').map((value) => Number(value.trim())),
    [22, 24],
  );
  assert.match(workflow, /name:\s*Node \$\{\{ matrix\.node \}\}/);
  assert.match(workflow, /fail-fast:\s*false/);
  assert.match(workflow, /permissions:[\s\S]*contents:\s*read/);
  assert.match(workflow, /uses:\s*actions\/checkout@v7/);
  assert.match(workflow, /uses:\s*actions\/setup-node@v6/);
  assert.match(workflow, /node-version:\s*\$\{\{ matrix\.node \}\}/);
  assert.match(workflow, /package-manager-cache:\s*false/);
  assert.match(workflow, /name:\s*Runtime versions[\s\S]*node --version[\s\S]*npm --version/);

  const ciCommands = [...workflow.matchAll(/^\s*run:\s*(npm (?:test|run [\w:-]+))\s*$/gm)]
    .map((match) => match[1]);
  const localCommands = packageJson.scripts['check:supported'].split(' && ');

  assert.deepEqual(ciCommands, localCommands);
});
