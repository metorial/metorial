#!/usr/bin/env bun

import { parseArgs } from 'node:util';
import { type IntegrationPackage, listIntegrationPackages } from './lib/integration-packages';
import { classifyLookup, getRegistryTarget, lookupVersions } from './lib/slate-registry';

type MatrixEntry = {
  label: string;
  directories: string;
};

// GitHub rejects a matrix with more than 256 jobs.
const MAX_MATRIX_JOBS = 256;
const HELP_TEXT = `
Usage:
  bun scripts/get-updated-integrations.ts [--filter <pattern>]

Prints {"matrix": {"include": [...]}, "blocked": [...]}: a GitHub Actions matrix of
at most ${MAX_MATRIX_JOBS} jobs for integration versions missing from the Slates
registry (SLATES_REGISTRY_URL, SLATES_REGISTRY_TOKEN), and the integrations that
cannot be published, for example because their scope is missing.

Options:
  --filter <pattern>   Filter by package name, slate.json name, or directory name
                       with exact values or "*" wildcards. Repeat the flag or
                       provide a comma-separated list.

Examples:
  bun scripts/get-updated-integrations.ts
  bun scripts/get-updated-integrations.ts --filter @slates-integrations/google-*
  bun scripts/get-updated-integrations.ts --filter slack,@github/github
`.trim();

async function main() {
  const { values } = parseArgs({
    options: {
      filter: { type: 'string', multiple: true },
      help: { type: 'boolean', short: 'h' }
    },
    strict: true
  });
  if (values.help) {
    console.log(HELP_TEXT);
    return;
  }

  const filters = (values.filter ?? []).flatMap(value =>
    value
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
  );
  const target = getRegistryTarget();
  const integrations = (await listIntegrationPackages()).filter(integration =>
    matchesAnyFilter(
      [integration.name, integration.slateName, integration.directory.split('/')[1]!],
      filters
    )
  );

  if (filters.length > 0 && integrations.length === 0) {
    throw new Error(`No integration matches --filter ${filters.join(',')}.`);
  }
  assertUniqueSlateNames(integrations);

  console.error(
    `Checking ${integrations.length} integration package${integrations.length === 1 ? '' : 's'}...`
  );

  const unpublished: IntegrationPackage[] = [];
  const blocked: string[] = [];
  const results = await lookupVersions(
    target,
    integrations.map(integration => ({
      identifier: integration.slateName,
      version: integration.version
    }))
  );

  results.forEach((result, index) => {
    const integration = integrations[index]!;
    const spec = `${integration.slateName}@${integration.version} (${integration.directory})`;
    const outcome = classifyLookup(result.status);

    if (outcome.kind === 'missing') {
      console.error(`Needs publish: ${spec}`);
      unpublished.push(integration);
    } else if (outcome.kind === 'skip') {
      console.error(`::warning::Skipping ${spec}: ${outcome.reason}.`);
    } else if (outcome.kind === 'blocked') {
      console.error(`::error::Cannot publish ${spec}: ${outcome.reason}.`);
      blocked.push(`${spec}: ${outcome.reason}`);
    }
  });

  const include = toMatrixEntries(
    unpublished.sort((left, right) => left.name.localeCompare(right.name))
  );

  console.error(
    `Found ${unpublished.length} unpublished integration version${unpublished.length === 1 ? '' : 's'} in ${include.length} job${include.length === 1 ? '' : 's'}; ${blocked.length} blocked.`
  );

  process.stdout.write(`${JSON.stringify({ matrix: { include }, blocked })}\n`);
}

function assertUniqueSlateNames(integrations: IntegrationPackage[]) {
  const directoriesByName = new Map<string, string[]>();
  for (const integration of integrations) {
    directoriesByName.set(integration.slateName, [
      ...(directoriesByName.get(integration.slateName) ?? []),
      integration.directory
    ]);
  }

  const duplicates = [...directoriesByName].filter(
    ([, directories]) => directories.length > 1
  );
  if (duplicates.length > 0) {
    throw new Error(
      `Several directories share a slate.json name:\n${duplicates.map(([name, directories]) => `  ${name}: ${directories.join(', ')}`).join('\n')}`
    );
  }
}

function toMatrixEntries(integrations: IntegrationPackage[]): MatrixEntry[] {
  const batchSize = Math.ceil(integrations.length / MAX_MATRIX_JOBS);
  const entries: MatrixEntry[] = [];

  for (let index = 0; index < integrations.length; index += batchSize) {
    const batch = integrations.slice(index, index + batchSize);
    entries.push({
      label:
        batch.length === 1
          ? `${batch[0]!.slateName}@${batch[0]!.version}`
          : `${batch[0]!.slateName} and ${batch.length - 1} more`,
      directories: batch.map(integration => integration.directory).join(' ')
    });
  }

  return entries;
}

function matchesAnyFilter(names: string[], filters: string[]): boolean {
  if (filters.length === 0) {
    return true;
  }

  return filters.some(filter => {
    const pattern = wildcardToRegExp(filter);
    return names.some(name => pattern.test(name));
  });
}

function wildcardToRegExp(pattern: string): RegExp {
  const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escapedPattern}$`);
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
