import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export const PACKAGE_FILE_ROOTS = [
  '.agents/plugins/marketplace.json',
  '.claude-plugin/marketplace.json',
  'marketplace.json',
  'plugins/forge',
];

function normalizedEntries(entries, label) {
  if (!Array.isArray(entries) || !Array.from(entries).every((entry) => typeof entry === 'string')) {
    throw new Error(`${label} must be an array of paths`);
  }

  const normalized = Array.from(entries, (entry) => entry.replaceAll('\\', '/'));
  for (const entry of normalized) {
    const segments = entry.split('/');
    if (
      entry.length === 0 ||
      path.posix.isAbsolute(entry) ||
      entry.startsWith('./') ||
      segments.includes('..')
    ) {
      throw new Error(`${label} contains unsafe path: ${entry}`);
    }
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`${label} contains duplicate paths`);
  }
  return normalized.sort();
}

export function comparePackageEntries(actualEntries, allowedEntries) {
  const actual = normalizedEntries(actualEntries, 'actual package entries');
  const allowed = normalizedEntries(allowedEntries, 'package allowlist');
  const actualSet = new Set(actual);
  const allowedSet = new Set(allowed);

  return {
    missing: allowed.filter((entry) => !actualSet.has(entry)),
    unexpected: actual.filter((entry) => !allowedSet.has(entry)),
  };
}

export function loadPackageAllowlist(root) {
  const allowlistPath = path.join(root, 'scripts/package-files.allowlist.json');
  const contract = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  if (contract.version !== 1) {
    throw new Error('package allowlist version must be 1');
  }
  return normalizedEntries(contract.files, 'package allowlist');
}

function readmeReferences(markdown) {
  const references = [];
  for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) references.push(match[1]);
  for (const match of markdown.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) references.push(match[1]);
  return references;
}

export function findUnpackagedReadmeTargets(root) {
  const allowlist = new Set(loadPackageAllowlist(root));
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const missing = [];

  for (const rawReference of readmeReferences(readme)) {
    const reference = rawReference.trim().replace(/^<|>$/g, '').split(/\s+/)[0];
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(reference)) continue;
    const pathOnly = reference.split(/[?#]/)[0];
    let decoded;
    try {
      decoded = decodeURIComponent(pathOnly);
    } catch {
      decoded = pathOnly;
    }
    const target = path.posix.normalize(decoded.replaceAll('\\', '/')).replace(/^\.\//, '');
    if (
      target.length === 0
      || target === '..'
      || target.startsWith('../')
      || path.posix.isAbsolute(target)
      || !allowlist.has(target)
    ) {
      missing.push({ reference, target });
    }
  }
  return missing.sort((left, right) => left.reference.localeCompare(right.reference));
}

export function npmInvocation(env) {
  if (env.npm_execpath) {
    return { command: process.execPath, prefixArgs: [env.npm_execpath] };
  }
  return { command: env.NPM_BIN || 'npm', prefixArgs: [] };
}

export function readNpmPackReport(root, options = {}) {
  const env = options.env ?? process.env;
  const spawn = options.spawn ?? spawnSync;
  const { command, prefixArgs } = npmInvocation(env);
  const result = spawn(command, [
    ...prefixArgs,
    'pack',
    '--dry-run',
    '--json',
    '--ignore-scripts',
  ], {
    cwd: root,
    encoding: 'utf8',
    env,
  });

  if (result.error) {
    throw new Error(`npm pack dry-run failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = typeof result.stderr === 'string' && result.stderr.length > 0
      ? result.stderr
      : typeof result.stdout === 'string'
        ? result.stdout
        : `exit ${result.status}`;
    throw new Error(`npm pack dry-run failed: ${detail.trim()}`);
  }

  let reports;
  try {
    reports = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`npm pack did not return JSON: ${error.message}`);
  }
  if (!Array.isArray(reports) || reports.length !== 1 || !Array.isArray(reports[0].files)) {
    throw new Error('npm pack returned an unexpected report shape');
  }
  return reports[0];
}

export function inspectPackageContents(root, options = {}) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (JSON.stringify(packageJson.files) !== JSON.stringify(PACKAGE_FILE_ROOTS)) {
    throw new Error(`package.json#files must equal ${JSON.stringify(PACKAGE_FILE_ROOTS)}`);
  }

  const allowlist = loadPackageAllowlist(root);
  const report = readNpmPackReport(root, options);
  const actual = report.files.map((entry) => entry.path);
  const comparison = comparePackageEntries(actual, allowlist);
  const unpackedReadmeTargets = findUnpackagedReadmeTargets(root);

  return {
    id: report.id,
    version: report.version,
    filename: report.filename,
    size: report.size,
    unpackedSize: report.unpackedSize,
    shasum: report.shasum,
    integrity: report.integrity,
    fileCount: actual.length,
    allowlistCount: allowlist.length,
    unpackedReadmeTargets,
    ...comparison,
  };
}

export function assertPackageContents(root, options = {}) {
  const receipt = inspectPackageContents(root, options);
  if (
    receipt.missing.length > 0
    || receipt.unexpected.length > 0
    || receipt.unpackedReadmeTargets.length > 0
  ) {
    const details = [
      ...receipt.missing.map((entry) => `missing: ${entry}`),
      ...receipt.unexpected.map((entry) => `unexpected: ${entry}`),
      ...receipt.unpackedReadmeTargets.map(
        ({ reference, target }) => `README target excluded: ${reference} -> ${target}`,
      ),
    ];
    throw new Error(`package contents do not match allowlist\n${details.join('\n')}`);
  }
  return receipt;
}
