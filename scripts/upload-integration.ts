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

Uploads the bundles that scripts/bundle-integration.ts wrote for every unpublished
directory in the detection matrix (read from the environment variable <name>) to the
Slates registry (SLATES_REGISTRY_URL, SLATES_REGISTRY_TOKEN). New slates are created
public; existing slates keep their access. A failed integration does not stop the
others; the command exits non-zero if any failed.
`.trim();

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
  const fail = (directory: string, message: string) => {
    console.error(`::error::${directory}: ${message}`);
    failures.push(`${directory}: ${message}`);
  };

  const integrationsByDirectory = new Map(
    (await listIntegrationPackages()).map(integration => [integration.directory, integration])
  );
  const integrations: IntegrationPackage[] = [];
  for (const directory of readMatrixDirectories(matrixVariable)) {
    const integration = integrationsByDirectory.get(directory);
    if (integration) {
      integrations.push(integration);
    } else {
      fail(directory, 'not a publishable integration in this checkout');
    }
  }

  const target = getRegistryTarget();
  const resolvedBundleDirectory = path.resolve(bundleDirectory);
  const lookups = await lookupVersions(
    target,
    integrations.map(integration => ({
      identifier: integration.slateName,
      version: integration.version
    }))
  );

  let cursor = 0;
  const worker = async () => {
    while (cursor < integrations.length) {
      const index = cursor;
      cursor += 1;
      const integration = integrations[index]!;
      const lookup = lookups[index]!;
      const spec = `${integration.slateName}@${integration.version}`;

      try {
        const outcome = classifyLookup(lookup.status);
        if (outcome.kind === 'published') {
          const bundle = await readStoredSlateBundle(
            resolvedBundleDirectory,
            integration.directory
          ).catch(() => null);
          if (bundle && lookup.checksum && lookup.checksum !== bundle.contentChecksum) {
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
          const zipPath = await resolveBundleZip(resolvedBundleDirectory, integration);
          const version = await uploadVersion(target, {
            slateName: integration.slateName,
            version: integration.version,
            zip: new Uint8Array(await readFile(zipPath)),
            defaultAccess: 'public'
          });
          console.error(`${spec}: published (${version.id}).`);
        }
      } catch (error) {
        fail(integration.directory, error instanceof Error ? error.message : String(error));
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, integrations.length) }, () => worker())
  );

  if (failures.length > 0) {
    throw new Error(
      `${failures.length} integration${failures.length === 1 ? '' : 's'} failed:\n${failures.map(failure => `  ${failure}`).join('\n')}`
    );
  }

  console.error(
    `Processed ${integrations.length} integration${integrations.length === 1 ? '' : 's'}.`
  );
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
async function resolveBundleZip(bundleDirectory: string, integration: IntegrationPackage) {
  const bundle = await readStoredSlateBundle(bundleDirectory, integration.directory);
  if (!bundle) {
    throw new Error('no bundle was built (see the build job)');
  }
  if (bundle.slateName !== integration.slateName || bundle.version !== integration.version) {
    throw new Error(
      `bundle is for ${bundle.slateName}@${bundle.version}, but the checkout has ${integration.slateName}@${integration.version}`
    );
  }
  return bundle.zipPath;
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
