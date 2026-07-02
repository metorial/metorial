#!/usr/bin/env bun

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  type PackageJson,
  preparePackageJsonForPublish
} from './lib/prepare-package-for-publish';

type CliOptions = {
  directory: string;
  dryRun: boolean;
};

const HELP_TEXT = `
Usage:
  bun scripts/prepare-package-for-publish.ts --directory <path> [--dry-run]

Options:
  --directory <path>   Package directory to prepare for npm publish.
  --dry-run            Print the planned package.json changes without writing.
  --help, -h           Show this help text.

Examples:
  bun scripts/prepare-package-for-publish.ts --directory integrations/apollo
  bun scripts/prepare-package-for-publish.ts --directory integrations/apollo --dry-run
`.trim();

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const packageDirectory = path.resolve(options.directory);
  const packageJsonPath = path.join(packageDirectory, 'package.json');
  const packageJsonRaw = await readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonRaw) as PackageJson;
  const packageName = packageJson.name ?? packageDirectory;
  const nextPackageJson = await preparePackageJsonForPublish(packageDirectory, packageJson);

  console.error(`Prepared ${packageName} for publish:`);
  console.error(`  main: ${packageJson.main ?? '(unset)'} -> ${nextPackageJson.main}`);
  console.error(`  files: ${JSON.stringify(nextPackageJson.files)}`);

  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify(nextPackageJson, null, 2)}\n`);
    return;
  }

  await writeFile(packageJsonPath, `${JSON.stringify(nextPackageJson, null, 2)}\n`, 'utf8');
}

function parseArgs(args: string[]): CliOptions {
  let directory: string | undefined;
  let dryRun = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--help' || argument === '-h') {
      console.log(HELP_TEXT);
      process.exit(0);
    }

    if (argument === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (argument === '--directory') {
      directory = args[index + 1];

      if (!directory) {
        throw new Error('Missing value for --directory.');
      }

      index += 1;
      continue;
    }

    if (argument.startsWith('--directory=')) {
      directory = argument.slice('--directory='.length);
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!directory) {
    throw new Error('Missing required --directory argument.');
  }

  return { directory, dryRun };
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
