import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assertInvocationEvidence,
  assertNoCredentialMaterial,
  assertRegularTarMembers,
  assertSafeRunId,
  assertSafeTarEntries,
  collectPluginInventory,
  extractPromptForgeSkills,
  resolveGuardCodexHome,
} from '../scripts/lib/packed-plugin-smoke.mjs';

const root = path.resolve(import.meta.dirname, '..');

test('tar extraction accepts only unique package-relative members', () => {
  assert.deepEqual(assertSafeTarEntries([
    'package/package.json',
    'package/plugins/forge/skills/think/SKILL.md',
  ]), [
    'package/package.json',
    'package/plugins/forge/skills/think/SKILL.md',
  ]);

  for (const unsafe of [
    ['/absolute'],
    ['../secret'],
    ['package/../../secret'],
    ['other/file'],
    ['package\\..\\secret'],
    ['package/file', 'package/file'],
  ]) {
    assert.throws(() => assertSafeTarEntries(unsafe), /unsafe|duplicate/);
  }
});

test('tar extraction rejects links even when their member path looks safe', () => {
  assert.doesNotThrow(() => assertRegularTarMembers([
    '-rw-r--r--  0 owner group 10 Jan 01 00:00 package/package.json',
    '-rw-r--r--  0 owner group 20 Jan 01 00:00 package/README.md',
  ], 2));
  assert.throws(() => assertRegularTarMembers([
    'lrwxr-xr-x  0 owner group  0 Jan 01 00:00 package/link -> ../../secret',
  ], 1), /non-regular/);
  assert.throws(() => assertRegularTarMembers([], 1), /count/);
});

test('run identifiers cannot escape or alias the evidence directory', () => {
  assert.equal(assertSafeRunId('a08-20260714_1351.1'), 'a08-20260714_1351.1');
  for (const unsafe of ['', '.', '..', '../escape', 'nested/run', 'name with spaces']) {
    assert.throws(() => assertSafeRunId(unsafe), /run id/);
  }
});

test('default Codex home is guarded even when authentication uses an API key', () => {
  assert.equal(
    resolveGuardCodexHome({ HOME: '/tmp/user' }),
    path.resolve('/tmp/user/.codex'),
  );
  assert.equal(
    resolveGuardCodexHome({ HOME: '/tmp/user', CODEX_HOME: '/tmp/custom-codex' }),
    path.resolve('/tmp/custom-codex'),
  );
  assert.equal(
    resolveGuardCodexHome({ HOME: '/tmp/user' }, '/tmp/guarded'),
    path.resolve('/tmp/guarded'),
  );
});

test('invocation output is retained only when it contains no credential values', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-smoke-secret-scan-'));
  const outputPath = path.join(outputDir, 'events.jsonl');
  const secret = 'test-secret-value-123456789';
  try {
    fs.writeFileSync(outputPath, 'safe event output\n');
    assert.doesNotThrow(() => assertNoCredentialMaterial([outputPath], [secret]));

    fs.writeFileSync(outputPath, `unsafe ${secret} output\n`);
    assert.throws(
      () => assertNoCredentialMaterial([outputPath], [secret]),
      (error) => /credential material/.test(error.message) && !error.message.includes(secret),
    );
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});

test('plugin inventory distinguishes public, packaged, and implicit skills', () => {
  const inventory = collectPluginInventory(root);

  assert.equal(inventory.public.length, 27);
  assert.equal(inventory.packaged.length, 28);
  assert.equal(inventory.implicit.length, 24);
  assert.ok(inventory.public.includes('think'));
  assert.ok(inventory.packaged.includes('shared'));
  assert.ok(!inventory.implicit.includes('shared'));
  assert.ok(!inventory.implicit.includes('guide'));
});

