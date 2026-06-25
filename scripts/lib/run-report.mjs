const RUN_STATUSES = new Set(['pass', 'fail', 'blocked']);
const DOC_SYNC_STATUSES = new Set(['completed', 'pending', 'blocked']);
const METRIC_KEYS = new Set(['user_interventions', 'turns', 'changed_files', 'elapsed_ms', 'tokens']);

const ORACLE_FIELDS = {
  artifact_reported: 'path',
  artifact_absent: 'path',
  change_unit_reported: 'path',
  goal_covers: 'path',
  command_reported: 'command',
  decision_gate_reported: 'decision',
  goal_verified: 'target',
  evidence_contains: 'text',
  forbidden_behavior_absent: 'behavior',
  skill_triggered: 'skill',
};

function stringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function pathFrom(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) return value.path;
  return undefined;
}

function idFrom(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) return value.id;
  return undefined;
}

function globMatch(pattern, value) {
  if (typeof pattern !== 'string' || typeof value !== 'string') return false;
  if (!pattern.includes('*')) return value === pattern;
  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`).test(value);
}

function pathMatch(expected, actual) {
  if (typeof expected !== 'string' || typeof actual !== 'string') return false;
  if (globMatch(expected, actual)) return true;
  if (expected.endsWith('/')) return actual.startsWith(expected);
  if (!expected.includes('/')) return actual.split('/').at(-1) === expected;
  return false;
}

function isChangeUnitPath(value) {
  return typeof value === 'string' && /^docs\/change-units\/CU-[^/]+\.md$/.test(value);
}

function normalizeSkillName(value) {
  return typeof value === 'string' && value.startsWith('forge-') ? value.slice('forge-'.length) : value;
}

function validArtifactEntry(entry) {
  return (
    (typeof entry === 'string' && entry.length > 0) ||
    (entry &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      typeof entry.path === 'string' &&
      entry.path.length > 0)
  );
}

function validChangeUnitEntry(entry) {
  return isChangeUnitPath(pathFrom(entry));
}

function validDecisionEntry(entry) {
  return typeof idFrom(entry) === 'string' && idFrom(entry).length > 0;
}

function validDocSyncEntry(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    !Array.isArray(entry) &&
    typeof entry.target === 'string' &&
    entry.target.length > 0 &&
    DOC_SYNC_STATUSES.has(entry.status)
  );
}

function validGoalCoverageEntry(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    !Array.isArray(entry) &&
    typeof entry.source === 'string' &&
    entry.source.startsWith('docs/') &&
    stringArray(entry.covers)
  );
}

function validMetrics(metrics) {
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) return false;
  return Object.entries(metrics).every(
    ([key, value]) => METRIC_KEYS.has(key) && typeof value === 'number' && value >= 0,
  );
}

export function createCaseRun(caseId, status, details = {}) {
  return {
    case_id: caseId,
    status,
    triggered_skills: [],
    artifacts: [],
    change_units: [],
    goal_verification: [],
    goal_coverage_entries: [],
    commands_run: [],
    decisions: [],
    forbidden_behaviors: [],
    evidence: [],
    ...details,
  };
}

export function createRunReport({ runId, runner, startedAt = new Date().toISOString(), cases = [] }) {
  return {
    version: 2,
    suite: 'forge',
    run_id: runId,
    runner,
    started_at: startedAt,
    cases,
  };
}

export function formatCaseRunContract(caseId) {
  return `{
  "case_id": "${caseId}",
  "status": "pass" | "fail" | "blocked",
  "triggered_skills": ["forge-..."],
  "artifacts": ["path/or/dir"],
  "change_units": ["docs/change-units/CU-....md"],
  "goal_verification": [{"target": "docs/goal.md", "status": "completed"}],
  "goal_coverage_entries": [{"source": "docs/features/<feature>/goal.md", "covers": ["src/..."]}],
  "commands_run": ["exact command"],
  "decisions": ["decision_id"],
  "forbidden_behaviors": [],
  "evidence": ["short evidence strings"],
  "notes": "short note"
}`;
}

export function inspectRun(run) {
  const artifacts = list(run?.artifacts).map(pathFrom).filter(Boolean);
  const changeUnits = list(run?.change_units).map(pathFrom).filter(isChangeUnitPath);
  const decisions = list(run?.decisions).map(idFrom).filter(Boolean);
  const completedGoalTargets = list(run?.goal_verification)
    .filter((item) => item?.status === 'completed')
    .map((item) => item.target)
    .filter(Boolean);
  const goalCoverage = [];
  for (const entry of list(run?.goal_coverage_entries)) {
    if (entry?.source) goalCoverage.push(entry.source);
    for (const coveredPath of entry?.covers ?? []) goalCoverage.push(coveredPath);
  }

  const view = {
    artifacts,
    changeUnits,
    commands: list(run?.commands_run),
    completedGoalTargets,
    decisions,
    evidence: [...list(run?.evidence), run?.notes ?? ''].join('\n'),
    firstEvidence: list(run?.evidence)[0] ?? run?.notes ?? '-',
    forbiddenBehaviors: list(run?.forbidden_behaviors),
    goalCoverage,
    triggeredSkills: list(run?.triggered_skills).map(normalizeSkillName),
  };

  return {
    ...view,
    matchesArtifact(expected) {
      const candidates = expected.startsWith('docs/change-units/') ? changeUnits : artifacts;
      return candidates.some((candidate) =>
        expected.startsWith('docs/change-units/') ? globMatch(expected, candidate) : pathMatch(expected, candidate),
      );
    },
  };
}

export function oracleCheckIssues(testCase, registrySkills) {
  const issues = [];
  if (!Array.isArray(testCase.oracle_checks) || testCase.oracle_checks.length === 0) {
    issues.push(`${testCase.id}: oracle_checks are required`);
    return issues;
  }

  for (const check of testCase.oracle_checks) {
    if (!check || typeof check !== 'object' || Array.isArray(check)) {
      issues.push(`${testCase.id}: oracle check must be an object`);
      continue;
    }
    const requiredField = ORACLE_FIELDS[check.type];
    if (!requiredField) {
      issues.push(`${testCase.id}: unknown oracle check type ${check.type}`);
      continue;
    }
    if (typeof check[requiredField] !== 'string' || check[requiredField].length === 0) {
      issues.push(`${testCase.id}: ${check.type}.${requiredField} is required`);
    }
    if (check.type === 'skill_triggered' && !registrySkills.has(check.skill)) {
      issues.push(`${testCase.id}: unknown oracle skill ${check.skill}`);
    }
  }
  return issues;
}

export function evaluateOracleChecks(testCase, run) {
  const view = inspectRun(run);
  const triggeredSkills = new Set(view.triggeredSkills);
  const commands = new Set(view.commands);
  const decisions = new Set(view.decisions);
  const completedGoalTargets = new Set(view.completedGoalTargets);
  const forbiddenBehaviors = new Set(view.forbiddenBehaviors);

  return (testCase.oracle_checks ?? []).map((check) => {
    let passed = false;
    if (check.type === 'skill_triggered') passed = triggeredSkills.has(check.skill);
    if (check.type === 'artifact_reported') passed = view.matchesArtifact(check.path);
    if (check.type === 'artifact_absent') passed = !view.matchesArtifact(check.path);
    if (check.type === 'change_unit_reported') passed = view.matchesArtifact(check.path);
    if (check.type === 'goal_covers') {
      passed = view.goalCoverage.some((coveredPath) => pathMatch(check.path, coveredPath));
    }
    if (check.type === 'command_reported') passed = commands.has(check.command);
    if (check.type === 'decision_gate_reported') passed = decisions.has(check.decision);
    if (check.type === 'goal_verified') {
      passed = [...completedGoalTargets].some((target) => pathMatch(check.target, target));
    }
    if (check.type === 'evidence_contains') passed = view.evidence.includes(check.text);
    if (check.type === 'forbidden_behavior_absent') passed = !forbiddenBehaviors.has(check.behavior);
    return { passed, check };
  });
}

function runIssues(run, testCase, registrySkills, options) {
  const issues = [];
  const label = typeof run?.case_id === 'string' ? run.case_id : 'report case';
  if (!RUN_STATUSES.has(run?.status)) issues.push(`${label}: status must be pass, fail, or blocked`);
  if (!stringArray(run?.triggered_skills)) issues.push(`${label}: triggered_skills must be strings`);
  if (!Array.isArray(run?.artifacts) || !run.artifacts.every(validArtifactEntry)) {
    issues.push(`${label}: artifacts must be path strings or { path } objects`);
  }
  if (!Array.isArray(run?.change_units) || !run.change_units.every(validChangeUnitEntry)) {
    issues.push(`${label}: change_units must point to docs/change-units/CU-*.md`);
  }
  if (!Array.isArray(run?.goal_verification) || !run.goal_verification.every(validDocSyncEntry)) {
    issues.push(`${label}: goal_verification must be { target, status } objects`);
  }
  if (!Array.isArray(run?.goal_coverage_entries) || !run.goal_coverage_entries.every(validGoalCoverageEntry)) {
    issues.push(`${label}: goal_coverage_entries must be { source: "docs/...", covers: [...] } objects`);
  }
  if (!stringArray(run?.commands_run)) issues.push(`${label}: commands_run must be strings`);
  if ('decisions' in (run ?? {}) && (!Array.isArray(run.decisions) || !run.decisions.every(validDecisionEntry))) {
    issues.push(`${label}: decisions must be strings or { id } objects`);
  }
  if ('forbidden_behaviors' in (run ?? {}) && !stringArray(run.forbidden_behaviors)) {
    issues.push(`${label}: forbidden_behaviors must be strings`);
  }
  if (!stringArray(run?.evidence)) issues.push(`${label}: evidence must be strings`);
  if ('metrics' in (run ?? {}) && !validMetrics(run.metrics)) {
    issues.push(`${label}: metrics must contain only non-negative numeric runtime metrics`);
  }

  for (const skillName of list(run?.triggered_skills).map(normalizeSkillName)) {
    if (!registrySkills.has(skillName)) issues.push(`${label}: unknown triggered skill ${skillName}`);
  }

  if (testCase && !(run.status === 'blocked' && options.skipBlocked)) {
    const view = inspectRun(run);
    for (const expectedArtifact of testCase.expected_artifacts ?? []) {
      if (!view.matchesArtifact(expectedArtifact)) {
        issues.push(`${label}: expected artifact not reported ${expectedArtifact}`);
      }
    }
    const changedCurrentDocs = view.artifacts.some((artifactPath) =>
      ['docs/goal.md', 'docs/goal_verification.md'].some((currentPath) => globMatch(currentPath, artifactPath)),
    );
    if (changedCurrentDocs && view.changeUnits.length === 0) {
      issues.push(`${label}: goal verification docs changed without a Change Unit`);
    }
  }

  return issues;
}

export function inspectRunReport(report, { manifest, registry, allowPartial = false, skipBlocked = false }) {
  const issues = [];
  const registrySkills = new Set((registry.skills ?? []).map((skill) => skill.name));
  const manifestById = new Map((manifest.cases ?? []).map((testCase) => [testCase.id, testCase]));
  const runsByCase = new Map();
  const options = { skipBlocked };

  if (report?.version !== 2) issues.push('report.version must be 2');
  if (report?.suite !== 'forge') issues.push('report.suite must be forge');
  if (typeof report?.run_id !== 'string' || report.run_id.length === 0) issues.push('report.run_id is required');
  if (!Array.isArray(report?.cases)) issues.push('report.cases must be an array');

  for (const run of report?.cases ?? []) {
    if (typeof run?.case_id !== 'string' || !manifestById.has(run.case_id)) {
      issues.push(`report has unknown case_id ${run?.case_id}`);
      continue;
    }
    if (runsByCase.has(run.case_id)) issues.push(`report has duplicate case_id ${run.case_id}`);
    runsByCase.set(run.case_id, run);
    issues.push(...runIssues(run, manifestById.get(run.case_id), registrySkills, options));
  }

  let blockedSkipped = 0;
  const caseEvaluations = [];
  for (const testCase of manifest.cases ?? []) {
    const run = runsByCase.get(testCase.id);
    if (!run && allowPartial) continue;
    if (!run) {
      issues.push(`report missing case ${testCase.id}`);
      continue;
    }
    if (run.status === 'blocked' && skipBlocked) {
      blockedSkipped += 1;
      continue;
    }
    if (run.status !== 'pass') issues.push(`${testCase.id}: status is ${run.status}`);
    const oracleResults = evaluateOracleChecks(testCase, run);
    for (const result of oracleResults) {
      if (!result.passed) issues.push(`${testCase.id}: failed oracle ${JSON.stringify(result.check)}`);
    }
    caseEvaluations.push({ testCase, run, oracleResults });
  }

  if (caseEvaluations.length === 0) issues.push('report did not include any scored benchmark cases');
  return { blockedSkipped, caseEvaluations, issues };
}
