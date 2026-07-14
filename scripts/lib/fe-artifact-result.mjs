function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringList(value, field) {
  if (!Array.isArray(value) || !Array.from(value).every(nonEmptyString)) {
    throw new Error(`${field} must be an array of non-empty strings`);
  }
  return [...value];
}

function previewFields(preview) {
  if (preview === null) {
    return {
      preview_status: 'not_run',
      preview_evidence: null,
    };
  }
  if (
    typeof preview !== 'object' ||
    !['available', 'unavailable'].includes(preview.status)
  ) {
    throw new Error('preview status must be available or unavailable');
  }
  if (!nonEmptyString(preview.evidence)) {
    throw new Error('preview evidence must be a non-empty string');
  }
  return {
    preview_status: preview.status,
    preview_evidence: preview.evidence,
  };
}

export function createFeArtifactReceipt({
  changedFiles,
  preview = null,
  verifier = null,
  unverifiedItems,
  rollback,
}) {
  const changed_files = stringList(changedFiles, 'changedFiles');
  if (changed_files.length === 0) {
    throw new Error('changedFiles must contain at least one path');
  }
  const unverified_items = stringList(unverifiedItems, 'unverifiedItems');
  if (!nonEmptyString(rollback)) {
    throw new Error('rollback must be a non-empty string');
  }

  const base = {
    changed_files,
    ...previewFields(preview),
  };

  if (verifier === null) {
    if (unverified_items.length === 0) {
      throw new Error('unverifiedItems must identify remaining uncertainty');
    }
    return {
      result: 'implemented_unverified',
      ...base,
      verifier: 'not_run',
      verification_target: 'not_run',
      verification_outcome: 'not_run',
      evidence: null,
      unverified_items,
      rollback,
    };
  }

  if (
    typeof verifier !== 'object' ||
    !['passed', 'failed'].includes(verifier.outcome)
  ) {
    throw new Error('verifier outcome must be passed or failed');
  }
  for (const field of ['name', 'target', 'evidence']) {
    if (!nonEmptyString(verifier[field])) {
      throw new Error(`verifier ${field} must be a non-empty string`);
    }
  }
  if (verifier.outcome === 'failed' && unverified_items.length === 0) {
    throw new Error('unverifiedItems must identify remaining uncertainty');
  }

  return {
    result: verifier.outcome === 'passed' ? 'verified' : 'verification_failed',
    ...base,
    verifier: verifier.name,
    verification_target: verifier.target,
    verification_outcome: verifier.outcome,
    evidence: verifier.evidence,
    unverified_items,
    rollback,
  };
}