test('prompt inventory extracts Forge skill names and installed paths', () => {
  const promptInput = [
    {
      type: 'message',
      role: 'developer',
      content: [{
        type: 'input_text',
        text: [
          '### Available skills',
          '- forge:codegen: Implements code. (file: /tmp/codex/plugins/cache/forge/forge/0.52.0/skills/codegen/SKILL.md)',
          '- forge:think: Thinks deeply. (file: /tmp/codex/plugins/cache/forge/forge/0.52.0/skills/think/SKILL.md)',
          '- unrelated: Ignore. (file: /tmp/unrelated/SKILL.md)',
        ].join('\n'),
      }],
    },
  ];

  assert.deepEqual(extractPromptForgeSkills(promptInput), [
    {
      name: 'codegen',
      file: '/tmp/codex/plugins/cache/forge/forge/0.52.0/skills/codegen/SKILL.md',
    },
    {
      name: 'think',
      file: '/tmp/codex/plugins/cache/forge/forge/0.52.0/skills/think/SKILL.md',
    },
  ]);
});

test('invocation evidence requires a real installed SKILL read, marker, and no writes', () => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-smoke-evidence-'));
  const caseId = 'packed-plugin-smoke';
  const installedSkill = path.join(
    runDir,
    'codex/plugins/cache/forge/forge/0.52.0/skills/think/SKILL.md',
  );
  const installedSkillBody = '# Think\nreal body\n';
  const eventsPath = path.join(runDir, `${caseId}.events.jsonl`);
  const lastMessagePath = path.join(runDir, `${caseId}.last.txt`);
  fs.mkdirSync(path.join(runDir, 'workspaces', caseId), { recursive: true });
  fs.mkdirSync(path.dirname(installedSkill), { recursive: true });
  fs.writeFileSync(installedSkill, installedSkillBody);

  const events = [
    {
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command: `echo ${installedSkill}`,
        exit_code: 0,
        status: 'completed',
        aggregated_output: installedSkill,
      },
    },
    {
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command: `cat ${installedSkill}`,
        exit_code: 0,
        status: 'completed',
        aggregated_output: installedSkillBody,
      },
    },
    {
      type: 'item.completed',
      item: {
        type: 'agent_message',
        text: 'Analysis complete\nFORGE_THINK_SMOKE',
      },
    },
  ];
  fs.writeFileSync(eventsPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
  fs.writeFileSync(lastMessagePath, 'Analysis complete\nFORGE_THINK_SMOKE\n');

  try {
    const receipt = assertInvocationEvidence({
      runDir,
      caseId,
      installedSkillPath: installedSkill,
      marker: 'FORGE_THINK_SMOKE',
      lastMessagePath,
    });
    assert.equal(receipt.skill, 'think');
    assert.equal(receipt.marker, 'FORGE_THINK_SMOKE');
    assert.equal(receipt.filesChanged, 0);

    events.splice(2, 0, {
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command: `cat ${path.join(runDir, 'codex/auth.json')}`,
        exit_code: 0,
        status: 'completed',
        aggregated_output: 'redacted credential material',
      },
    });
    fs.writeFileSync(eventsPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
    assert.throws(() => assertInvocationEvidence({
      runDir,
      caseId,
      installedSkillPath: installedSkill,
      marker: 'FORGE_THINK_SMOKE',
      lastMessagePath,
    }), /credential/);
    events.splice(2, 1);

    events[1].item.aggregated_output = 'a different file body';
    fs.writeFileSync(eventsPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
    assert.throws(() => assertInvocationEvidence({
      runDir,
      caseId,
      installedSkillPath: installedSkill,
      marker: 'FORGE_THINK_SMOKE',
      lastMessagePath,
    }), /installed skill content/);
    events[1].item.aggregated_output = installedSkillBody;

    events[1].item.command = `true || cat ${installedSkill}; cat ${installedSkill}.copy`;
    fs.writeFileSync(eventsPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
    assert.throws(() => assertInvocationEvidence({
      runDir,
      caseId,
      installedSkillPath: installedSkill,
      marker: 'FORGE_THINK_SMOKE',
      lastMessagePath,
    }), /standalone cat/);
    events[1].item.command = `cat ${installedSkill}`;

    const onlyEcho = events.filter((_, index) => index !== 1);
    fs.writeFileSync(eventsPath, `${onlyEcho.map((event) => JSON.stringify(event)).join('\n')}\n`);
    assert.throws(() => assertInvocationEvidence({
      runDir,
      caseId,
      installedSkillPath: installedSkill,
      marker: 'FORGE_THINK_SMOKE',
      lastMessagePath,
    }), /real read/);
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
});
