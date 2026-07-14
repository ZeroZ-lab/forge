import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadEffectivenessContract } from '../scripts/lib/effectiveness-contract.mjs';
import {
  EffectivenessReportError,
  parseEffectivenessReport,
} from '../scripts/lib/effectiveness-report.mjs';
import {
  inspectJsonSchemaSupport,
  validateJsonSchema,
} from '../scripts/lib/json-schema-subset.mjs';

const root = path.resolve(import.meta.dirname, '..');

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

test('effectiveness manifest publishes one versioned report contract', () => {
  const { manifest, reportContract } = loadEffectivenessContract(root);

  assert.equal(manifest.report_schema, 'evals/effectiveness-suite/report.schema.json');
  assert.equal(manifest.report_compatibility, 'evals/effectiveness-suite/report.compatibility.json');
  assert.equal(reportContract.schema.properties.schema_version.const, 1);
  assert.deepEqual(reportContract.compatibility.directly_accepted_versions, [1]);
});

test('report schema uses only semantic keywords exercised by the contract tests', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  assert.deepEqual(inspectJsonSchemaSupport(schema), []);

  const invalidTimestamp = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');
  invalidTimestamp.execution.started_at = '2026-02-31T00:00:00Z';
  assert.ok(
    validateJsonSchema(invalidTimestamp, schema).some(
      (item) => item.path === '/execution/started_at' && item.code === 'format',
    ),
  );

  const prolepticTimestamp = readJson(
    'evals/effectiveness-suite/report-samples/v1-valid-direct-action.json',
  );
  prolepticTimestamp.execution.started_at = '0000-01-01T00:00:00Z';
  assert.deepEqual(validateJsonSchema(prolepticTimestamp, schema), []);
});

test('$ref targets resolve and sibling assertions are not skipped', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  assert.deepEqual(inspectJsonSchemaSupport(schema), []);

  const withSibling = structuredClone(schema);
  withSibling.properties.report_id.minLength = 1000;
  const valid = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');
  assert.ok(
    validateJsonSchema(valid, withSibling).some(
      (item) => item.path === '/report_id' && item.code === 'min_length',
    ),
  );

  const brokenRef = structuredClone(schema);
  brokenRef.properties.report_id.$ref = '#/$defs/missing';
  assert.ok(
    inspectJsonSchemaSupport(brokenRef).some(
      (item) => /properties\/report_id\/\$ref does not resolve/.test(item),
    ),
  );
});

test('boolean conditional schemas are evaluated by presence rather than truthiness', () => {
  assert.ok(
    validateJsonSchema({}, { if: true, then: false }).some(
      (item) => item.path === '' && item.code === 'false_schema',
    ),
  );
  assert.ok(
    validateJsonSchema({}, { if: false, else: false }).some(
      (item) => item.path === '' && item.code === 'false_schema',
    ),
  );

  const booleanRef = { $defs: { accepted: true }, $ref: '#/$defs/accepted' };
  assert.deepEqual(inspectJsonSchemaSupport(booleanRef), []);
  assert.deepEqual(validateJsonSchema({}, booleanRef), []);

  assert.ok(
    validateJsonSchema('😀', { type: 'string', minLength: 2 }).some(
      (item) => item.path === '' && item.code === 'min_length',
    ),
  );
});

test('report schema accepts a source-backed direct action and rejects missing or path-dependent data', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  const valid = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');
  const missing = readJson('evals/effectiveness-suite/report-samples/v1-missing-workspace.invalid.json');

  assert.deepEqual(validateJsonSchema(valid, schema), []);
  assert.ok(
    validateJsonSchema(missing, schema).some(
      (item) => item.path === '/experiment/workspace' && item.code === 'required',
    ),
  );

  const pathDependent = structuredClone(valid);
  pathDependent.triggered_skills = ['detail'];
  assert.ok(
    validateJsonSchema(pathDependent, schema).some(
      (item) => item.path === '/triggered_skills' && item.code === 'additional_property',
    ),
  );
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
  assert.deepEqual(validateJsonSchema(valid, schema), []);

  const noCostSource = structuredClone(valid);
  delete noCostSource.costs[0].acquisition;
  assert.ok(
    validateJsonSchema(noCostSource, schema).some(
      (item) => item.path === '/costs/0/acquisition' && item.code === 'required',
    ),
  );
});

test('capability activation is typed telemetry and arm identifiers stay forward-compatible', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  const valid = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');
  const activated = structuredClone(valid);

  activated.experiment.arm.id = 'adaptive-full';
  activated.events[0].type = 'capability_activation';
  activated.events[0].capability = { kind: 'skill', id: 'forge:detail', version: '0.52.0' };
  assert.deepEqual(validateJsonSchema(activated, schema), []);

  delete activated.events[0].capability;
  assert.ok(
    validateJsonSchema(activated, schema).some(
      (item) => item.path === '/events/0/capability' && item.code === 'required',
    ),
  );
});

