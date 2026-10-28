#!/usr/bin/env bun

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { type IntegrationPackage, listIntegrationPackages } from './lib/integration-packages';
import { readStoredSlateBundle } from './lib/slate-bundle';
import {
  classifyLookup,
  getRegistryTarget,
  lookupVersions,
  uploadVersion
} from './lib/slate-registry';

const DEFAULT_CONCURRENCY = 4;
const HELP_TEXT = `
Usage:
  bun scripts/upload-integration.ts --bundle-dir <dir> --expected-matrix-env <name> [--concurrency <n>]

Uploads the bundles that scripts/bundle-integration.ts wrote for every directory in
the detection matrix (read from the environment variable <name>) to the Slates
registry (SLATES_REGISTRY_URL, SLATES_REGISTRY_TOKEN), skipping versions it already
has. New slates are created public; existing slates keep their access. A failed integration does not stop the others; the command exits
non-zero if any failed.
`.trim();

type UploadItem = {
  integration: IntegrationPackage;
  contentChecksum: string;
  zipPath: string;
};

async function main() {
  const { values } = parseArgs({
    options: {
      'bundle-dir': { type: 'string' },
      'expected-matrix-env': { type: 'string' },
      concurrency: { type: 'string', default: String(DEFAULT_CONCURRENCY) },
      help: { type: 'boolean', short: 'h' }
    },
    strict: true
  });
  if (values.help) {
    console.log(HELP_TEXT);
    return;
  }

  const bundleDirectory = values['bundle-dir'];
  const matrixVariable = values['expected-matrix-env'];
  const concurrency = Number(values.concurrency);
  if (!bundleDirectory || !matrixVariable) {
    throw new Error('--bundle-dir and --expected-matrix-env are required.');
  }
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('--concurrency must be a positive integer.');
  }

  const failures: string[] = [];
  const items = await resolveUploadItems(
    path.resolve(bundleDirectory),
    readMatrixDirectories(matrixVariable),
    failures
  );
  const target = getRegistryTarget();
  const lookups = await lookupVersions(
    target,
    items.map(item => ({
      identifier: item.integration.slateName,
      version: item.integration.version
    }))
  );

  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index]!;
      const lookup = lookups[index]!;
      const spec = `${item.integration.slateName}@${item.integration.version}`;

      try {
        const outcome = classifyLookup(lookup.status);
        if (outcome.kind === 'published') {
          if (lookup.checksum && lookup.checksum !== item.contentChecksum) {
            console.error(
              `::warning::${spec} is already published with different contents. Bump the version in package.json to publish the change.`
            );
          }
          console.error(`${spec}: already published.`);
        } else if (outcome.kind === 'skip') {
          console.error(`::warning::${spec}: skipped, ${outcome.reason}.`);
        } else if (outcome.kind === 'blocked') {
          throw new Error(`cannot publish: ${outcome.reason}.`);
        } else {
          const version = await uploadVersion(target, {
            slateName: item.integration.slateName,
            version: item.integration.version,
            zip: new Uint8Array(await readFile(item.zipPath)),
            defaultAccess: 'public'
          });
          console.error(`${spec}: published (${version.id}).`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`::error::${item.integration.directory}: ${message}`);
        failures.push(`${item.integration.directory}: ${message}`);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  if (failures.length > 0) {
    throw new Error(
      `${failures.length} integration${failures.length === 1 ? '' : 's'} failed:\n${failures.map(failure => `  ${failure}`).join('\n')}`
    );
  }

  console.error(`Processed ${items.length} integration${items.length === 1 ? '' : 's'}.`);
}

function readMatrixDirectories(variable: string): string[] {
  const raw = process.env[variable];
  if (!raw) {
    throw new Error(`${variable} is not set.`);
  }

  const matrix = JSON.parse(raw) as { include?: { directories?: string }[] };
  return [
    ...new Set(
      (matrix.include ?? []).flatMap(entry =>
        (entry.directories ?? '').split(' ').filter(Boolean)
      )
    )
  ];
}

// Bundles come from untrusted build jobs: trust only their zip, for what the checkout expects.
async function resolveUploadItems(
  bundleDirectory: string,
  directories: string[],
  failures: string[]
): Promise<UploadItem[]> {
  const integrationsByDirectory = new Map(
    (await listIntegrationPackages()).map(integration => [integration.directory, integration])
  );
  const items: UploadItem[] = [];

  for (const directory of directories) {
    const integration = integrationsByDirectory.get(directory);
    const bundle = integration && (await readStoredSlateBundle(bundleDirectory, directory));
    const problem = !integration
      ? 'not a publishable integration in this checkout'
      : !bundle
        ? 'no bundle was built (see the build job)'
        : bundle.slateName !== integration.slateName || bundle.version !== integration.version
          ? `bundle is for ${bundle.slateName}@${bundle.version}, but the checkout has ${integration.slateName}@${integration.version}`
          : null;

    if (problem || !integration || !bundle) {
      console.error(`::error::${directory}: ${problem}`);
      failures.push(`${directory}: ${problem}`);
      continue;
    }

    items.push({
      integration,
      contentChecksum: bundle.contentChecksum,
      zipPath: bundle.zipPath
    });
  }

  return items;
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
