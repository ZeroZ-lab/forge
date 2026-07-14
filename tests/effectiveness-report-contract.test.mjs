import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadEffectivenessContract } from '../scripts/lib/effectiveness-contract.mjs';

const root = path.resolve(import.meta.dirname, '..');
const testedSchemaKeywords = new Set([
  '$schema',
  '$id',
  '$ref',
  '$defs',
  'title',
  'description',
  'type',
  'additionalProperties',
  'required',
  'properties',
  'const',
  'enum',
  'minLength',
  'pattern',
  'format',
  'minimum',
  'minItems',
  'items',
  'contains',
  'allOf',
  'anyOf',
  'oneOf',
  'if',
  'then',
  'else',
  'not',
]);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function withMutatedReportFile(relativePath, mutate, check) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-effectiveness-report-'));
  const source = path.join(root, 'evals', 'effectiveness-suite');
  const target = path.join(fixtureRoot, 'evals', 'effectiveness-suite');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
  const targetFile = path.join(fixtureRoot, relativePath);
  const value = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  mutate(value);
  fs.writeFileSync(targetFile, `${JSON.stringify(value, null, 2)}\n`);
  try {
    check(fixtureRoot);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unknownSchemaKeywords(schema, rootSchema = schema, at = '$') {
  if (!isPlainObject(schema)) return [];
  const issues = [];
  for (const [keyword, value] of Object.entries(schema)) {
    if (!testedSchemaKeywords.has(keyword)) issues.push(`${at}.${keyword}`);
    if (keyword === '$ref') {
      try {
        const target = resolveRef(rootSchema, value);
        if (!isPlainObject(target)) issues.push(`${at}.$ref does not resolve to a schema object`);
      } catch {
        issues.push(`${at}.$ref does not resolve to a schema object`);
      }
    }
    if (keyword === 'properties' || keyword === '$defs') {
      for (const [name, child] of Object.entries(value)) {
        issues.push(...unknownSchemaKeywords(child, rootSchema, `${at}.${keyword}.${name}`));
      }
    } else if (['items', 'contains', 'if', 'then', 'else', 'not'].includes(keyword)) {
      issues.push(...unknownSchemaKeywords(value, rootSchema, `${at}.${keyword}`));
    } else if (['allOf', 'anyOf', 'oneOf'].includes(keyword)) {
      value.forEach((child, index) => {
        issues.push(...unknownSchemaKeywords(child, rootSchema, `${at}.${keyword}[${index}]`));
      });
    }
  }
  return issues;
}

function matchesLegacyDiscriminator(value, discriminator) {
  if (!isPlainObject(value) || !isPlainObject(discriminator)) return false;
  if (
    !Object.entries(discriminator.required_values ?? {}).every(
      ([field, expected]) => JSON.stringify(value[field]) === JSON.stringify(expected),
    )
  ) return false;
  if (!(discriminator.required_fields ?? []).every((field) => Object.hasOwn(value, field))) return false;
  return (discriminator.forbidden_fields ?? []).every((field) => !Object.hasOwn(value, field));
}

function resolveRef(rootSchema, reference) {
  assert.match(reference, /^#\//, `test validator only supports local refs: ${reference}`);
  return reference
    .slice(2)
    .split('/')
    .reduce((value, segment) => value[segment.replaceAll('~1', '/').replaceAll('~0', '~')], rootSchema);
}

function isRealUtcDateTime(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= monthLengths[month - 1] &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59
  );
}

function schemaIssues(value, schema, rootSchema = schema, at = '$') {
  const issues = [];
  if (schema.$ref) {
    issues.push(...schemaIssues(value, resolveRef(rootSchema, schema.$ref), rootSchema, at));
  }
  if (Object.hasOwn(schema, 'const') && JSON.stringify(value) !== JSON.stringify(schema.const)) {
    issues.push(`${at} must equal ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) {
    issues.push(`${at} must be one of ${schema.enum.join(', ')}`);
  }

  if (schema.anyOf) {
    const branches = schema.anyOf.map((branch) => schemaIssues(value, branch, rootSchema, at));
    if (!branches.some((branch) => branch.length === 0)) issues.push(`${at} must match at least one anyOf branch`);
  }
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((branch) => schemaIssues(value, branch, rootSchema, at).length === 0);
    if (matches.length !== 1) issues.push(`${at} must match exactly one oneOf branch`);
  }
  for (const branch of schema.allOf ?? []) issues.push(...schemaIssues(value, branch, rootSchema, at));
  if (schema.if && schemaIssues(value, schema.if, rootSchema, at).length === 0 && schema.then) {
    issues.push(...schemaIssues(value, schema.then, rootSchema, at));
  }
  if (schema.if && schemaIssues(value, schema.if, rootSchema, at).length > 0 && schema.else) {
    issues.push(...schemaIssues(value, schema.else, rootSchema, at));
  }
  if (schema.not && schemaIssues(value, schema.not, rootSchema, at).length === 0) {
    issues.push(`${at} must not match the forbidden schema`);
  }

  if (schema.type === 'object') {
    if (!isPlainObject(value)) return [...issues, `${at} must be an object`];
    for (const field of schema.required ?? []) {
      if (!Object.hasOwn(value, field)) issues.push(`${at}.${field} is required`);
    }
    for (const [field, fieldValue] of Object.entries(value)) {
      const fieldSchema = schema.properties?.[field];
      if (fieldSchema) issues.push(...schemaIssues(fieldValue, fieldSchema, rootSchema, `${at}.${field}`));
      else if (schema.additionalProperties === false) issues.push(`${at}.${field} is unsupported`);
    }
  }

  if (schema.type === 'array') {
    if (!Array.isArray(value)) return [...issues, `${at} must be an array`];
    if (schema.minItems !== undefined && value.length < schema.minItems) issues.push(`${at} has too few items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) issues.push(`${at} has too many items`);
    if (schema.uniqueItems) {
      const encoded = value.map((item) => JSON.stringify(item));
      if (new Set(encoded).size !== encoded.length) issues.push(`${at} must contain unique items`);
    }
    if (schema.items) {
      value.forEach((item, index) => issues.push(...schemaIssues(item, schema.items, rootSchema, `${at}[${index}]`)));
    }
    if (schema.contains) {
      const matches = value.filter((item, index) => schemaIssues(item, schema.contains, rootSchema, `${at}[${index}]`).length === 0);
      const minimum = schema.minContains ?? 1;
      if (matches.length < minimum) issues.push(`${at} must contain at least ${minimum} matching item(s)`);
    }
  }

  if (schema.type === 'string') {
    if (typeof value !== 'string') return [...issues, `${at} must be a string`];
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) issues.push(`${at} is too short`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) issues.push(`${at} does not match ${schema.pattern}`);
    if (schema.format === 'date-time' && !isRealUtcDateTime(value)) issues.push(`${at} is not a real date-time`);
  }
  if (schema.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) {
    issues.push(`${at} must be a finite number`);
  }
  if (schema.type === 'integer' && !Number.isInteger(value)) issues.push(`${at} must be an integer`);
  if ((schema.type === 'number' || schema.type === 'integer') && schema.minimum !== undefined && value < schema.minimum) {
    issues.push(`${at} must be >= ${schema.minimum}`);
  }

  return issues;
}

