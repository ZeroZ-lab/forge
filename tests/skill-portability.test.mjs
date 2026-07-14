import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { findBannedSkillSyntaxTokens } from '../scripts/lib/skill-portability.mjs';

const root = new URL('..', import.meta.url);

test('skill portability scanner reports known host syntax variants with locations', () => {
  const findings = findBannedSkillSyntaxTokens(
    'demo/SKILL.md',
    `# Demo

Use Agent(subagent_type=Explore) for discovery.
Use Agent { "subagent_type": "Explore" } for another pass.
Then call AskUserQuestion or request_user_input for the decision.
Delegate with collaboration.spawn_agent when useful.
Set "run_in_background": true when useful.
`,
  );

  assert.deepEqual(findings, [
    { file: 'demo/SKILL.md', line: 3, token: 'Agent invocation' },
    { file: 'demo/SKILL.md', line: 3, token: 'subagent_type field' },
    { file: 'demo/SKILL.md', line: 4, token: 'Agent invocation' },
    { file: 'demo/SKILL.md', line: 4, token: 'subagent_type field' },
    { file: 'demo/SKILL.md', line: 5, token: 'AskUserQuestion' },
    { file: 'demo/SKILL.md', line: 5, token: 'request_user_input' },
    { file: 'demo/SKILL.md', line: 6, token: 'spawn_agent' },
    { file: 'demo/SKILL.md', line: 7, token: 'run_in_background field' },
  ]);
});

test('skill portability scanner accepts capability-level delegation and choice language', () => {
  const findings = findBannedSkillSyntaxTokens(
    'demo/SKILL.md',
    `Delegate a bounded read-only investigation when an independent worker is available.
Use a structured choice when the host supports one; otherwise show numbered options.
`,
  );

  assert.deepEqual(findings, []);
});

test('published discovery and decision protocols remain platform-neutral and usable', async () => {
  const files = [
    'plugins/forge/skills/improve/SKILL.md',
    'plugins/forge/skills/shared/concepts/decision-presentation.md',
  ];
  const entries = await Promise.all(files.map(async (file) => ({
    file,
    content: await readFile(new URL(file, root), 'utf8'),
  })));
  const findings = entries.flatMap(({ file, content }) => (
    findBannedSkillSyntaxTokens(file, content)
  ));
  const improve = entries[0].content;
  const decisions = entries[1].content;

  assert.deepEqual(findings, []);
  assert.match(improve, /delegation-matrix\.md/);
  assert.match(improve, /没有独立委派能力[\s\S]*主控/i);
  assert.match(improve, /\{file, line, symbol\}/);
  assert.match(decisions, /structured choice/i);
  assert.match(decisions, /numbered options/i);
  assert.match(decisions, /Recommended/);
  assert.match(decisions, /custom/i);
});

test('published protocols statically support two host capability contexts', async () => {
  const improve = await readFile(
    new URL('plugins/forge/skills/improve/SKILL.md', root),
    'utf8',
  );
  const decisions = await readFile(
    new URL('plugins/forge/skills/shared/concepts/decision-presentation.md', root),
    'utf8',
  );
  const hostContexts = [
    {
      name: 'structured-choice host with independent delegation',
      checks: [
        [decisions, /structured choice 能完整表达[\s\S]*映射到宿主/i],
        [improve, /委派给独立调查者/],
      ],
    },
    {
      name: 'text-only single-controller host',
      checks: [
        [decisions, /numbered options/i],
        [improve, /没有独立委派能力[\s\S]*主控/i],
      ],
    },
  ];

  for (const { name, checks } of hostContexts) {
    for (const [content, pattern] of checks) {
      assert.match(content, pattern, `${name} lacks ${pattern}`);
    }
  }
});
