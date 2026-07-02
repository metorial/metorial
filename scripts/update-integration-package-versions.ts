#!/usr/bin/env bun

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type DependencySection =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies';

type WorkspacePackage = {
  name: string;
  version: string;
};

type IntegrationPackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  [key: string]: unknown;
};

type CliOptions = {
  packageFilters: string[];
  integrationFilters: string[];
  dryRun: boolean;
};

type PackageUpdate = {
  dependencyName: string;
  from: string;
  to: string;
  section: DependencySection;
};

type ManifestUpdate = {
  directory: string;
  kind: 'package' | 'integration';
  packageName: string;
  updates: PackageUpdate[];
  versionBump: { from: string; to: string } | null;
};

type LoadedManifest = {
  directory: string;
  kind: 'package' | 'integration';
  path: string;
  packageJson: IntegrationPackageJson;
  packageName: string;
  originalVersion: string | null;
  newVersion: string | null;
  dependencyUpdates: PackageUpdate[];
};

const ROOT_DIRECTORY = path.resolve(import.meta.dir, '..');
const PACKAGES_DIRECTORY = path.join(ROOT_DIRECTORY, 'packages');
const INTEGRATION_DIRECTORIES = [
  path.join(ROOT_DIRECTORY, 'integrations'),
  path.join(ROOT_DIRECTORY, 'test-integrations')
] as const;
const DEPENDENCY_SECTIONS: DependencySection[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies'
];
const HELP_TEXT = `
Usage:
  bun scripts/update-integration-package-versions.ts [options]

Options:
  --package <name>       Update only matching workspace package names.
                         Repeat the flag or provide a comma-separated list.
  --integration <name>   Update only matching integration package names.
                         Repeat the flag or provide a comma-separated list.
  --dry-run              Print the planned updates without writing files.
  --help, -h             Show this help text.

Examples:
  bun scripts/update-integration-package-versions.ts --package slates,@slates/test
  bun scripts/update-integration-package-versions.ts --package @slates/* --dry-run
  bun scripts/update-integration-package-versions.ts --package slates --integration @slates-integrations/google-*
`.trim();

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const workspacePackages = await getWorkspacePackages();
  const selectedPackages = workspacePackages.filter(pkg =>
    matchesAnyFilter(pkg.name, options.packageFilters)
  );

  if (selectedPackages.length === 0) {
    const scopeDescription =
      options.packageFilters.length === 0
        ? 'the packages workspace'
        : `filters: ${options.packageFilters.join(', ')}`;
    throw new Error(`No workspace packages matched ${scopeDescription}.`);
  }

  const selectedPackageNames = new Set(selectedPackages.map(pkg => pkg.name));
  const latestVersions = new Map(workspacePackages.map(pkg => [pkg.name, pkg.version]));
  const manifestTargets = await getManifestTargets();
  const packageTargets = manifestTargets.filter(target => target.kind === 'package');
  const integrationTargets = manifestTargets.filter(target => target.kind === 'integration');

  console.error(
    `Syncing workspace package versions across ${packageTargets.length} package manifest${
      packageTargets.length === 1 ? '' : 's'
    }...`
  );
  const packageUpdates = await syncPackageManifests(packageTargets, {
    latestVersions,
    selectedPackageNames,
    dryRun: options.dryRun
  });
  reportPhase('Syncing workspace package versions', packageUpdates, options.dryRun);

  console.error(
    `Updating ${integrationTargets.length} integration manifest${
      integrationTargets.length === 1 ? '' : 's'
    } if needed...`
  );
  const integrationUpdates = await updateIntegrationManifests(integrationTargets, {
    latestVersions,
    selectedPackageNames,
    dryRun: options.dryRun,
    integrationFilters: options.integrationFilters
  });
  reportPhase('Updating integrations', integrationUpdates, options.dryRun);

  const allUpdates = [...packageUpdates, ...integrationUpdates];
  if (allUpdates.length === 0) {
    console.error('No workspace dependencies needed updating.');
    return;
  }

  const totalDependencyUpdates = allUpdates.reduce(
    (sum, manifest) => sum + manifest.updates.length,
    0
  );
  const totalVersionBumps = allUpdates.filter(
    manifest => manifest.versionBump !== null
  ).length;
  console.error(
    `${options.dryRun ? 'Planned' : 'Applied'} ${totalDependencyUpdates} dependency update${
      totalDependencyUpdates === 1 ? '' : 's'
    } and ${totalVersionBumps} version bump${
      totalVersionBumps === 1 ? '' : 's'
    } across ${allUpdates.length} manifest${allUpdates.length === 1 ? '' : 's'} (${
      packageUpdates.length
    } package${packageUpdates.length === 1 ? '' : 's'}, ${integrationUpdates.length} integration${
      integrationUpdates.length === 1 ? '' : 's'
    }).`
  );
}

