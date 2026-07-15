import fs from 'node:fs';
import path from 'node:path';

import { inspectJsonSchemaSupport } from './json-schema-subset.mjs';

const SCHEMA_PATH = 'evals/effectiveness-suite/evidence-envelope.schema.json';
const REQUIRED_SOURCE_LEVELS = [
  'model_self_report',
  'tool_output',
  'independent_verifier',
];

export function loadEvidenceEnvelopeContract(rootDir) {
  const issues = [];
  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(path.join(rootDir, SCHEMA_PATH), 'utf8'));
  } catch (error) {
    issues.push(`${SCHEMA_PATH}: cannot read JSON (${error.message})`);
    schema = {};
  }
  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    issues.push(`${SCHEMA_PATH} must use JSON Schema draft 2020-12`);
  }
  if (schema.type !== 'object' || schema.additionalProperties !== false) {
    issues.push(`${SCHEMA_PATH} must be a fail-closed object schema`);
  }
  if (schema.properties?.schema_version?.const !== 1) {
    issues.push(`${SCHEMA_PATH}.schema_version must be 1`);
  }
  if (schema.properties?.contract?.const !== 'forge-evidence-envelope') {
    issues.push(`${SCHEMA_PATH}.contract must be forge-evidence-envelope`);
  }
  if (
    JSON.stringify(schema.properties?.source_level?.enum) !==
    JSON.stringify(REQUIRED_SOURCE_LEVELS)
  ) {
    issues.push(`${SCHEMA_PATH}.source_level must preserve all three evidence levels`);
  }
  for (const supportIssue of inspectJsonSchemaSupport(schema)) {
    issues.push(`${SCHEMA_PATH}: ${supportIssue}`);
  }
  if (issues.length > 0) {
    const error = new Error(`Evidence Envelope contract rejected (${issues.length} issues)`);
    error.issues = issues;
    throw error;
  }
  return { path: SCHEMA_PATH, schema };
}
