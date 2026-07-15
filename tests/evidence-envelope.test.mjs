import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  EvidenceEnvelopeError,
  createEvidenceEnvelope,
  parseEvidenceEnvelope,
  verifyEvidenceEnvelope,
} from '../scripts/lib/evidence-envelope.mjs';

const root = path.resolve(import.meta.dirname, '..');
const samplePath = path.join(
  root,
  'evals',
  'effectiveness-suite',
  'report-samples',
  'v1-valid-direct-action.json',
);

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function fixture(t) {
  const evidenceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-evidence-envelope-test-'));
  t.after(() => fs.rmSync(evidenceRoot, { recursive: true, force: true }));

  const report = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
  report.experiment.reproduction.request_fingerprint = digest('fixture-request');
  const stdoutDigest = digest('0.52.0');
  const stderrDigest = digest('');
  const payload = `${JSON.stringify({
    exit_code: 0,
    termination: 'completed',
    stdout: { observed_digest: stdoutDigest },
    stderr: { observed_digest: stderrDigest },
  }, null, 2)}\n`;
  const payloadPath = path.join(evidenceRoot, 'command.json');
  fs.writeFileSync(payloadPath, payload);

  const evidence = report.evidence[0];
  evidence.locator = 'command.json';
  evidence.digest = digest(payload);

  const event = report.events.find((candidate) => candidate.id === evidence.event_id);
  const envelopeInput = {
    issuer_ref: evidence.producer_ref,
    source_level: evidence.source_kind,
    target: {
      report_id: report.report_id,
      comparison_group_id: report.experiment.comparison_group_id,
      arm_id: report.experiment.arm.id,
      repeat_index: report.experiment.reproduction.repeat_index,
      request_fingerprint: report.experiment.reproduction.request_fingerprint,
      objective_ref: report.experiment.objective.id,
      objective_digest: report.experiment.objective.digest,
      result_ref: evidence.id,
    },
    action: {
      event_id: event.id,
      type: event.type,
      actor: event.actor,
      status: event.status,
      observed_at: event.observed_at,
    },
    workspace: structuredClone(report.experiment.workspace),
    issued_at: report.execution.ended_at,
    evidence: {
      kind: 'command',
      locator: evidence.locator,
      digest: evidence.digest,
      bytes: Buffer.byteLength(payload),
      result: {
        exit_code: 0,
        termination: 'completed',
        stdout_digest: stdoutDigest,
        stderr_digest: stderrDigest,
      },
    },
  };

  function retainEnvelope(input = envelopeInput) {
    const envelope = createEvidenceEnvelope(input, { rootDir: root });
    const serialized = `${JSON.stringify(envelope, null, 2)}\n`;
    evidence.envelope_ref = `${envelope.content_digest.slice('sha256:'.length)}.evidence-envelope.json`;
    const envelopePath = path.join(evidenceRoot, evidence.envelope_ref);
    fs.writeFileSync(envelopePath, serialized);
    return {
      envelope,
      envelopePath,
      reference: {
        ref: evidence.envelope_ref,
        digest: digest(serialized),
        bytes: Buffer.byteLength(serialized),
      },
    };
  }

  return { evidenceRoot, report, evidence, envelopeInput, payloadPath, retainEnvelope };
}

function bindingOptions(value) {
  return {
    rootDir: root,
    evidenceRoot: value.evidenceRoot,
    report: value.report,
    evidenceId: value.evidence.id,
  };
}

function hasIssue(code) {
  return (error) =>
    error instanceof EvidenceEnvelopeError && error.issues.some((item) => item.code === code);
}

test('valid retained envelope binds issuer, result, action, time, workspace, and command output', (t) => {
  const value = fixture(t);
  const retained = value.retainEnvelope();

  assert.deepEqual(
    parseEvidenceEnvelope(JSON.stringify(retained.envelope), { rootDir: root }),
    retained.envelope,
  );
  assert.deepEqual(
    verifyEvidenceEnvelope(retained.reference, bindingOptions(value)),
    retained.envelope,
  );
  assert.equal(retained.envelope.contract, 'forge-evidence-envelope');
  assert.equal(retained.envelope.schema_version, 1);
  assert.equal(retained.envelope.target.result_ref, value.evidence.id);
  assert.match(retained.envelope.content_digest, /^sha256:[0-9a-f]{64}$/);
});

test('tampered retained envelope or payload fails closed', (t) => {
  const value = fixture(t);
  const retained = value.retainEnvelope();

  fs.appendFileSync(retained.envelopePath, ' ');
  assert.throws(
    () => verifyEvidenceEnvelope(retained.reference, bindingOptions(value)),
    hasIssue('retained_integrity_mismatch'),
  );

  const restored = value.retainEnvelope();
  fs.writeFileSync(value.payloadPath, '{"exit_code":1}\n');
  assert.throws(
    () => verifyEvidenceEnvelope(restored.reference, bindingOptions(value)),
    hasIssue('payload_integrity_mismatch'),
  );
});

test('an envelope changed together with its outer file reference still fails its content digest', (t) => {
  const value = fixture(t);
  const retained = value.retainEnvelope();
  const tampered = JSON.parse(fs.readFileSync(retained.envelopePath, 'utf8'));
  tampered.issuer_ref = 'tool:impostor';
  const serialized = `${JSON.stringify(tampered, null, 2)}\n`;
  fs.writeFileSync(retained.envelopePath, serialized);

  assert.throws(
    () => verifyEvidenceEnvelope(
      {
        ref: retained.reference.ref,
        digest: digest(serialized),
        bytes: Buffer.byteLength(serialized),
      },
      bindingOptions(value),
    ),
    hasIssue('content_digest_mismatch'),
  );
});

