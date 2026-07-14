import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildViewModel,
  renderHtml,
  runCli,
} from '../plugins/forge/skills/architecture-view/scripts/render-architecture-view.mjs';

function writeFile(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function fixtureRoot(root = fs.mkdtempSync(path.join(os.tmpdir(), 'architecture-view-'))) {
  writeFile(root, 'docs/project.md', '# Project\n\n## 目标\n\n- demo\n');
  writeFile(root, 'docs/features/order-routing/goal.md', `# Order Routing

## 目标

- Route orders to the best fulfillment option.

## 需要细节时

- Order API and policy contract -> modules/order-api.md
- Audit behavior -> modules/audit.md
`);
  writeFile(root, 'docs/features/order-routing/modules/order-api.md', `# Order API 模块

## 责任与不变量

- 负责订单路由请求和策略选择。

## 数据模型

\`\`\`
OrderRoute: {
  id: string
  tenantId: string
}
\`\`\`

## 接口合约

\`\`\`
POST /orders/route
  Auth: Bearer JWT required
  Response: 201 Created -> OrderRoute
  Errors:
    - 400 INVALID_REQUEST_BODY
\`\`\`
`);
  return root;
}

function confirmedItems(viewModel) {
  return Object.values(viewModel.views)
    .flatMap((view) => view.items ?? [])
    .filter((entry) => entry.status === 'confirmed');
}

test('architecture-view builds a JSON view model from feature docs', () => {
  const root = fixtureRoot();
  const viewModel = buildViewModel({
    root,
    feature: 'order-routing',
    generatedAt: '2026-07-03T00:00:00.000Z',
  });

  assert.equal(viewModel.feature, 'order-routing');
  assert.equal(viewModel.schemaVersion, 1);
  assert.ok(viewModel.sources.some((source) => source.file === 'docs/features/order-routing/goal.md'));
  assert.ok(viewModel.views.modules.items.some((entry) => entry.label === 'Order API'));
  assert.ok(viewModel.views.dataModels.items.some((entry) => entry.label === 'OrderRoute'));
  assert.ok(viewModel.views.interfaces.items.some((entry) => entry.label === 'POST /orders/route'));
});

test('architecture-view generated HTML has no external http dependencies', () => {
  const root = fixtureRoot();
  const viewModel = buildViewModel({ root, feature: 'order-routing' });
  const html = renderHtml(viewModel);

  assert.match(html, /derived-view/);
  assert.match(html, /not-fact-source/);
  assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\//);
});

test('architecture-view confirmed items always include source refs', () => {
  const root = fixtureRoot();
  const viewModel = buildViewModel({ root, feature: 'order-routing' });

  for (const entry of confirmedItems(viewModel)) {
    assert.ok(entry.sourceRefs.length > 0, `${entry.id} should have a source ref`);
    assert.ok(entry.sourceRefs[0].file.startsWith('docs/'), `${entry.id} should point to docs`);
    assert.ok(Number.isInteger(entry.sourceRefs[0].line), `${entry.id} should include a line`);
  }
});

test('architecture-view marks missing goal module pointers as inferred only', () => {
  const root = fixtureRoot();
  const viewModel = buildViewModel({ root, feature: 'order-routing' });
  const inferred = viewModel.views.modules.items.find((entry) => entry.id === 'missing-module:modules/audit.md');

  assert.ok(inferred);
  assert.equal(inferred.status, 'inferred');
  assert.match(inferred.detail, /module file is missing/);
});

test('architecture-view does not invent runtime or deployment content', () => {
  const root = fixtureRoot();
  const viewModel = buildViewModel({ root, feature: 'order-routing' });

  assert.deepEqual(viewModel.views.runtime.items, []);
  assert.deepEqual(viewModel.views.deployment.items, []);
  assert.equal(viewModel.coverage.find((row) => row.id === 'runtime').status, 'not_applicable');
  assert.equal(viewModel.coverage.find((row) => row.id === 'deployment').status, 'not_applicable');
});

test('architecture-view CLI writes HTML output', () => {
  const root = fixtureRoot();
  const out = '.forge/architecture-views/order-routing/index.html';
  const written = runCli(['--root', root, '--feature', 'order-routing']);

  assert.equal(written, path.join(root, out));
  assert.ok(fs.existsSync(path.join(root, out)));
  assert.match(fs.readFileSync(path.join(root, out), 'utf8'), /Coverage Matrix/);
});

test('architecture-view rejects lexical output escapes without touching outside files', (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'architecture-view-output-'));
  const root = fixtureRoot(path.join(parent, 'project'));
  const outside = path.join(parent, 'outside.html');
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));

  fs.writeFileSync(outside, 'outside sentinel');

  for (const out of ['../outside.html', outside, 'C:outside.html', 'C:\\outside.html']) {
    assert.throws(
      () => runCli(['--root', root, '--feature', 'order-routing', '--out', out]),
      /output must stay within project root/,
    );
    assert.equal(fs.readFileSync(outside, 'utf8'), 'outside sentinel');
  }
});

