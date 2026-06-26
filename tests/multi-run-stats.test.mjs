import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ciGate,
  mean,
  sampleStandardDeviation,
  summarizeSamples,
} from '../scripts/lib/multi-run-stats.mjs';

test('multi-run stats computes mean, sample standard deviation, and confidence bounds', () => {
  assert.equal(mean([80, 90, 100]), 90);
  assert.equal(Math.round(sampleStandardDeviation([80, 90, 100]) * 10) / 10, 10);

  const summary = summarizeSamples([80, 90, 100]);
  assert.equal(summary.n, 3);
  assert.equal(summary.mean, 90);
  assert.equal(summary.zero_variance, false);
  assert.ok(summary.ci_low < summary.mean);
  assert.ok(summary.ci_high > summary.mean);
});

test('ciGate rejects single-run comparisons as statistically unmeasurable', () => {
  const gate = ciGate({ forgeSamples: [100], baselineSamples: [30] });

  assert.equal(gate.passed, false);
  assert.match(gate.issues.join('\n'), /at least 2 scored samples/);
});

test('ciGate rejects repeated identical samples unless provenance is distinct', () => {
  const rejected = ciGate({ forgeSamples: [100, 100, 100], baselineSamples: [30, 30, 30] });
  assert.equal(rejected.passed, false);
  assert.match(rejected.issues.join('\n'), /zero-variance/);

  const allowed = ciGate({
    forgeSamples: [100, 100, 100],
    baselineSamples: [30, 30, 30],
    allowZeroVariance: true,
  });
  assert.equal(allowed.passed, true);
});

test('ciGate requires Forge lower confidence bound to beat baseline upper bound', () => {
  const failed = ciGate({ forgeSamples: [70, 72, 74], baselineSamples: [68, 70, 72] });
  assert.equal(failed.passed, false);

  const passed = ciGate({ forgeSamples: [92, 94, 96], baselineSamples: [40, 44, 48] });
  assert.equal(passed.passed, true);
});