test('effectiveness manifest publishes one versioned report contract', () => {
  const { manifest, reportContract } = loadEffectivenessContract(root);

  assert.equal(manifest.report_schema, 'evals/effectiveness-suite/report.schema.json');
  assert.equal(manifest.report_compatibility, 'evals/effectiveness-suite/report.compatibility.json');
  assert.equal(reportContract.schema.properties.schema_version.const, 1);
  assert.deepEqual(reportContract.compatibility.directly_accepted_versions, [1]);
});

test('report schema uses only semantic keywords exercised by the contract tests', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  assert.deepEqual(unknownSchemaKeywords(schema), []);

  const invalidTimestamp = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');
  invalidTimestamp.execution.started_at = '2026-02-31T00:00:00Z';
  assert.ok(schemaIssues(invalidTimestamp, schema).some((issue) => /started_at.*real date-time/.test(issue)));
});

test('$ref targets resolve and sibling assertions are not skipped', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  assert.deepEqual(unknownSchemaKeywords(schema), []);

  const withSibling = structuredClone(schema);
  withSibling.properties.report_id.minLength = 1000;
  const valid = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');
  assert.ok(schemaIssues(valid, withSibling).some((issue) => /report_id.*too short/.test(issue)));

  const brokenRef = structuredClone(schema);
  brokenRef.properties.report_id.$ref = '#/$defs/missing';
  assert.ok(unknownSchemaKeywords(brokenRef).some((issue) => /report_id\.\$ref.*does not resolve/.test(issue)));
});

test('report schema accepts a source-backed direct action and rejects missing or path-dependent data', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  const valid = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');
  const missing = readJson('evals/effectiveness-suite/report-samples/v1-missing-workspace.invalid.json');

  assert.deepEqual(schemaIssues(valid, schema), []);
  assert.ok(schemaIssues(missing, schema).some((issue) => issue.includes('workspace')));

  const pathDependent = structuredClone(valid);
  pathDependent.triggered_skills = ['detail'];
  assert.ok(schemaIssues(pathDependent, schema).some((issue) => /triggered_skills.*unsupported/.test(issue)));
  assert.deepEqual(
    valid.events.filter((event) => event.type === 'capability_activation'),
    [],
    'direct action must remain a valid report path',
  );
});

test('report evidence and cost records preserve acquisition source distinctions', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  const valid = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');

  assert.deepEqual(
    schema.$defs.evidenceReference.properties.source_kind.enum,
    ['model_self_report', 'tool_output', 'independent_verifier'],
  );
  assert.deepEqual(schemaIssues(valid, schema), []);

  const noCostSource = structuredClone(valid);
  delete noCostSource.costs[0].acquisition;
  assert.ok(schemaIssues(noCostSource, schema).some((issue) => /acquisition.*required/.test(issue)));
});

