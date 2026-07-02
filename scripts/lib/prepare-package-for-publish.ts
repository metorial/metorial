import { access, readdir } from 'node:fs/promises';
import path from 'node:path';

export type PackageJson = {
  files?: string[];
  main?: string;
  name?: string;
  [key: string]: unknown;
};

const DIST_ENTRY_CANDIDATES = ['index.js', 'index.module.js', 'index.cjs'] as const;
const OPTIONAL_PUBLISH_PATTERNS = ['slate.json', 'docs/**', 'logo.*'] as const;

export async function preparePackageJsonForPublish(
  packageDirectory: string,
  packageJson: PackageJson
): Promise<PackageJson> {
  const main = await resolveDistMain(packageDirectory);
  const files = await resolvePublishFiles(packageDirectory);

  return {
    ...packageJson,
    main,
    files
  };
}

async function resolveDistMain(packageDirectory: string): Promise<string> {
  const distDirectory = path.join(packageDirectory, 'dist');

  for (const entry of DIST_ENTRY_CANDIDATES) {
    const entryPath = path.join(distDirectory, entry);

    if (await pathExists(entryPath)) {
      return `./dist/${entry}`;
    }
  }

  throw new Error(
    `No publish entry found in ${distDirectory}. Expected one of: ${DIST_ENTRY_CANDIDATES.join(', ')}.`
  );
}

async function resolvePublishFiles(packageDirectory: string): Promise<string[]> {
  const files = new Set<string>(['dist/**']);

  for (const pattern of OPTIONAL_PUBLISH_PATTERNS) {
    if (await matchesOptionalPattern(packageDirectory, pattern)) {
      files.add(pattern);
    }
  }

  return [...files].sort((left, right) => left.localeCompare(right));
}

async function matchesOptionalPattern(
  packageDirectory: string,
  pattern: (typeof OPTIONAL_PUBLISH_PATTERNS)[number]
): Promise<boolean> {
  if (pattern.endsWith('/**')) {
    const directoryName = pattern.slice(0, -3);
    const directoryPath = path.join(packageDirectory, directoryName);
    const entries = await readdir(directoryPath).catch(() => null);

    return entries !== null && entries.length > 0;
  }

  if (pattern.includes('*')) {
    const prefix = pattern.slice(0, pattern.indexOf('*'));
    const entries = await readdir(packageDirectory).catch(() => []);
    return entries.some(entry => entry.startsWith(prefix));
  }

  return pathExists(path.join(packageDirectory, pattern));
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