type SyncPackagesOptions = {
  latestVersions: Map<string, string>;
  selectedPackageNames: Set<string>;
  dryRun: boolean;
};

async function syncPackageManifests(
  targets: ReadonlyArray<{ directory: string; kind: 'package' | 'integration' }>,
  options: SyncPackagesOptions
): Promise<ManifestUpdate[]> {
  const manifests = await Promise.all(targets.map(loadManifest));

  const maxPasses = manifests.length + 2;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let changedInPass = false;

    for (const manifest of manifests) {
      const applied = applyDependencyUpdates(
        manifest,
        options.latestVersions,
        options.selectedPackageNames
      );

      if (applied.length === 0) continue;

      changedInPass = true;

      if (manifest.newVersion === null) {
        const currentVersion = manifest.originalVersion;
        if (!currentVersion) {
          throw new Error(
            `Cannot bump version for ${manifest.packageName}: missing "version" in ${manifest.path}.`
          );
        }
        const bumped = bumpVersion(currentVersion);
        manifest.newVersion = bumped;
        manifest.packageJson.version = bumped;
        options.latestVersions.set(manifest.packageName, bumped);
        options.selectedPackageNames.add(manifest.packageName);
      }
    }

    if (!changedInPass) break;

    if (pass === maxPasses - 1) {
      throw new Error(
        'Package version sync did not converge. Check for dependency cycles in packages/*.'
      );
    }
  }

  const updates = manifests
    .filter(manifest => manifest.dependencyUpdates.length > 0)
    .map(toManifestUpdate);

  if (!options.dryRun) {
    await Promise.all(
      manifests
        .filter(manifest => manifest.dependencyUpdates.length > 0)
        .map(manifest => writeManifest(manifest))
    );
  }

  return updates;
}

type UpdateIntegrationsOptions = {
  latestVersions: Map<string, string>;
  selectedPackageNames: Set<string>;
  dryRun: boolean;
  integrationFilters: string[];
};

async function updateIntegrationManifests(
  targets: ReadonlyArray<{ directory: string; kind: 'package' | 'integration' }>,
  options: UpdateIntegrationsOptions
): Promise<ManifestUpdate[]> {
  const updates: ManifestUpdate[] = [];

  for (const target of targets) {
    const manifest = await loadManifest(target);

    if (!matchesAnyFilter(manifest.packageName, options.integrationFilters)) {
      continue;
    }

    const applied = applyDependencyUpdates(
      manifest,
      options.latestVersions,
      options.selectedPackageNames
    );

    if (applied.length === 0) continue;

    if (manifest.originalVersion) {
      manifest.newVersion = bumpVersion(manifest.originalVersion);
      manifest.packageJson.version = manifest.newVersion;
    }

    updates.push(toManifestUpdate(manifest));

    if (!options.dryRun) {
      await writeManifest(manifest);
    }
  }

  return updates;
}

async function loadManifest(target: {
  directory: string;
  kind: 'package' | 'integration';
}): Promise<LoadedManifest> {
  const packageJsonPath = path.join(target.directory, 'package.json');
  const raw = await readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(raw) as IntegrationPackageJson;
  const packageName = packageJson.name ?? path.basename(target.directory);
  const version = packageJson.version;

  return {
    directory: target.directory,
    kind: target.kind,
    path: packageJsonPath,
    packageJson,
    packageName,
    originalVersion: typeof version === 'string' ? version : null,
    newVersion: null,
    dependencyUpdates: []
  };
}

async function writeManifest(manifest: LoadedManifest): Promise<void> {
  await writeFile(manifest.path, `${JSON.stringify(manifest.packageJson, null, 2)}\n`, 'utf8');
}

function toManifestUpdate(manifest: LoadedManifest): ManifestUpdate {
  return {
    directory: manifest.directory,
    kind: manifest.kind,
    packageName: manifest.packageName,
    updates: manifest.dependencyUpdates,
    versionBump:
      manifest.newVersion && manifest.originalVersion
        ? { from: manifest.originalVersion, to: manifest.newVersion }
        : null
  };
}

function applyDependencyUpdates(
  manifest: LoadedManifest,
  latestVersions: Map<string, string>,
  selectedPackageNames: Set<string>
): PackageUpdate[] {
  const applied = updateDependencySections(
    manifest.packageJson,
    latestVersions,
    selectedPackageNames
  );

  for (const update of applied) {
    const existing = manifest.dependencyUpdates.find(
      existingUpdate =>
        existingUpdate.dependencyName === update.dependencyName &&
        existingUpdate.section === update.section
    );

    if (existing) {
      existing.to = update.to;
    } else {
      manifest.dependencyUpdates.push(update);
    }
  }

  return applied;
}

