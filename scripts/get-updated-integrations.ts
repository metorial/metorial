#!/usr/bin/env bun

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'bun';

type IntegrationPackage = {
  directory: string;
  name: string;
  version: string;
};

type MatrixEntry = IntegrationPackage;

type MatrixOutput = {
  include: MatrixEntry[];
};

type CliOptions = {
  filters: string[];
};

const INTEGRATION_ROOTS = [
  path.resolve(import.meta.dir, '..', 'integrations'),
  path.resolve(import.meta.dir, '..', 'test-integrations')
] as const;
const REGISTRY_RETRY_ATTEMPTS = 5;
const REGISTRY_RETRY_BASE_DELAY_MS = 2_000;
const HELP_TEXT = `
Usage:
  bun scripts/get-updated-integrations.ts [--filter <pattern>]

Options:
  --filter <pattern>   Filter package names with exact values or "*" wildcards.
                       Repeat the flag or provide a comma-separated list.

Examples:
  bun scripts/get-updated-integrations.ts
  bun scripts/get-updated-integrations.ts --filter @slates-integrations/google-*
  bun scripts/get-updated-integrations.ts --filter @slates-integrations/google-*,@slates-integrations/npm
`.trim();

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const integrations = await getIntegrationPackages();
  const matchingIntegrations = integrations.filter(integration =>
    matchesAnyFilter(integration.name, options.filters)
  );

  console.error(
    `Checking ${matchingIntegrations.length} integration package${matchingIntegrations.length === 1 ? '' : 's'} on npm...`
  );

  const unpublishedIntegrations = await filterUnpublishedIntegrations(
    matchingIntegrations,
    20
  );
  const output: MatrixOutput = {
    include: unpublishedIntegrations.sort((left, right) => left.name.localeCompare(right.name))
  };

  console.error(
    `Found ${output.include.length} unpublished integration version${output.include.length === 1 ? '' : 's'}.`
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

async function getIntegrationPackages(): Promise<IntegrationPackage[]> {
  const packages: IntegrationPackage[] = [];

  for (const root of INTEGRATION_ROOTS) {
    const directoryEntries = await readdir(root, { withFileTypes: true });
    const rootSegment = path.basename(root);

    for (const entry of directoryEntries.filter(e => e.isDirectory())) {
      const packageJsonPath = path.join(root, entry.name, 'package.json');
      const packageJsonRaw = await readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonRaw) as {
        name?: string;
        private?: boolean;
        version?: string;
      };

      if (packageJson.private) {
        continue;
      }

      if (!packageJson.name || !packageJson.version) {
        throw new Error(`Missing name or version in ${packageJsonPath}.`);
      }

      packages.push({
        directory: path.posix.join(rootSegment, entry.name),
        name: packageJson.name,
        version: packageJson.version
      });
    }
  }

  return packages;
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

async function filterUnpublishedIntegrations(
  integrations: IntegrationPackage[],
  concurrency: number
): Promise<IntegrationPackage[]> {
  const unpublished: IntegrationPackage[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < integrations.length) {
      const integration = integrations[cursor];
      cursor += 1;

      const isPublished = await hasPublishedVersion(integration);

      if (!isPublished) {
        unpublished.push(integration);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, integrations.length) }, () => worker())
  );

  return unpublished;
}

async function hasPublishedVersion(integration: IntegrationPackage): Promise<boolean> {
  const spec = `${integration.name}@${integration.version}`;
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