test('model availability cannot hide a fallback or omit an unavailable reason', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  const valid = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');

  const availableWithoutActual = structuredClone(valid);
  delete availableWithoutActual.experiment.model.actual;
  assert.ok(
    validateJsonSchema(availableWithoutActual, schema).some(
      (item) => item.path === '/experiment/model/actual' && item.code === 'required',
    ),
  );

  const unavailable = structuredClone(valid);
  unavailable.experiment.model.availability = 'unavailable';
  delete unavailable.experiment.model.actual;
  unavailable.experiment.model.unavailable_reason = 'fixture-model-unavailable';
  assert.deepEqual(validateJsonSchema(unavailable, schema), []);

  unavailable.experiment.model.actual = unavailable.experiment.model.requested;
  assert.ok(
    validateJsonSchema(unavailable, schema).some(
      (item) => item.path === '/experiment/model/actual' && item.code === 'forbidden',
    ),
  );
});

test('submitted results require an output and claim while cost units match their metric', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  const valid = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');

  const emptySubmission = structuredClone(valid);
  delete emptySubmission.final_result.final_output_ref;
  delete emptySubmission.final_result.model_claim;
  const emptySubmissionIssues = validateJsonSchema(emptySubmission, schema);
  assert.ok(
    emptySubmissionIssues.some(
      (item) => item.path === '/final_result/final_output_ref' && item.code === 'required',
    ),
  );
  assert.ok(
    emptySubmissionIssues.some(
      (item) => item.path === '/final_result/model_claim' && item.code === 'required',
    ),
  );

  const wrongUnits = structuredClone(valid);
  wrongUnits.costs[0].unit = 'tokens';
  wrongUnits.costs[1].unit = 'bytes';
  const wrongUnitIssues = validateJsonSchema(wrongUnits, schema);
  assert.ok(wrongUnitIssues.some((item) => item.code === 'one_of'));
  assert.ok(
    wrongUnitIssues.some(
      (item) => item.path === '/costs/0/unit' && ['const', 'enum'].includes(item.code),
    ),
  );
});

test('legacy reports are never silently promoted into effectiveness evidence', () => {
  const schema = readJson('evals/effectiveness-suite/report.schema.json');
  const compatibility = readJson('evals/effectiveness-suite/report.compatibility.json');
  const legacy = readJson('evals/effectiveness-suite/report-samples/skills-suite-v2.incompatible.json');

  assert.ok(
    validateJsonSchema(legacy, schema).some(
      (item) => item.path === '/schema_version' && item.code === 'required',
    ),
  );
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
  assert.throws(
    () => parseEffectivenessReport(legacy, { rootDir: root }),
    (error) =>
      error instanceof EffectivenessReportError &&
      error.code === 'INCOMPATIBLE_CONTRACT' &&
      error.issues.some(
        (item) => item.code === 'rerun_required_missing_effectiveness_provenance',
      ),
  );
  assert.throws(
    () => parseEffectivenessReport({ ...legacy, suite: 'unknown' }, { rootDir: root }),
    (error) =>
      error instanceof EffectivenessReportError &&
      !error.issues.some(
        (item) => item.code === 'rerun_required_missing_effectiveness_provenance',
      ),
  );
  assert.equal(compatibility.migrations.length, 0);
  assert.equal(schema.properties.migration, undefined, 'no unregistered migration hook may be accepted');

  const future = readJson('evals/effectiveness-suite/report-samples/v1-valid-direct-action.json');
  future.schema_version = 2;
  assert.throws(
    () => parseEffectivenessReport(future, { rootDir: root }),
    (error) =>
      error instanceof EffectivenessReportError &&
      error.code === 'UNSUPPORTED_VERSION' &&
      error.issues.some(
        (item) => item.path === '/schema_version' && item.code === 'unsupported_version',
      ),
  );
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
      'evals/effectiveness-suite/report.schema.json',
      (schema) => { schema.properties.report_id.maxLength = 100; },
      /maxLength is unsupported/,
    ],
    [
      'evals/effectiveness-suite/report.schema.json',
      (schema) => { schema.$defs.nonEmptyString.minLength = '1'; },
      /minLength must be a non-negative integer/,
    ],
    [
      'evals/effectiveness-suite/report.schema.json',
      (schema) => { schema.$defs.evidenceReference.required = ''; },
      /required must be an array of unique strings/,
    ],
    [
      'evals/effectiveness-suite/report.schema.json',
      (schema) => { schema.$defs.evidenceReference.additionalProperties = null; },
      /additionalProperties must be a boolean or schema/,
    ],
    [
      'evals/effectiveness-suite/report.schema.json',
      (schema) => { schema.properties.events.minItems = -1; },
      /minItems must be a non-negative integer/,
    ],
    [
      'evals/effectiveness-suite/report.schema.json',
      (schema) => { schema.$defs.nonEmptyString.$ref = '#/$defs/nonEmptyString'; },
      /cyclic local \$ref/,
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
