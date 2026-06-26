function finiteValues(values) {
  return (Array.isArray(values) ? values : []).filter((value) => Number.isFinite(value));
}

export function mean(values) {
  const xs = finiteValues(values);
  if (xs.length === 0) return null;
  return xs.reduce((total, value) => total + value, 0) / xs.length;
}

export function sampleStandardDeviation(values) {
  const xs = finiteValues(values);
  if (xs.length < 2) return null;
  const avg = mean(xs);
  const variance = xs.reduce((total, value) => total + (value - avg) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

export function summarizeSamples(values, { z = 1.96 } = {}) {
  const xs = finiteValues(values);
  const avg = mean(xs);
  const sd = sampleStandardDeviation(xs);
  const zeroVariance = xs.length >= 2 && sd === 0;
  if (avg === null) {
    return { n: 0, mean: null, standard_deviation: null, ci_low: null, ci_high: null, zero_variance: false };
  }
  if (sd === null) {
    return { n: xs.length, mean: avg, standard_deviation: null, ci_low: null, ci_high: null, zero_variance: false };
  }
  const margin = z * (sd / Math.sqrt(xs.length));
  return {
    n: xs.length,
    mean: avg,
    standard_deviation: sd,
    ci_low: avg - margin,
    ci_high: avg + margin,
    zero_variance: zeroVariance,
  };
}

export function ciGate({ forgeSamples, baselineSamples, minDelta = 0, allowZeroVariance = false }) {
  const forge = summarizeSamples(forgeSamples);
  const baseline = summarizeSamples(baselineSamples);
  const issues = [];
  if (forge.n < 2 || baseline.n < 2) {
    issues.push('comparison requires at least 2 scored samples per arm');
  }
  if (!allowZeroVariance && (forge.zero_variance || baseline.zero_variance)) {
    issues.push('comparison has zero-variance samples; repeated identical scores are false precision');
  }
  const comparable =
    issues.length === 0 &&
    forge.ci_low !== null &&
    baseline.ci_high !== null;
  const passed = comparable && forge.ci_low >= baseline.ci_high + minDelta;
  return {
    passed,
    forge,
    baseline,
    min_delta: minDelta,
    issues,
  };
}
