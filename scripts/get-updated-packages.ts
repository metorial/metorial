#!/usr/bin/env bun

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'bun';

type WorkspacePackage = {
  directory: string;
  hasBuildScript: boolean;
  name: string;
  version: string;
};

type MatrixEntry = WorkspacePackage;

type MatrixOutput = {
  include: MatrixEntry[];
};

type CliOptions = {
  filters: string[];
};

const PACKAGES_DIRECTORY = path.resolve(import.meta.dir, '..', 'packages');
const REGISTRY_RETRY_ATTEMPTS = 5;
const REGISTRY_RETRY_BASE_DELAY_MS = 2_000;
const HELP_TEXT = `
Usage:
  bun scripts/get-updated-packages.ts [--filter <pattern>]

Options:
  --filter <pattern>   Filter package names with exact values or "*" wildcards.
                       Repeat the flag or provide a comma-separated list.

Examples:
  bun scripts/get-updated-packages.ts
  bun scripts/get-updated-packages.ts --filter @slates/*
  bun scripts/get-updated-packages.ts --filter slates,@slates/test
`.trim();

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const packages = await getWorkspacePackages();
  const matchingPackages = packages.filter(pkg => matchesAnyFilter(pkg.name, options.filters));

  console.error(
    `Checking ${matchingPackages.length} package${matchingPackages.length === 1 ? '' : 's'} on npm...`
  );

  const unpublishedPackages = await filterUnpublishedPackages(matchingPackages, 20);
  const output: MatrixOutput = {
    include: unpublishedPackages.sort((left, right) => left.name.localeCompare(right.name))
  };

  console.error(
    `Found ${output.include.length} unpublished package version${output.include.length === 1 ? '' : 's'}.`
  );

  process.stdout.write(`${JSON.stringify(output)}\n`);
}

function parseArgs(args: string[]): CliOptions {
  const filters: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--help' || argument === '-h') {
      console.log(HELP_TEXT);
      process.exit(0);
    }

    if (argument === '--filter') {
      const value = args[index + 1];

      if (!value) {
        throw new Error('Missing value for --filter.');
      }

      filters.push(...splitFilters(value));
      index += 1;
      continue;
    }

    if (argument.startsWith('--filter=')) {
      filters.push(...splitFilters(argument.slice('--filter='.length)));
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return {
    filters: filters.filter(Boolean)
  };
}

function splitFilters(value: string): string[] {
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

async function getWorkspacePackages(): Promise<WorkspacePackage[]> {
  const directoryEntries = await readdir(PACKAGES_DIRECTORY, { withFileTypes: true });
  const packages = await Promise.all(
    directoryEntries
      .filter(entry => entry.isDirectory())
      .map(async entry => {
        const packageJsonPath = path.join(PACKAGES_DIRECTORY, entry.name, 'package.json');
        const packageJsonRaw = await readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonRaw) as {
          name?: string;
          private?: boolean;
          scripts?: {
            build?: string;
          };
          version?: string;
        };

        if (packageJson.private) {
          return null;
        }

        if (!packageJson.name || !packageJson.version) {
          throw new Error(`Missing name or version in ${packageJsonPath}.`);
        }

        return {
          directory: path.posix.join('packages', entry.name),
          hasBuildScript: Boolean(packageJson.scripts?.build),
          name: packageJson.name,
          version: packageJson.version
        } satisfies WorkspacePackage;
      })
  );

  return packages.filter((pkg): pkg is WorkspacePackage => pkg !== null);
}

function matchesAnyFilter(packageName: string, filters: string[]): boolean {
  if (filters.length === 0) {
    return true;
  }

  return filters.some(filter => wildcardToRegExp(filter).test(packageName));
}

function wildcardToRegExp(pattern: string): RegExp {
  const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escapedPattern}$`);
}

async function filterUnpublishedPackages(
  packages: WorkspacePackage[],
  concurrency: number
): Promise<WorkspacePackage[]> {
  const unpublished: WorkspacePackage[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < packages.length) {
      const pkg = packages[cursor];
      cursor += 1;

      const isPublished = await hasPublishedVersion(pkg);

      if (!isPublished) {
        unpublished.push(pkg);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, packages.length) }, () => worker())
  );

  return unpublished;
}

async function hasPublishedVersion(pkg: WorkspacePackage): Promise<boolean> {
  const spec = `${pkg.name}@${pkg.version}`;
  const result = await npmViewWithRetries(spec);

  if (result.exitCode === 0) {
    console.error(`Published already: ${spec}`);
    return true;
  }

  const stderr = new TextDecoder().decode(result.stderr).trim();

  if (stderr.includes('E404') || stderr.includes('404 Not Found')) {
    console.error(`Needs publish: ${spec}`);
    return false;
  }

  throw new Error(
    `Failed to query npm for ${spec}: ${stderr || `exit code ${result.exitCode}`}`
  );
}

async function npmViewWithRetries(spec: string) {
  for (let attempt = 1; attempt <= REGISTRY_RETRY_ATTEMPTS; attempt += 1) {
    const result = await $`npm view ${spec} version --json --loglevel=error`.quiet().nothrow();
    const stderr = new TextDecoder().decode(result.stderr).trim();

    if (!isRateLimitError(stderr)) {
      return result;
    }

    if (attempt === REGISTRY_RETRY_ATTEMPTS) {
      return result;
    }

    const delayMs = getRetryDelayMs(attempt);
    console.error(
      `npm rate limit while checking ${spec}. Retrying in ${delayMs}ms (${attempt}/${REGISTRY_RETRY_ATTEMPTS})...`
    );
    await sleep(delayMs);
  }

  throw new Error(`Retry loop exited unexpectedly for ${spec}.`);
}

function isRateLimitError(stderr: string): boolean {
  return stderr.includes('E429') || stderr.includes('429 Too Many Requests');
}

function getRetryDelayMs(attempt: number): number {
  return REGISTRY_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
}

function sleep(delayMs: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, delayMs);
  });
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
