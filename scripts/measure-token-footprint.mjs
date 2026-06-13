#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const skillRoot = path.join(root, 'plugins/forge/skills');
const defaultChain = ['detail', 'codegen', 'review'];
const tokenRatio = 3.2;

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
    estimated_tokens: Math.ceil(skill.text.length / tokenRatio),
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
  estimated_tokens: skills.reduce((sum, skill) => sum + skill.estimated_tokens, 0),
};
const defaultChainSkills = skills.filter((skill) => defaultChain.includes(skill.name));
const defaultChainTotal = {
  chars: defaultChainSkills.reduce((sum, skill) => sum + skill.chars, 0),
  lines: defaultChainSkills.reduce((sum, skill) => sum + skill.lines, 0),
  estimated_tokens: defaultChainSkills.reduce((sum, skill) => sum + skill.estimated_tokens, 0),
};

const result = {
  token_ratio: tokenRatio,
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
  console.log(`Default chain (${defaultChain.join(' -> ')}): ${defaultChainTotal.chars} chars, ~${defaultChainTotal.estimated_tokens} tokens`);
  console.log(`All SKILL.md files: ${total.chars} chars, ~${total.estimated_tokens} tokens`);
  console.log('\nTop SKILL.md files by size:');
  for (const skill of result.skills.slice(0, 10)) {
    console.log(`- ${skill.name}: ${skill.chars} chars, ${skill.lines} lines, ~${skill.estimated_tokens} tokens`);
  }
}

if (failures.length > 0) {
  console.error('\nToken footprint budget failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
