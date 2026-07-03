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

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'architecture-view-'));
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
  const written = runCli(['--root', root, '--feature', 'order-routing', '--out', out]);

  assert.equal(written, path.join(root, out));
  assert.ok(fs.existsSync(path.join(root, out)));
  assert.match(fs.readFileSync(path.join(root, out), 'utf8'), /Coverage Matrix/);
});