test('architecture-view rejects output symlinks that escape the project', (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'architecture-view-symlink-'));
  const root = fixtureRoot(path.join(parent, 'project'));
  const outsideDir = path.join(parent, 'outside');
  const outsideFile = path.join(outsideDir, 'sentinel.html');
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));

  fs.mkdirSync(outsideDir, { recursive: true });
  fs.writeFileSync(outsideFile, 'outside sentinel');
  fs.symlinkSync(outsideDir, path.join(root, 'linked-outside'), 'dir');

  assert.throws(
    () => runCli([
      '--root', root,
      '--feature', 'order-routing',
      '--out', 'linked-outside/new.html',
    ]),
    /output must stay within project root/,
  );
  assert.equal(fs.existsSync(path.join(outsideDir, 'new.html')), false);

  const customDir = path.join(root, '.forge/custom');
  fs.mkdirSync(customDir, { recursive: true });
  fs.symlinkSync(outsideFile, path.join(customDir, 'existing-link.html'), 'file');
  fs.symlinkSync(
    path.join(outsideDir, 'missing.html'),
    path.join(customDir, 'dangling-link.html'),
    'file',
  );

  for (const out of ['.forge/custom/existing-link.html', '.forge/custom/dangling-link.html']) {
    assert.throws(
      () => runCli(['--root', root, '--feature', 'order-routing', '--out', out]),
      /output must stay within project root/,
    );
  }
  assert.equal(fs.readFileSync(outsideFile, 'utf8'), 'outside sentinel');
  assert.equal(fs.existsSync(path.join(outsideDir, 'missing.html')), false);
});

test('architecture-view preserves legal custom outputs and internal symlinks', (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'architecture-view-custom-output-'));
  const realRoot = fixtureRoot(path.join(parent, 'real-project'));
  const linkedRoot = path.join(parent, 'project-link');
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  fs.symlinkSync(realRoot, linkedRoot, 'dir');

  const normalizedOut = '.forge/custom/../custom/view.json';
  const normalizedWritten = runCli([
    '--root', linkedRoot,
    '--feature', 'order-routing',
    '--format', 'json',
    '--out', normalizedOut,
  ]);
  assert.equal(normalizedWritten, path.join(linkedRoot, '.forge/custom/view.json'));
  assert.equal(JSON.parse(fs.readFileSync(normalizedWritten, 'utf8')).feature, 'order-routing');

  const existingOut = path.join(linkedRoot, '.forge/custom/existing.html');
  fs.writeFileSync(existingOut, 'replace me');
  assert.equal(
    runCli(['--root', linkedRoot, '--feature', 'order-routing', '--out', existingOut]),
    existingOut,
  );
  assert.match(fs.readFileSync(existingOut, 'utf8'), /Coverage Matrix/);

  const canonicalOut = path.join(realRoot, '.forge/custom/canonical.html');
  assert.equal(
    runCli(['--root', linkedRoot, '--feature', 'order-routing', '--out', canonicalOut]),
    canonicalOut,
  );
  assert.match(fs.readFileSync(canonicalOut, 'utf8'), /Coverage Matrix/);

  const realOutputDir = path.join(realRoot, 'real-output');
  fs.mkdirSync(realOutputDir);
  fs.symlinkSync(realOutputDir, path.join(realRoot, 'inside-link'), 'dir');
  const internalLinkOut = 'inside-link/nested/view.html';
  assert.equal(
    runCli(['--root', realRoot, '--feature', 'order-routing', '--out', internalLinkOut]),
    path.join(realRoot, internalLinkOut),
  );
  assert.ok(fs.existsSync(path.join(realOutputDir, 'nested/view.html')));

  const internalTarget = path.join(realOutputDir, 'target.html');
  const internalFileLink = path.join(realRoot, 'inside-file-link.html');
  fs.writeFileSync(internalTarget, 'replace me through a safe link');
  fs.symlinkSync(internalTarget, internalFileLink, 'file');
  assert.equal(
    runCli(['--root', realRoot, '--feature', 'order-routing', '--out', internalFileLink]),
    internalFileLink,
  );
  assert.match(fs.readFileSync(internalTarget, 'utf8'), /Coverage Matrix/);
  assert.equal(fs.lstatSync(internalFileLink).isSymbolicLink(), true);
});

test('architecture-view rejects unsafe feature identifiers before reads or writes', (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'architecture-view-boundary-'));
  const root = path.join(parent, 'project');
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));

  writeFile(root, 'docs/project.md', '# Project\n');
  writeFile(parent, 'outside-feature/goal.md', '# Outside Feature\n');
  writeFile(root, 'docs/features/sales%Q4/goal.md', '# Safe Percent Feature\n');
  writeFile(root, 'docs/features/sales%25Q4/goal.md', '# Safe Encoded Percent Feature\n');

  assert.equal(buildViewModel({ root, feature: 'sales%Q4' }).feature, 'sales%Q4');
  assert.equal(buildViewModel({ root, feature: 'sales%25Q4' }).feature, 'sales%25Q4');

  const traversal = '../../../outside-feature';
  const invalidFeatures = [
    traversal,
    '../outside-feature',
    'nested/feature',
    'nested\\feature',
    '.',
    '..',
    path.join(parent, 'outside-feature'),
    '%2e%2e',
    'safe%2foutside',
    '%2e%2e%2foutside%Q4',
    '%252e%252e%252foutside%Q4',
    'safe%5coutside%Q4',
    'bad%00feature%Q4',
    '.%2e%Q4',
    'C:outside',
    'bad\0feature',
  ];

  for (const feature of invalidFeatures) {
    assert.throws(
      () => buildViewModel({ root, feature }),
      /feature must be a single path segment/,
      `expected ${JSON.stringify(feature)} to be rejected`,
    );
  }

  assert.throws(
    () => runCli(['--root', root, '--feature', traversal]),
    /feature must be a single path segment/,
  );
  assert.equal(fs.existsSync(path.join(parent, 'outside-feature', 'index.html')), false);
});
