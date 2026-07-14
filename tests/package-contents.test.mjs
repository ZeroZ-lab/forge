import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assertPackageContents,
  comparePackageEntries,
  findUnpackagedReadmeTargets,
  PACKAGE_FILE_ROOTS,
} from '../scripts/lib/package-contract.mjs';

const root = path.resolve(import.meta.dirname, '..');

test('published npm package exactly matches the explicit file allowlist', () => {
  const receipt = assertPackageContents(root);

  assert.equal(receipt.fileCount, receipt.allowlistCount);
  assert.deepEqual(receipt.missing, []);
  assert.deepEqual(receipt.unexpected, []);
  assert.ok(receipt.fileCount > PACKAGE_FILE_ROOTS.length);
  assert.deepEqual(receipt.unpackedReadmeTargets, []);
});

test('published README does not point at files excluded from the package', () => {
  assert.deepEqual(findUnpackagedReadmeTargets(root), []);
});

test('README package check reports a relative target omitted from the allowlist', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-readme-package-'));
  fs.mkdirSync(path.join(fixtureRoot, 'scripts'), { recursive: true });
  fs.writeFileSync(
    path.join(fixtureRoot, 'scripts/package-files.allowlist.json'),
    `${JSON.stringify({ version: 1, files: ['README.md'] })}\n`,
  );
  fs.writeFileSync(path.join(fixtureRoot, 'README.md'), '[Missing](docs/missing.md)\n');
  try {
    assert.deepEqual(findUnpackagedReadmeTargets(fixtureRoot), [{
      reference: 'docs/missing.md',
      target: 'docs/missing.md',
    }]);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('package comparison fails closed for missing, unexpected, and unsafe paths', () => {
  assert.deepEqual(comparePackageEntries(['b.md', 'a.md'], ['a.md', 'b.md']), {
    missing: [],
    unexpected: [],
  });
  assert.deepEqual(comparePackageEntries(['a.md', 'private.env'], ['a.md', 'b.md']), {
    missing: ['b.md'],
    unexpected: ['private.env'],
  });
  assert.throws(
    () => comparePackageEntries(['../secret'], ['a.md']),
    /unsafe path/,
  );
  assert.throws(
    () => comparePackageEntries(['a.md', 'a.md'], ['a.md']),
    /duplicate paths/,
  );
  const sparse = [];
  sparse.length = 1;
  assert.throws(
    () => comparePackageEntries(sparse, ['a.md']),
    /array of paths/,
  );
});
