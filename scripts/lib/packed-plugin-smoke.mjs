import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { findCodexBin } from './codex-bin.mjs';
import {
  loadIndependentEvidence,
  skillWasRead,
} from './evidence-collector.mjs';
import {
  comparePackageEntries,
  loadPackageAllowlist,
  npmInvocation,
  PACKAGE_FILE_ROOTS,
} from './package-contract.mjs';
import { parseFrontmatter } from './registry.mjs';

export const PACKED_SMOKE_CASE_ID = 'packed-plugin-smoke';
export const PACKED_SMOKE_MARKER = 'FORGE_THINK_SMOKE';
export const EXPECTED_SKILL_COUNTS = Object.freeze({
  public: 27,
  packaged: 28,
  implicit: 24,
});

function sha256Text(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function hashFileIfPresent(filePath) {
  return fs.existsSync(filePath) ? sha256File(filePath) : null;
}

function collectCredentialValues(value, output = []) {
  if (typeof value === 'string') {
    if (value.length >= 8) output.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectCredentialValues(item, output);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectCredentialValues(item, output);
  }
  return output;
}

export function assertNoCredentialMaterial(filePaths, sensitiveValues) {
  const needles = [...new Set(
    Array.from(sensitiveValues ?? []).filter(
      (value) => typeof value === 'string' && value.length >= 8,
    ),
  )];
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    if (needles.some((needle) => content.includes(needle))) {
      throw new Error('credential material detected in temporary invocation output; output was not retained');
    }
  }
}

function sortedUnique(values, label) {
  if (!Array.isArray(values) || !Array.from(values).every((value) => typeof value === 'string')) {
    throw new Error(`${label} must be an array of strings`);
  }
  const sorted = [...values].sort();
  if (new Set(sorted).size !== sorted.length) {
    throw new Error(`${label} contains duplicate entries`);
  }
  return sorted;
}

function assertExactSet(actual, expected, label) {
  const comparison = comparePackageEntries(actual, expected);
  if (comparison.missing.length > 0 || comparison.unexpected.length > 0) {
    const details = [
      ...comparison.missing.map((entry) => `missing: ${entry}`),
      ...comparison.unexpected.map((entry) => `unexpected: ${entry}`),
    ];
    throw new Error(`${label} mismatch\n${details.join('\n')}`);
  }
}

function realPathIfPresent(filePath) {
  return fs.existsSync(filePath) ? fs.realpathSync(filePath) : path.resolve(filePath);
}

