#!/usr/bin/env bun

import path from 'node:path';
import { parseArgs } from 'node:util';
import { createSlateBundle, storeSlateBundle } from './lib/slate-bundle';

const HELP_TEXT = `
Usage:
  bun scripts/bundle-integration.ts --out <dir> <directory>...

Writes the registry upload bundle of each already built integration directory (for
example integrations/slack) into <dir>, for scripts/upload-integration.ts. A failed
integration does not stop the others; the command exits non-zero if any failed.
`.trim();

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      out: { type: 'string' },
      help: { type: 'boolean', short: 'h' }
    },
    allowPositionals: true,
    strict: true
  });
  if (values.help) {
    console.log(HELP_TEXT);
    return;
  }
  if (!values.out || positionals.length === 0) {
    throw new Error(`Expected --out and at least one directory.\n\n${HELP_TEXT}`);
  }

  const outDirectory = path.resolve(values.out);
  const failures: string[] = [];

  for (const directory of positionals) {
    try {
      const bundle = await createSlateBundle(path.resolve(directory));
      try {
        await storeSlateBundle(bundle, outDirectory, directory);
        console.error(
          `Bundled ${bundle.slateName}@${bundle.version} (${bundle.files.length} files, ${bundle.contentChecksum}).`
        );
      } finally {
        await bundle.cleanup();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`::error::${directory}: ${message}`);
      failures.push(`${directory}: ${message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `${failures.length} of ${positionals.length} integration${positionals.length === 1 ? '' : 's'} failed to bundle:\n${failures.map(failure => `  ${failure}`).join('\n')}`
    );
  }
}

async function mainWithErrorHandling() {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

await mainWithErrorHandling();
