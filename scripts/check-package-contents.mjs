#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';

import { assertPackageContents } from './lib/package-contract.mjs';

try {
  const receipt = assertPackageContents(path.resolve(process.cwd()));
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