function pathIsWithin(parent, candidate) {
  const relative = path.relative(realPathIfPresent(parent), realPathIfPresent(candidate));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function assertSafeTarEntries(entries) {
  if (!Array.isArray(entries) || !Array.from(entries).every((entry) => typeof entry === 'string')) {
    throw new Error('tar entries must be an array of paths');
  }

  const seen = new Set();
  for (const entry of entries) {
    const segments = entry.split('/');
    if (
      entry.length === 0
      || entry.includes('\\')
      || entry.includes('\0')
      || path.posix.isAbsolute(entry)
      || entry.startsWith('./')
      || !entry.startsWith('package/')
      || segments.includes('..')
      || segments.includes('')
    ) {
      throw new Error(`tar contains unsafe path: ${entry}`);
    }
    if (seen.has(entry)) {
      throw new Error(`tar contains duplicate path: ${entry}`);
    }
    seen.add(entry);
  }
  return [...entries];
}

export function assertRegularTarMembers(verboseLines, expectedCount) {
  if (!Array.isArray(verboseLines) || verboseLines.length !== expectedCount) {
    throw new Error(`tar verbose member count must equal ${expectedCount}`);
  }
  for (const line of verboseLines) {
    if (typeof line !== 'string' || !line.startsWith('-')) {
      throw new Error(`tar contains a non-regular member: ${line}`);
    }
  }
}

export function assertSafeRunId(value) {
  if (
    typeof value !== 'string'
    || value === '.'
    || value === '..'
    || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
  ) {
    throw new Error(`unsafe smoke run id: ${value}`);
  }
  return value;
}

export function resolveGuardCodexHome(env, override = null) {
  if (override) return path.resolve(override);
  if (env.CODEX_HOME) return path.resolve(env.CODEX_HOME);
  if (env.HOME) return path.resolve(env.HOME, '.codex');
  return path.resolve(os.homedir(), '.codex');
}

function pluginRootFromPackageRoot(packageRoot) {
  const nested = path.join(packageRoot, 'plugins', 'forge');
  return fs.existsSync(nested) ? nested : packageRoot;
}

function manifestSkillName(entry) {
  if (typeof entry !== 'string' || !/^\.\/skills\/[a-z0-9][a-z0-9-]*$/.test(entry)) {
    throw new Error(`invalid public skill entry: ${entry}`);
  }
  return entry.slice('./skills/'.length);
}

export function collectPluginInventory(packageRoot) {
  const pluginRoot = pluginRootFromPackageRoot(packageRoot);
  const skillsRoot = path.join(pluginRoot, 'skills');
  const manifestPath = path.join(pluginRoot, '.claude-plugin', 'plugin.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const publicNames = sortedUnique(
    Array.from(manifest.skills ?? []).map(manifestSkillName),
    'public skill manifest',
  );

  const packagedNames = sortedUnique(
    fs.readdirSync(skillsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) => fs.existsSync(path.join(skillsRoot, entry.name, 'SKILL.md')))
      .map((entry) => entry.name),
    'packaged skills',
  );

  const registryNames = [];
  const implicitNames = [];
  for (const name of packagedNames) {
    const skillPath = path.join(skillsRoot, name, 'SKILL.md');
    const frontmatter = parseFrontmatter(fs.readFileSync(skillPath, 'utf8'));
    if (!frontmatter || frontmatter.name !== name) {
      throw new Error(`invalid SKILL.md frontmatter for ${name}`);
    }
    if (name !== 'shared') registryNames.push(name);
    if (frontmatter['disable-model-invocation'] !== true) implicitNames.push(name);
  }

  assertExactSet(registryNames, publicNames, 'registry and public manifest');
  return {
    pluginRoot: realPathIfPresent(pluginRoot),
    public: publicNames,
    packaged: packagedNames,
    implicit: implicitNames.sort(),
  };
}

export function extractPromptForgeSkills(promptInput) {
  if (!Array.isArray(promptInput)) {
    throw new Error('prompt input must be a JSON array');
  }

  const entries = [];
  for (const message of promptInput) {
    for (const content of Array.from(message?.content ?? [])) {
      if (content?.type !== 'input_text' || typeof content.text !== 'string') continue;
      for (const line of content.text.split(/\r?\n/)) {
        const match = line.match(/^- forge:([a-z0-9][a-z0-9-]*):.*\(file: (.+\/skills\/\1\/SKILL\.md)\)$/);
        if (match) entries.push({ name: match[1], file: match[2] });
      }
    }
  }

  entries.sort((left, right) => left.name.localeCompare(right.name));
  sortedUnique(entries.map((entry) => entry.name), 'model-visible Forge skills');
  return entries;
}