test('a self-consistent envelope for another objective cannot support this result', (t) => {
  const value = fixture(t);
  const retained = value.retainEnvelope({
    ...value.envelopeInput,
    target: {
      ...value.envelopeInput.target,
      objective_ref: 'another-objective',
    },
  });

  assert.throws(
    () => verifyEvidenceEnvelope(retained.reference, bindingOptions(value)),
    hasIssue('target_mismatch'),
  );
});

test('a self-consistent envelope from a stale workspace cannot support completion', (t) => {
  const value = fixture(t);
  const retained = value.retainEnvelope({
    ...value.envelopeInput,
    workspace: {
      ...value.envelopeInput.workspace,
      snapshot_digest: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    },
  });

  assert.throws(
    () => verifyEvidenceEnvelope(retained.reference, bindingOptions(value)),
    hasIssue('workspace_mismatch'),
  );
});

test('artifact evidence carries stable bytes and digest without becoming an outcome verdict', (t) => {
  const value = fixture(t);
  const artifact = '{"files":[]}\n';
  fs.writeFileSync(value.payloadPath, artifact);
  value.evidence.digest = digest(artifact);
  value.envelopeInput.evidence = {
    kind: 'artifact',
    locator: value.evidence.locator,
    digest: value.evidence.digest,
    bytes: Buffer.byteLength(artifact),
    result: {
      artifact_id: 'workspace-artifact-manifest',
      artifact_digest: value.evidence.digest,
    },
  };
  const retained = value.retainEnvelope();

  const accepted = verifyEvidenceEnvelope(retained.reference, bindingOptions(value));
  assert.equal(accepted.evidence.kind, 'artifact');
  assert.equal(accepted.evidence.result.artifact_digest, value.evidence.digest);
  assert.equal(Object.hasOwn(accepted, 'outcome'), false);
  assert.equal(Object.hasOwn(accepted, 'supports_completion'), false);
});

test('issuer, source level, and action are exact bindings rather than caller-promotable labels', (t) => {
  const mutations = [
    ['issuer_mismatch', (input) => ({ ...input, issuer_ref: 'verifier:impostor' })],
    ['source_level_mismatch', (input) => ({ ...input, source_level: 'independent_verifier' })],
    [
      'action_mismatch',
      (input) => ({ ...input, action: { ...input.action, actor: 'verifier' } }),
    ],
  ];

  for (const [expectedCode, mutate] of mutations) {
    const value = fixture(t);
    const retained = value.retainEnvelope(mutate(value.envelopeInput));
    assert.throws(
      () => verifyEvidenceEnvelope(retained.reference, bindingOptions(value)),
      hasIssue(expectedCode),
      expectedCode,
    );
  }
});

test('typed result summaries must agree with the retained command or artifact bytes', (t) => {
  const command = fixture(t);
  const wrongCommand = command.retainEnvelope({
    ...command.envelopeInput,
    evidence: {
      ...command.envelopeInput.evidence,
      result: { ...command.envelopeInput.evidence.result, exit_code: 9 },
    },
  });
  assert.throws(
    () => verifyEvidenceEnvelope(wrongCommand.reference, bindingOptions(command)),
    hasIssue('command_summary_mismatch'),
  );

  const artifact = fixture(t);
  const bytes = '{"files":[]}\n';
  fs.writeFileSync(artifact.payloadPath, bytes);
  artifact.evidence.digest = digest(bytes);
  artifact.envelopeInput.evidence = {
    kind: 'artifact',
    locator: artifact.evidence.locator,
    digest: artifact.evidence.digest,
    bytes: Buffer.byteLength(bytes),
    result: {
      artifact_id: 'workspace-artifact-manifest',
      artifact_digest: digest('another artifact'),
    },
  };
  const wrongArtifact = artifact.retainEnvelope();
  assert.throws(
    () => verifyEvidenceEnvelope(wrongArtifact.reference, bindingOptions(artifact)),
    hasIssue('artifact_summary_mismatch'),
  );
});

test('retained references reject mismatched names, traversal, and symlinks', (t) => {
  const value = fixture(t);
  const retained = value.retainEnvelope();
  value.evidence.envelope_ref = 'another-envelope.json';
  assert.throws(
    () => verifyEvidenceEnvelope(retained.reference, bindingOptions(value)),
    hasIssue('envelope_reference_mismatch'),
  );

  const alias = 'renamed-envelope.json';
  fs.copyFileSync(retained.envelopePath, path.join(value.evidenceRoot, alias));
  const aliasBytes = fs.readFileSync(path.join(value.evidenceRoot, alias));
  value.evidence.envelope_ref = alias;
  assert.throws(
    () => verifyEvidenceEnvelope(
      { ref: alias, digest: digest(aliasBytes), bytes: aliasBytes.length },
      bindingOptions(value),
    ),
    hasIssue('content_address_mismatch'),
  );

  value.evidence.envelope_ref = retained.reference.ref;
  assert.throws(
    () => verifyEvidenceEnvelope(
      { ...retained.reference, ref: '../command-envelope.json' },
      bindingOptions(value),
    ),
    hasIssue('unsafe_locator'),
  );

  const symlinkRef = 'linked-envelope.json';
  fs.symlinkSync(retained.envelopePath, path.join(value.evidenceRoot, symlinkRef));
  value.evidence.envelope_ref = symlinkRef;
  assert.throws(
    () => verifyEvidenceEnvelope(
      { ...retained.reference, ref: symlinkRef },
      bindingOptions(value),
    ),
    hasIssue('retained_evidence_not_regular'),
  );
});