function bumpVersion(version: string): string {
  const prereleaseMatch = version.match(/^(.+-[A-Za-z0-9]+\.)(\d+)$/);
  if (prereleaseMatch) {
    const [, prefix, counter] = prereleaseMatch;
    return `${prefix}${Number(counter) + 1}`;
  }

  const semverMatch = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (semverMatch) {
    const [, major, minor, patch] = semverMatch;
    return `${major}.${minor}.${Number(patch) + 1}`;
  }

  throw new Error(
    `Unsupported version format "${version}". Expected "X.Y.Z" or "X.Y.Z-<tag>.<n>".`
  );
}

function reportPhase(phaseLabel: string, updates: ManifestUpdate[], dryRun: boolean): void {
  if (updates.length === 0) {
    console.error(`${phaseLabel}: no changes needed.`);
    return;
  }

  for (const manifest of updates) {
    console.error(
      `${dryRun ? 'Would update' : 'Updated'} ${manifest.packageName} (${manifest.kind}):`
    );
    if (manifest.versionBump) {
      console.error(`  version: ${manifest.versionBump.from} -> ${manifest.versionBump.to}`);
    }
    for (const update of manifest.updates) {
      console.error(
        `  ${update.section} ${update.dependencyName}: ${update.from} -> ${update.to}`
      );
    }
  }
}

function parseArgs(args: string[]): CliOptions {
  const packageFilters: string[] = [];
  const integrationFilters: string[] = [];
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

    if (argument === '--package') {
      const value = args[index + 1];
      if (!value) {
        throw new Error('Missing value for --package.');
      }
      packageFilters.push(...splitFilters(value));
      index += 1;
      continue;
    }

    if (argument.startsWith('--package=')) {
      packageFilters.push(...splitFilters(argument.slice('--package='.length)));
      continue;
    }

    if (argument === '--integration') {
      const value = args[index + 1];
      if (!value) {
        throw new Error('Missing value for --integration.');
      }
      integrationFilters.push(...splitFilters(value));
      index += 1;
      continue;
    }

    if (argument.startsWith('--integration=')) {
      integrationFilters.push(...splitFilters(argument.slice('--integration='.length)));
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return {
    packageFilters: packageFilters.filter(Boolean),
    integrationFilters: integrationFilters.filter(Boolean),
    dryRun
  };
}

function splitFilters(value: string): string[] {
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

async function getWorkspacePackages(): Promise<WorkspacePackage[]> {
  const entries = await readdir(PACKAGES_DIRECTORY, { withFileTypes: true });
  const packages = await Promise.all(
    entries
      .filter(entry => entry.isDirectory())
      .map(async entry => {
        const packageJsonPath = path.join(PACKAGES_DIRECTORY, entry.name, 'package.json');
        const raw = await readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(raw) as { name?: string; version?: string };

        if (!packageJson.name || !packageJson.version) {
          throw new Error(`Missing name or version in ${packageJsonPath}.`);
        }

        return {
          name: packageJson.name,
          version: packageJson.version
        } satisfies WorkspacePackage;
      })
  );

  return packages.sort((left, right) => left.name.localeCompare(right.name));
}

async function getManifestTargets(): Promise<
  Array<{ directory: string; kind: 'package' | 'integration' }>
> {
  const [packageEntries, ...integrationEntryLists] = await Promise.all([
    readdir(PACKAGES_DIRECTORY, { withFileTypes: true }),
    ...INTEGRATION_DIRECTORIES.map(dir => readdir(dir, { withFileTypes: true }))
  ]);

  const integrationTargets = INTEGRATION_DIRECTORIES.flatMap((dir, index) =>
    integrationEntryLists[index]
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        directory: path.join(dir, entry.name),
        kind: 'integration' as const
      }))
  );

  return [
    ...packageEntries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        directory: path.join(PACKAGES_DIRECTORY, entry.name),
        kind: 'package' as const
      })),
    ...integrationTargets
  ].sort((left, right) => left.directory.localeCompare(right.directory));
}

function updateDependencySections(
  packageJson: IntegrationPackageJson,
  latestVersions: Map<string, string>,
  allowedPackageNames: Set<string>
): PackageUpdate[] {
  const updates: PackageUpdate[] = [];

  for (const section of DEPENDENCY_SECTIONS) {
    const dependencies = packageJson[section];
    if (!dependencies) continue;

    for (const [dependencyName, currentVersion] of Object.entries(dependencies)) {
      if (!allowedPackageNames.has(dependencyName)) continue;

      const latestVersion = latestVersions.get(dependencyName);
      if (!latestVersion || currentVersion === latestVersion) {
        continue;
      }

      dependencies[dependencyName] = latestVersion;
      updates.push({
        dependencyName,
        from: currentVersion,
        to: latestVersion,
        section
      });
    }
  }

  return updates;
}

function matchesAnyFilter(value: string, filters: string[]): boolean {
  if (filters.length === 0) {
    return true;
  }

  return filters.some(filter => wildcardToRegExp(filter).test(value));
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
