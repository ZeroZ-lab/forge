#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const skillRoot = path.join(root, 'plugins/forge/skills');
const defaultChain = ['detail', 'codegen', 'review'];
// chars-per-proxy-token: a rough English-text sketch only. This is NOT a tokenizer.
// For CJK-heavy corpora (Forge skills are bilingual) it undercounts real tokens ~2.6x.
// All budgets and gates use `chars` (the measured quantity), never this proxy.
const proxyCharPerToken = 3.2;

function readSkill(skillName) {
  const relativePath = `plugins/forge/skills/${skillName}/SKILL.md`;
  const absolutePath = path.join(root, relativePath);
  return {
    name: skillName,
    path: relativePath,
    text: fs.readFileSync(absolutePath, 'utf8'),
  };
}

function measure(skill) {
  return {
    name: skill.name,
    path: skill.path,
    chars: skill.text.length,
    lines: skill.text.replace(/\r?\n$/, '').split(/\r?\n/).length,
    token_proxy: Math.ceil(skill.text.length / proxyCharPerToken),
  };
}

function parseNumberArg(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (value === undefined) return undefined;

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`Invalid --${name}: ${value}`);
  }
  return number;
}

const json = process.argv.includes('--json');
const maxDefaultChainChars = parseNumberArg('max-default-chain-chars');
const maxTotalChars = parseNumberArg('max-total-chars');
const maxSkillChars = parseNumberArg('max-skill-chars');

const skillNames = fs
  .readdirSync(skillRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(skillRoot, entry.name, 'SKILL.md')))
  .map((entry) => entry.name)
  .sort();

const skills = skillNames.map((skillName) => measure(readSkill(skillName)));
const total = {
  chars: skills.reduce((sum, skill) => sum + skill.chars, 0),
  lines: skills.reduce((sum, skill) => sum + skill.lines, 0),
  token_proxy: skills.reduce((sum, skill) => sum + skill.token_proxy, 0),
};
const defaultChainSkills = skills.filter((skill) => defaultChain.includes(skill.name));
const defaultChainTotal = {
  chars: defaultChainSkills.reduce((sum, skill) => sum + skill.chars, 0),
  lines: defaultChainSkills.reduce((sum, skill) => sum + skill.lines, 0),
  token_proxy: defaultChainSkills.reduce((sum, skill) => sum + skill.token_proxy, 0),
};

const result = {
  unit_note:
    'chars is the measured metric and the basis for all budgets. token_proxy = chars/3.2 is a rough English-text sketch, NOT a real tokenizer; for CJK-heavy bilingual content it undercounts real tokens ~2.6x. Do not treat token_proxy as an accurate cost estimate.',
  token_proxy_basis: proxyCharPerToken,
  default_chain: defaultChain,
  default_chain_total: defaultChainTotal,
  total,
  skills: [...skills].sort((a, b) => b.chars - a.chars),
};

const failures = [];
if (maxDefaultChainChars !== undefined && defaultChainTotal.chars > maxDefaultChainChars) {
  failures.push(`default chain chars ${defaultChainTotal.chars} exceeds ${maxDefaultChainChars}`);
}
if (maxTotalChars !== undefined && total.chars > maxTotalChars) {
  failures.push(`total SKILL.md chars ${total.chars} exceeds ${maxTotalChars}`);
}
if (maxSkillChars !== undefined) {
  for (const skill of skills) {
    if (skill.chars > maxSkillChars) {
      failures.push(`${skill.path} chars ${skill.chars} exceeds ${maxSkillChars}`);
    }
  }
}

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(
    `Default chain (${defaultChain.join(' -> ')}): ${defaultChainTotal.chars} chars (rough proxy ~${defaultChainTotal.token_proxy} tokens at chars/3.2 — NOT a real tokenizer, undercounts CJK ~2.6x)`,
  );
  console.log(`All SKILL.md files: ${total.chars} chars (rough proxy ~${total.token_proxy} tokens)`);
  console.log('\nTop SKILL.md files by size:');
  for (const skill of result.skills.slice(0, 10)) {
    console.log(`- ${skill.name}: ${skill.chars} chars, ${skill.lines} lines`);
  }
}

if (failures.length > 0) {
  console.error('\nSkill char budget exceeded:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
