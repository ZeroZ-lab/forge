const BANNED_SKILL_SYNTAX_PATTERNS = [
  { token: 'Agent invocation', pattern: /\bAgent\s*(?:\(|\{)/ },
  { token: 'subagent_type field', pattern: /\bsubagent_type\b["']?\s*[:=]/ },
  { token: 'AskUserQuestion', pattern: /\bAskUserQuestion\b/ },
  { token: 'request_user_input', pattern: /\brequest_user_input\b/ },
  { token: 'spawn_agent', pattern: /\bspawn_agent\b/ },
  { token: 'run_in_background field', pattern: /\brun_in_background\b["']?\s*[:=]/ },
];

export function findBannedSkillSyntaxTokens(file, content) {
  const findings = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    for (const { token, pattern } of BANNED_SKILL_SYNTAX_PATTERNS) {
      if (pattern.test(lines[index])) {
        findings.push({ file, line: index + 1, token });
      }
    }
  }

  return findings;
}
