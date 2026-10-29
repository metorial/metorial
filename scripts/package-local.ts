#!/usr/bin/env bun

import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'bun';
import { listIntegrationPackages } from './lib/integration-packages';
import { createSlateBundle } from './lib/slate-bundle';

type ResolvedIntegration = {
  directory: string;
  folderName: string;
  packageName: string;
  slateName: string;
};

const ROOT_DIRECTORY = path.resolve(import.meta.dir, '..');
const OUT_DIRECTORY = path.join(ROOT_DIRECTORY, 'out');
const HELP_TEXT = `
Usage:
  bun run package-local <slateIdentifier>

Arguments:
  slateIdentifier   Integration folder name, slate.json name (e.g. @metorial/slack),
                    or npm package name (e.g. @slates-integrations/slack).

Examples:
  bun run package-local apollo
  bun run package-local @metorial/apolloio
  bun run package-local @slates-integrations/apolloio
`.trim();

async function main() {
  const slateIdentifier = process.argv[2];

  if (!slateIdentifier || slateIdentifier === '--help' || slateIdentifier === '-h') {
    console.log(HELP_TEXT);
    process.exit(slateIdentifier ? 0 : 1);
  }

  const integration = await resolveIntegration(slateIdentifier);
  const packageDirectory = path.join(ROOT_DIRECTORY, integration.directory);
  const zipPath = path.join(OUT_DIRECTORY, `${integration.folderName}.zip`);

  console.error(`Packaging ${integration.packageName} from ${integration.directory}...`);

  await $`bun install`.cwd(ROOT_DIRECTORY).quiet();
  await $`bunx turbo run build --filter=${integration.packageName}`.cwd(ROOT_DIRECTORY);

  const bundle = await createSlateBundle(packageDirectory);
  try {
    await mkdir(OUT_DIRECTORY, { recursive: true });
    await copyFile(bundle.zipPath, zipPath);
  } finally {
    await bundle.cleanup();
  }

  console.error(`Wrote ${path.relative(ROOT_DIRECTORY, zipPath)}`);
}

async function resolveIntegration(slateIdentifier: string): Promise<ResolvedIntegration> {
  const integrations = await listIntegrations();

  const exactMatches = integrations.filter(integration =>
    [integration.folderName, integration.slateName, integration.packageName].includes(
      slateIdentifier
    )
  );

  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  if (exactMatches.length > 1) {
    throw new Error(
      `Slate identifier "${slateIdentifier}" matched multiple integrations: ${exactMatches
        .map(integration => integration.directory)
        .join(', ')}`
    );
  }

  const normalized = slateIdentifier.replace(/^@metorial\//, '');
  const normalizedMatches = integrations.filter(
    integration =>
      integration.folderName === normalized ||
      integration.slateName === `@metorial/${normalized}` ||
      integration.packageName.endsWith(`/${normalized}`)
  );

  if (normalizedMatches.length === 1) {
    return normalizedMatches[0];
  }

  const available = integrations
    .map(integration => integration.folderName)
    .sort((left, right) => left.localeCompare(right))
    .join(', ');

  throw new Error(
    `Could not resolve slate identifier "${slateIdentifier}". Try one of: ${available}`
  );
}

async function listIntegrations(): Promise<ResolvedIntegration[]> {
  return (await listIntegrationPackages()).map(integration => ({
    directory: integration.directory,
    folderName: path.basename(integration.directory),
    packageName: integration.name,
    slateName: integration.slateName
  }));
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
