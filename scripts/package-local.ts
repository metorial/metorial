#!/usr/bin/env bun

import { access, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { $ } from 'bun';
import {
  type PackageJson,
  preparePackageJsonForPublish
} from './lib/prepare-package-for-publish';

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
  const packageJsonPath = path.join(packageDirectory, 'package.json');
  const originalPackageJson = await readFile(packageJsonPath, 'utf8');
  const zipPath = path.join(OUT_DIRECTORY, `${integration.folderName}.zip`);

  console.error(`Packaging ${integration.packageName} from ${integration.directory}...`);

  try {
    await $`bun install`.cwd(ROOT_DIRECTORY).quiet();
    await $`bunx turbo run build --filter=${integration.packageName}`.cwd(ROOT_DIRECTORY);

    const packageJson = JSON.parse(originalPackageJson) as PackageJson;
    const publishPackageJson = await preparePackageJsonForPublish(
      packageDirectory,
      packageJson
    );

    await writeFile(
      packageJsonPath,
      `${JSON.stringify(publishPackageJson, null, 2)}\n`,
      'utf8'
    );

    const packResult = await $`npm pack --ignore-scripts`
      .cwd(packageDirectory)
      .quiet()
      .nothrow();
    if (packResult.exitCode !== 0) {
      throw new Error(
        `npm pack failed: ${new TextDecoder().decode(packResult.stderr).trim() || 'unknown error'}`
      );
    }

    const packOutput = new TextDecoder().decode(packResult.stdout).trim();
    const tarballName = packOutput.split('\n').at(-1)?.trim();
    if (!tarballName) {
      throw new Error('npm pack did not return a tarball filename.');
    }

    const tarballPath = path.join(packageDirectory, tarballName);
    const extractDirectory = await mkdtemp(path.join(tmpdir(), 'package-local-'));

    try {
      await $`tar -xzf ${tarballPath} -C ${extractDirectory}`.quiet();
      await $`mkdir -p ${OUT_DIRECTORY}`.quiet();
      await $`rm -f ${zipPath}`.quiet();
      await $`zip -qr ${zipPath} .`.cwd(path.join(extractDirectory, 'package')).quiet();
    } finally {
      await rm(extractDirectory, { force: true, recursive: true });
      await rm(tarballPath, { force: true });
    }

    console.error(`Wrote ${path.relative(ROOT_DIRECTORY, zipPath)}`);
  } finally {
    await writeFile(packageJsonPath, originalPackageJson, 'utf8');
  }
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
