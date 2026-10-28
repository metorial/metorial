#!/usr/bin/env bun

import { access, copyFile, mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'bun';
import type { PackageJson } from './lib/prepare-package-for-publish';
import { createSlateBundle } from './lib/slate-bundle';

type ResolvedIntegration = {
  directory: string;
  folderName: string;
  packageName: string;
  slateName: string;
};

const ROOT_DIRECTORY = path.resolve(import.meta.dir, '..');
const INTEGRATION_ROOTS = ['integrations', 'test-integrations'] as const;
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
  const integrations: ResolvedIntegration[] = [];

  for (const root of INTEGRATION_ROOTS) {
    const rootDirectory = path.join(ROOT_DIRECTORY, root);
    const entries = await readdir(rootDirectory, { withFileTypes: true }).catch(() => []);

    for (const entry of entries.filter(item => item.isDirectory())) {
      const directory = path.posix.join(root, entry.name);
      const packageDirectory = path.join(ROOT_DIRECTORY, directory);
      const packageJsonPath = path.join(packageDirectory, 'package.json');

      if (!(await pathExists(packageJsonPath))) {
        continue;
      }

      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as PackageJson;
      if (!packageJson.name) {
        throw new Error(`Missing name in ${packageJsonPath}.`);
      }

      const slateJsonPath = path.join(packageDirectory, 'slate.json');
      let slateName: string | undefined;
      if (await pathExists(slateJsonPath)) {
        const slateJson = JSON.parse(await readFile(slateJsonPath, 'utf8')) as {
          name?: string;
        };
        slateName = slateJson.name;
      }

      integrations.push({
        directory,
        folderName: entry.name,
        packageName: packageJson.name,
        slateName: slateName ?? packageJson.name
      });
    }
  }

  return integrations;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
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
