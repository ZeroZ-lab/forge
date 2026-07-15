#!/usr/bin/env node

import process from 'node:process';

import { loadEffectivenessContract } from './lib/effectiveness-contract.mjs';
import { loadEvidenceEnvelopeContract } from './lib/evidence-envelope-contract.mjs';

try {
  const { manifest, coveredScenarios, reportContract } = loadEffectivenessContract(process.cwd());
  const envelopeContract = loadEvidenceEnvelopeContract(process.cwd());
  console.log(
    `Forge effectiveness-suite contract passed (${manifest.cases.length} held-out cases, ${coveredScenarios.size} scenarios, ${manifest.required_repeats} repeats required).`,
  );
  console.log(
    `Effectiveness report contract v${reportContract.schema.properties.schema_version.const} is registered; produced reports are not validated by this command.`,
  );
  console.log(
    `Evidence Envelope contract v${envelopeContract.schema.properties.schema_version.const} is registered; retained evidence is not validated by this command.`,
  );
  console.log('No run report supplied; real-world effectiveness is not claimed.');
} catch (error) {
  console.error(error.message);
  for (const issue of error.issues ?? []) console.error(`- ${issue}`);
  process.exit(1);
}