function shellUnwrap(command) {
  if (typeof command !== 'string') return '';
  const match = command.match(
    /^\s*(?:\S*\/(?:zsh|sh|bash|fish)|zsh|sh|bash|fish)\s+-l?c\s+(["'])([\s\S]*)\1\s*$/,
  );
  return match ? match[2].trim() : command.trim();
}

function standaloneCatReadsExpectedPath(command, expectedPaths) {
  const inner = shellUnwrap(command);
  return expectedPaths.some((expectedPath) => {
    const pathForms = [expectedPath, `'${expectedPath}'`, `"${expectedPath}"`];
    const verbs = ['cat', '/bin/cat', '/usr/bin/cat'];
    return verbs.some((verb) => pathForms.some((pathForm) => (
      inner === `${verb} ${pathForm}` || inner === `${verb} -- ${pathForm}`
    )));
  });
}

export function assertInvocationEvidence({
  runDir,
  caseId = PACKED_SMOKE_CASE_ID,
  installedSkillPath,
  marker = PACKED_SMOKE_MARKER,
  lastMessagePath,
}) {
  const evidence = loadIndependentEvidence(runDir, caseId);
  const credentialCommand = evidence.commands.find((entry) => (
    /(?:auth\.json|CODEX_AUTH_FILE|OPENAI_API_KEY)/.test(entry.command)
  ));
  if (credentialCommand) {
    throw new Error('invocation attempted to access credential material');
  }
  const skillMatch = installedSkillPath.match(/skills\/([^/]+)\/SKILL\.md$/);
  const skill = skillMatch?.[1];
  if (!skill || !evidence.available || !skillWasRead(evidence, skill)) {
    throw new Error('invocation evidence does not contain a real read of the requested skill');
  }

  const installedRealPath = realPathIfPresent(installedSkillPath);
  const expectedPaths = sortedUnique(
    installedRealPath === installedSkillPath
      ? [installedSkillPath]
      : [installedSkillPath, installedRealPath],
    'installed skill paths',
  );
  const installedSkillBody = fs.readFileSync(installedSkillPath, 'utf8');
  const pathReadCommands = evidence.commands.filter((entry) => (
    entry.exitCode === 0
    && typeof entry.stdout === 'string'
    && entry.stdout.length > 0
    && standaloneCatReadsExpectedPath(entry.command, expectedPaths)
  ));
  if (pathReadCommands.length === 0) {
    throw new Error('invocation evidence does not contain a standalone cat read from the installed cache path');
  }
  const readCommand = pathReadCommands.find((entry) => entry.stdout.includes(installedSkillBody));
  if (!readCommand) {
    throw new Error('invocation read output does not contain the installed skill content');
  }
  if (evidence.filesChanged.length > 0 || evidence.workspaceFiles.length > 0) {
    throw new Error('read-only invocation changed files');
  }

  const finalText = fs.readFileSync(lastMessagePath, 'utf8').trim();
  if (!finalText.endsWith(marker)) {
    throw new Error(`invocation final message must end with ${marker}`);
  }

  return {
    skill,
    installedSkillPath: installedRealPath,
    installedSkillSha256: sha256Text(installedSkillBody),
    readCommandSha256: sha256Text(readCommand.command),
    marker,
    credentialPathAccesses: 0,
    filesChanged: evidence.filesChanged.length,
    workspaceFiles: evidence.workspaceFiles.length,
  };
}

function run(command, args, options = {}) {
  let stdoutFd = null;
  let stderrFd = null;
  let result;
  try {
    if (options.stdoutPath) {
      stdoutFd = fs.openSync(options.stdoutPath, 'w');
      stderrFd = fs.openSync(options.stderrPath, 'w');
    }
    result = spawnSync(command, args, {
      cwd: options.cwd,
      env: options.env,
      encoding: options.stdoutPath ? undefined : 'utf8',
      stdio: options.stdoutPath ? ['ignore', stdoutFd, stderrFd] : 'pipe',
      timeout: options.timeout ?? 2 * 60 * 1000,
    });
  } finally {
    if (stdoutFd !== null) fs.closeSync(stdoutFd);
    if (stderrFd !== null) fs.closeSync(stderrFd);
  }

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = !options.stdoutPath && options.stderrPath && fs.existsSync(options.stderrPath)
      ? fs.readFileSync(options.stderrPath, 'utf8')
      : options.stdoutPath
        ? ''
        : result.stderr;
    throw new Error(`${path.basename(command)} ${args[0] ?? ''} exited ${result.status}: ${(stderr ?? '').trim().slice(0, 1000)}`);
  }
  return result;
}

function runCaptured(command, args, options = {}) {
  return run(command, args, options).stdout.trim();
}

function parseSinglePackReport(stdout) {
  let reports;
  try {
    reports = JSON.parse(stdout);
  } catch (error) {
    throw new Error(`npm pack did not return JSON: ${error.message}`);
  }
  if (!Array.isArray(reports) || reports.length !== 1 || !Array.isArray(reports[0].files)) {
    throw new Error('npm pack returned an unexpected report shape');
  }
  return reports[0];
}

function runActualPack(root, destination, env) {
  const { command, prefixArgs } = npmInvocation(env);
  const stdout = runCaptured(command, [
    ...prefixArgs,
    'pack',
    '--json',
    '--ignore-scripts',
    '--pack-destination',
    destination,
  ], { cwd: root, env });
  return parseSinglePackReport(stdout);
}

function parseJsonCommand(command, args, options) {
  const stdout = runCaptured(command, args, options);
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${path.basename(command)} did not return JSON: ${error.message}`);
  }
}

function assertCurrentSkillCounts(inventory) {
  for (const [kind, expected] of Object.entries(EXPECTED_SKILL_COUNTS)) {
    if (inventory[kind].length !== expected) {
      throw new Error(`expected ${expected} ${kind} skills, found ${inventory[kind].length}`);
    }
  }
}

function validateInstalledPlugin(pluginList, installResult, expectedVersion) {
  const installed = Array.from(pluginList?.installed ?? []);
  if (
    installResult?.pluginId !== 'forge@forge'
    || installResult?.name !== 'forge'
    || installResult?.marketplaceName !== 'forge'
    || installResult?.version !== expectedVersion
    || installed.length !== 1
    || installed[0]?.pluginId !== 'forge@forge'
    || installed[0]?.version !== expectedVersion
    || installed[0]?.enabled !== true
  ) {
    throw new Error('installed plugin identity, version, or enabled state is incorrect');
  }
}

function ensureAuth(isolatedCodexHome, authFrom, env) {
  if (authFrom) {
    const source = path.resolve(authFrom);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
      throw new Error('--auth-from must reference an existing auth file');
    }
    let authDocument;
    try {
      authDocument = JSON.parse(fs.readFileSync(source, 'utf8'));
    } catch {
      throw new Error('--auth-from must contain valid JSON');
    }
    const sensitiveValues = collectCredentialValues(authDocument);
    if (sensitiveValues.length === 0) {
      throw new Error('--auth-from contains no credential values that can be checked');
    }
    const destination = path.join(isolatedCodexHome, 'auth.json');
    fs.copyFileSync(source, destination);
    fs.chmodSync(destination, 0o600);
    return {
      mode: 'temporary-auth-file',
      path: destination,
      sensitiveValues,
    };
  }
  if (env.OPENAI_API_KEY) {
    return { mode: 'OPENAI_API_KEY', path: null, sensitiveValues: [env.OPENAI_API_KEY] };
  }
  throw new Error('model authentication unavailable; pass --auth-from or set OPENAI_API_KEY');
}

function defaultRunId() {
  return `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function runPackedPluginSmoke(root, options = {}) {
  const env = options.env ?? process.env;
  const codexBin = options.codexBin ?? findCodexBin();
  if (!codexBin || !fs.existsSync(codexBin)) {
    throw new Error('Codex CLI not found. Set CODEX_BIN or pass --codex-bin.');
  }

  const runId = assertSafeRunId(options.runId ?? defaultRunId());
  const runDir = path.resolve(options.runDir ?? path.join(root, '.eval-runs', 'release-baseline', runId));
  const artifactDir = path.join(runDir, 'artifacts');
  const caseId = PACKED_SMOKE_CASE_ID;
  const workspaceDir = path.join(runDir, 'workspaces', caseId);
  const eventsPath = path.join(runDir, `${caseId}.events.jsonl`);
  const lastMessagePath = path.join(runDir, `${caseId}.last.txt`);
  const stderrPath = path.join(runDir, `${caseId}.stderr.log`);
  const promptInputPath = path.join(runDir, 'prompt-input.json');
  const pluginListPath = path.join(runDir, 'plugin-list.json');
  const receiptPath = path.join(runDir, 'receipt.json');
  if (fs.existsSync(runDir) && fs.readdirSync(runDir).length > 0) {
    throw new Error(`smoke evidence directory already contains files: ${runDir}`);
  }
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.mkdirSync(workspaceDir, { recursive: true });

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-packed-smoke-'));
  fs.chmodSync(tempRoot, 0o700);
  const isolatedHome = path.join(tempRoot, 'home');
  const isolatedCodexHome = path.join(tempRoot, 'codex');
  const extractDir = path.join(tempRoot, 'extract');
  const invocationRunDir = path.join(tempRoot, 'invocation-evidence');
  const invocationWorkspaceDir = path.join(invocationRunDir, 'workspaces', caseId);
  const temporaryEventsPath = path.join(invocationRunDir, `${caseId}.events.jsonl`);
  const temporaryLastMessagePath = path.join(invocationRunDir, `${caseId}.last.txt`);
  const temporaryStderrPath = path.join(invocationRunDir, `${caseId}.stderr.log`);
  fs.mkdirSync(isolatedHome, { recursive: true });
  fs.mkdirSync(isolatedCodexHome, { recursive: true });
  fs.mkdirSync(extractDir, { recursive: true });
  fs.mkdirSync(invocationWorkspaceDir, { recursive: true });

  const guardedCodexHome = resolveGuardCodexHome(env, options.guardCodexHome);
  const guardedConfigPath = path.join(guardedCodexHome, 'config.toml');
  const guardedConfigPresentBefore = fs.existsSync(guardedConfigPath);
  const guardedConfigBefore = hashFileIfPresent(guardedConfigPath);
  const guardedAuthPath = options.authFrom ? path.resolve(options.authFrom) : null;
  const guardedAuthBefore = guardedAuthPath ? hashFileIfPresent(guardedAuthPath) : null;
  const allowlistPath = path.join(root, 'scripts', 'package-files.allowlist.json');
  const prompt = [
    'Use $forge:think. Read its SKILL.md completely.',
    'For that SKILL.md read, run one standalone cat command against the installed skills/think/SKILL.md path; do not combine that command with pipes or shell control operators.',
    'Analyze whether a one-line typo patch needs a new architecture abstraction.',
    'Do not modify any files.',
    `End with the exact marker ${PACKED_SMOKE_MARKER}.`,
  ].join(' ');

  let auth = null;
  let packageReceipt = null;
  let discoveryReceipt = null;
  let invocationReceipt = null;
  let failure = null;
  let cleanupComplete = false;
  let cleanupFailure = null;
  let credentialOutputScanPassed = false;

  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    if (JSON.stringify(packageJson.files) !== JSON.stringify(PACKAGE_FILE_ROOTS)) {
      throw new Error(`package.json#files must equal ${JSON.stringify(PACKAGE_FILE_ROOTS)}`);
    }

    const allowlist = loadPackageAllowlist(root);
    const packReport = runActualPack(root, artifactDir, env);
    if (
      typeof packReport.filename !== 'string'
      || packReport.filename.includes('\\')
      || path.posix.basename(packReport.filename) !== packReport.filename
      || !packReport.filename.endsWith('.tgz')
    ) {
      throw new Error(`npm pack returned an unsafe filename: ${packReport.filename}`);
    }
    const packageComparison = comparePackageEntries(
      packReport.files.map((entry) => entry.path),
      allowlist,
    );
    if (packageComparison.missing.length > 0 || packageComparison.unexpected.length > 0) {
      throw new Error('actual npm package does not match the file allowlist');
    }

    const tarballPath = path.join(artifactDir, packReport.filename);
    const tarEntries = assertSafeTarEntries(
      runCaptured('tar', ['-tzf', tarballPath], { cwd: root, env })
        .split(/\r?\n/)
        .filter(Boolean),
    );
    const verboseTarEntries = runCaptured('tar', ['-tvzf', tarballPath], { cwd: root, env })
      .split(/\r?\n/)
      .filter(Boolean);
    assertRegularTarMembers(verboseTarEntries, tarEntries.length);
    assertExactSet(
      tarEntries.map((entry) => entry.slice('package/'.length)),
      allowlist,
      'tar members and package allowlist',
    );
    fs.writeFileSync(path.join(runDir, 'tar-members.txt'), `${tarEntries.join('\n')}\n`);
    writeJson(path.join(runDir, 'pack-report.json'), packReport);

    run('tar', ['-xzf', tarballPath, '-C', extractDir], { cwd: root, env });
    const extractedRoot = path.join(extractDir, 'package');
    const sourceInventory = collectPluginInventory(extractedRoot);
    assertCurrentSkillCounts(sourceInventory);
    packageReceipt = {
      id: packReport.id,
      version: packReport.version,
      filename: packReport.filename,
      sha256: sha256File(tarballPath),
      shasum: packReport.shasum,
      integrity: packReport.integrity,
      size: packReport.size,
      unpackedSize: packReport.unpackedSize,
      fileCount: packReport.files.length,
      allowlistCount: allowlist.length,
      allowlistSha256: sha256File(allowlistPath),
      missing: packageComparison.missing,
      unexpected: packageComparison.unexpected,
    };

    auth = ensureAuth(isolatedCodexHome, options.authFrom, env);
    const isolatedEnv = {
      ...env,
      HOME: isolatedHome,
      CODEX_HOME: isolatedCodexHome,
    };
    const marketplaceResult = parseJsonCommand(
      codexBin,
      ['plugin', 'marketplace', 'add', extractedRoot, '--json'],
      { cwd: root, env: isolatedEnv },
    );
    if (marketplaceResult?.marketplaceName !== 'forge') {
      throw new Error('installed marketplace identity is incorrect');
    }
    const installResult = parseJsonCommand(
      codexBin,
      ['plugin', 'add', 'forge@forge', '--json'],
      { cwd: root, env: isolatedEnv },
    );
    const pluginList = parseJsonCommand(
      codexBin,
      ['plugin', 'list', '--json'],
      { cwd: root, env: isolatedEnv },
    );
    writeJson(pluginListPath, pluginList);
    validateInstalledPlugin(pluginList, installResult, packReport.version);

    const installedRoot = realPathIfPresent(installResult.installedPath);
    const cacheRoot = path.join(isolatedCodexHome, 'plugins', 'cache');
    if (!pathIsWithin(cacheRoot, installedRoot)) {
      throw new Error('installed plugin escaped the isolated Codex cache');
    }
    const installedInventory = collectPluginInventory(installedRoot);
    for (const kind of Object.keys(EXPECTED_SKILL_COUNTS)) {
      assertExactSet(installedInventory[kind], sourceInventory[kind], `installed ${kind} skills`);
    }

    const promptInput = parseJsonCommand(
      codexBin,
      ['debug', 'prompt-input', 'packed plugin discovery smoke'],
      { cwd: root, env: isolatedEnv },
    );
    writeJson(promptInputPath, promptInput);
    const visibleSkills = extractPromptForgeSkills(promptInput);
    assertExactSet(
      visibleSkills.map((entry) => entry.name),
      sourceInventory.implicit,
      'model-visible Forge skills',
    );
    for (const entry of visibleSkills) {
      if (!pathIsWithin(installedRoot, entry.file)) {
        throw new Error(`model-visible skill escaped the installed cache: ${entry.name}`);
      }
    }

    discoveryReceipt = {
      marketplaceName: marketplaceResult.marketplaceName,
      pluginId: installResult.pluginId,
      version: installResult.version,
      installedRoot,
      isolatedCodexHome: realPathIfPresent(isolatedCodexHome),
      publicSkills: sourceInventory.public,
      packagedSkills: sourceInventory.packaged,
      implicitSkills: visibleSkills.map((entry) => entry.name),
      counts: {
        public: sourceInventory.public.length,
        packaged: sourceInventory.packaged.length,
        implicit: visibleSkills.length,
      },
      missing: [],
      extra: [],
    };

    run(codexBin, [
      '-a',
      'never',
      'exec',
      '--json',
      '--ephemeral',
      '--ignore-rules',
      '--skip-git-repo-check',
      '-s',
      'read-only',
      '-C',
      invocationWorkspaceDir,
      '--output-last-message',
      temporaryLastMessagePath,
      prompt,
    ], {
      cwd: root,
      env: isolatedEnv,
      stdoutPath: temporaryEventsPath,
      stderrPath: temporaryStderrPath,
      timeout: options.timeout ?? 10 * 60 * 1000,
    });
    assertNoCredentialMaterial(
      [temporaryEventsPath, temporaryLastMessagePath, temporaryStderrPath],
      auth.sensitiveValues,
    );
    credentialOutputScanPassed = true;
    const installedSkillPath = path.join(installedRoot, 'skills', 'think', 'SKILL.md');
    invocationReceipt = {
      ...assertInvocationEvidence({
        runDir: invocationRunDir,
        caseId,
        installedSkillPath,
        marker: PACKED_SMOKE_MARKER,
        lastMessagePath: temporaryLastMessagePath,
      }),
      promptSha256: sha256Text(prompt),
      eventsSha256: sha256File(temporaryEventsPath),
      lastMessageSha256: sha256File(temporaryLastMessagePath),
      sandbox: 'read-only',
      ephemeral: true,
    };
    fs.copyFileSync(temporaryEventsPath, eventsPath);
    fs.copyFileSync(temporaryLastMessagePath, lastMessagePath);
    fs.copyFileSync(temporaryStderrPath, stderrPath);
  } catch (error) {
    failure = error;
  } finally {
    try {
      if (auth?.path && fs.existsSync(auth.path)) fs.rmSync(auth.path, { force: true });
    } catch {
      cleanupFailure = new Error('temporary smoke directory cleanup failed');
    }
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch {
      cleanupFailure = new Error('temporary smoke directory cleanup failed');
    }
    cleanupComplete = !fs.existsSync(tempRoot);
  }

  const guardedConfigPresentAfter = fs.existsSync(guardedConfigPath);
  const guardedConfigAfter = hashFileIfPresent(guardedConfigPath);
  const guardedAuthAfter = guardedAuthPath ? hashFileIfPresent(guardedAuthPath) : null;
  if (!failure && guardedConfigBefore !== guardedConfigAfter) {
    failure = new Error('guarded Codex config changed during isolated smoke');
  }
  if (!failure && guardedAuthBefore !== guardedAuthAfter) {
    failure = new Error('authentication source changed during isolated smoke');
  }
  if (!failure && cleanupFailure) failure = cleanupFailure;

  const codexVersion = runCaptured(codexBin, ['--version'], { cwd: root, env }).trim();
  const receipt = {
    schemaVersion: 1,
    status: failure ? 'failed' : 'passed',
    runId,
    generatedAt: new Date().toISOString(),
    package: packageReceipt,
    discovery: discoveryReceipt,
    invocation: invocationReceipt,
    environment: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      codex: codexVersion,
      authMode: auth?.mode ?? null,
    },
    isolation: {
      temporaryHome: true,
      temporaryCodexHome: true,
      temporaryRootMode: '0700',
      defaultConfigGuarded: true,
      defaultConfigPresentBefore: guardedConfigPresentBefore,
      defaultConfigPresentAfter: guardedConfigPresentAfter,
      defaultConfigBeforeSha256: guardedConfigBefore,
      defaultConfigAfterSha256: guardedConfigAfter,
      defaultConfigUnchanged: guardedConfigBefore === guardedConfigAfter,
      authSourceUnchanged: guardedAuthBefore === guardedAuthAfter,
      credentialOutputScanPassed,
      cleanupComplete,
    },
    artifacts: {
      runDir,
      events: fs.existsSync(eventsPath) ? path.basename(eventsPath) : null,
      lastMessage: fs.existsSync(lastMessagePath) ? path.basename(lastMessagePath) : null,
      stderr: fs.existsSync(stderrPath) ? path.basename(stderrPath) : null,
      promptInput: path.basename(promptInputPath),
      pluginList: path.basename(pluginListPath),
      tarball: packageReceipt?.filename ?? null,
      packReport: 'pack-report.json',
      tarMembers: 'tar-members.txt',
      receipt: path.basename(receiptPath),
    },
    ...(failure ? { error: failure.message } : {}),
  };
  writeJson(receiptPath, receipt);

  if (failure) {
    throw new Error(`${failure.message}\nsmoke receipt: ${receiptPath}`);
  }
  return receipt;
}