test('capability activation is typed telemetry and arm identifiers stay forward-compatible', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  const valid = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');
  const activated = structuredClone(valid);

  activated.experiment.arm.id = 'adaptive-full';
  activated.events[0].type = 'capability_activation';
  activated.events[0].capability = { kind: 'skill', id: 'forge:detail', version: '0.52.0' };
  assert.deepEqual(schemaIssues(activated, schema), []);

  delete activated.events[0].capability;
  assert.ok(schemaIssues(activated, schema).some((issue) => /capability.*required/.test(issue)));
});

test('model availability cannot hide a fallback or omit an unavailable reason', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  const valid = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');

  const availableWithoutActual = structuredClone(valid);
  delete availableWithoutActual.experiment.model.actual;
  assert.ok(schemaIssues(availableWithoutActual, schema).some((issue) => /actual.*required/.test(issue)));

  const unavailable = structuredClone(valid);
  unavailable.experiment.model.availability = 'unavailable';
  delete unavailable.experiment.model.actual;
  unavailable.experiment.model.unavailable_reason = 'fixture-model-unavailable';
  assert.deepEqual(schemaIssues(unavailable, schema), []);

  unavailable.experiment.model.actual = unavailable.experiment.model.requested;
  assert.ok(schemaIssues(unavailable, schema).some((issue) => /must not match/.test(issue)));
});

test('submitted results require an output and claim while cost units match their metric', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  const valid = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');

  const emptySubmission = structuredClone(valid);
  delete emptySubmission.final_result.final_output_ref;
  delete emptySubmission.final_result.model_claim;
  assert.ok(schemaIssues(emptySubmission, schema).some((issue) => /final_output_ref.*required/.test(issue)));
  assert.ok(schemaIssues(emptySubmission, schema).some((issue) => /model_claim.*required/.test(issue)));

  const wrongUnits = structuredClone(valid);
  wrongUnits.costs[0].unit = 'tokens';
  wrongUnits.costs[1].unit = 'bytes';
  assert.ok(schemaIssues(wrongUnits, schema).some((issue) => /exactly one oneOf branch/.test(issue)));
});

test('legacy reports are never silently promoted into effectiveness evidence', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  const compatibility = readJson('evals/effectiveness-suite/report.compatibility.json');
  const legacy = readJson('evals/effectiveness-suite/report-samples/skills-suite-v2.incompatible.json');

  assert.ok(schemaIssues(legacy, schema).some((issue) => /schema_version.*required/.test(issue)));
  assert.deepEqual(compatibility.unknown_version, { disposition: 'reject' });
  const legacyPolicy = compatibility.foreign_contracts[0];
  assert.deepEqual(
    {
      contract: legacyPolicy.contract,
      versions: legacyPolicy.versions,
      disposition: legacyPolicy.disposition,
      diagnostic: legacyPolicy.diagnostic,
    },
    {
      contract: 'forge-skills-suite',
      versions: [2],
      disposition: 'incompatible',
      diagnostic: 'rerun_required_missing_effectiveness_provenance',
    },
  );
  assert.equal(matchesLegacyDiscriminator(legacy, legacyPolicy.discriminator), true);
  assert.equal(matchesLegacyDiscriminator({ ...legacy, suite: 'unknown' }, legacyPolicy.discriminator), false);
  assert.equal(compatibility.migrations.length, 0);
  assert.equal(schema.properties.migration, undefined, 'no unregistered migration hook may be accepted');

  const future = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');
  future.schema_version = 2;
  assert.ok(schemaIssues(future, schema).some((issue) => /schema_version.*equal 1/.test(issue)));
});

test('report contract loader rejects weakened schema and compatibility policies', () => {
  for (const [relativePath, mutate, expectedIssue] of [
    [
      'evals/effectiveness-suite/report.schema.json',
      (schema) => schema.required.splice(schema.required.indexOf('evidence'), 1),
      /report\.schema\.json\.required/,
    ],
    [
      'evals/effectiveness-suite/report.schema.json',
      (schema) => schema.$defs.evidenceReference.properties.source_kind.enum.push('unqualified'),
      /evidence source kinds/,
    ],
    [
      'evals/effectiveness-suite/report.schema.json',
      (schema) => { schema.properties.report_id.$ref = '#/$defs/missing'; },
      /unresolved local \$ref/,
    ],
    [
      'evals/effectiveness-suite/report.compatibility.json',
      (compatibility) => { compatibility.migration_policy.mode = 'best_effort'; },
      /forbid implicit migration/,
    ],
    [
      'evals/effectiveness-suite/report.compatibility.json',
      (compatibility) => { delete compatibility.samples.legacy_incompatible; },
      /current contract corpus/,
    ],
    [
      'evals/effectiveness-suite/report.compatibility.json',
      (compatibility) => { compatibility.migrations.push({}); },
      /migrations must remain empty/,
    ],
    [
      'evals/effectiveness-suite/report.compatibility.json',
      (compatibility) => { compatibility.migration_policy.requirements = ['best effort']; },
      /migration requirements/,
    ],
  ]) {
    withMutatedReportFile(relativePath, mutate, (fixtureRoot) => {
      assert.throws(
        () => loadEffectivenessContract(fixtureRoot),
        (error) => error.issues?.some((issue) => expectedIssue.test(issue)),
      );
    });
  }
});
