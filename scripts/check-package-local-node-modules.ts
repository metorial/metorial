#!/usr/bin/env bun

import { lstat, readdir, readlink, rm, stat } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fix: boolean;
};

const WORKSPACE_PACKAGE_ROOTS = ['packages', 'integrations', 'test-integrations'] as const;
const GENERATED_DIRECTORIES = new Set(['.bin', '.cache', '.vite', '.vite-temp']);
const MAX_LISTED_DIRECTORIES = 80;
const HELP_TEXT = `
Usage:
  bun scripts/check-package-local-node-modules.ts [--fix]

Options:
  --fix   Remove unmanaged package-local node_modules directories.

Bun-managed isolated dependency links are allowed. Unmanaged package-local
node_modules directories can shadow workspace packages and make local builds
differ from clean CI builds.
`.trim();

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(import.meta.dir, '..');
  const directories = await findPackageLocalNodeModules(rootDir);

  if (directories.length === 0) {
    console.log('No unmanaged package-local node_modules directories found.');
    return;
  }

  if (options.fix) {
    for (const directory of directories) {
      await rm(path.join(rootDir, directory), { recursive: true, force: true });
    }

    console.log(
      `Removed ${directories.length} unmanaged package-local node_modules director${
        directories.length === 1 ? 'y' : 'ies'
      }.`
    );
    return;
  }

  console.error(
    `Found ${directories.length} unmanaged package-local node_modules director${
      directories.length === 1 ? 'y' : 'ies'
    }.`
  );
  console.error(
    'These can shadow workspace packages and make local builds differ from clean CI builds.'
  );
  console.error(
    'Run `bun run integrations:local-deps:clean` from the repo root, or `bun run local-deps:clean` from integrations/, to remove them.'
  );
  console.error('');
  console.error('Detected directories:');

  for (const directory of directories.slice(0, MAX_LISTED_DIRECTORIES)) {
    console.error(`- ${directory}`);
  }

  if (directories.length > MAX_LISTED_DIRECTORIES) {
    console.error(`...and ${directories.length - MAX_LISTED_DIRECTORIES} more.`);
  }

  process.exitCode = 1;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = { fix: false };

  for (const argument of args) {
    if (argument === '--help' || argument === '-h') {
      console.log(HELP_TEXT);
      process.exit(0);
    }

    if (argument === '--fix') {
      options.fix = true;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

async function findPackageLocalNodeModules(rootDir: string): Promise<string[]> {
  const directories: string[] = [];
  const storeRoots = [rootDir, path.dirname(rootDir)].map(directory =>
    path.join(directory, 'node_modules', '.bun')
  );
  const workspaceDirectories = new Set<string>();
  const packageDirectories: string[] = [];

  for (const packageRoot of [...WORKSPACE_PACKAGE_ROOTS, 'adapters']) {
    const packageRootPath = path.join(rootDir, packageRoot);
    const packageEntries = await readdir(packageRootPath, { withFileTypes: true }).catch(
      () => []
    );

    for (const entry of packageEntries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const packageDirectory = path.join(packageRootPath, entry.name);
      workspaceDirectories.add(packageDirectory);
      if (packageRoot !== 'adapters') packageDirectories.push(packageDirectory);
    }
  }

  for (const packageDirectory of packageDirectories) {
    const nodeModulesPath = path.join(packageDirectory, 'node_modules');
    const nodeModulesStat = await lstat(nodeModulesPath).catch(() => null);

    if (!nodeModulesStat) {
      continue;
    }

    if (!nodeModulesStat.isDirectory() && !nodeModulesStat.isSymbolicLink()) {
      continue;
    }

    if (
      !nodeModulesStat.isSymbolicLink() &&
      (await isManagedDependencyDirectory(nodeModulesPath, storeRoots, workspaceDirectories))
    ) {
      continue;
    }

    directories.push(path.relative(rootDir, nodeModulesPath));
  }

  return directories.sort((left, right) => left.localeCompare(right));
}

async function isManagedDependencyDirectory(
  directory: string,
  storeRoots: string[],
  workspaceDirectories: Set<string>,
  allowScopes = true
): Promise<boolean> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    // Executable shims and build caches do not change package import resolution.
    if (allowScopes && GENERATED_DIRECTORIES.has(entry.name) && entry.isDirectory()) continue;

    if (allowScopes && entry.name.startsWith('@') && entry.isDirectory()) {
      if (
        await isManagedDependencyDirectory(entryPath, storeRoots, workspaceDirectories, false)
      ) {
        continue;
      }
      return false;
    }

    if (!entry.isSymbolicLink()) return false;

    const target = path.resolve(directory, await readlink(entryPath));
    const isStoreLink = storeRoots.some(root => target.startsWith(`${root}${path.sep}`));
    if (!isStoreLink && !workspaceDirectories.has(target)) return false;

    const targetStat = await stat(entryPath).catch(() => null);
    if (!targetStat?.isDirectory()) return false;
  }

  return true;
}

await main();
