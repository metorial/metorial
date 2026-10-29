import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { $ } from 'bun';
import { type PackageJson, preparePackageJsonForPublish } from './prepare-package-for-publish';

type SlateBundle = {
  slateName: string;
  version: string;
  files: string[];
  contentChecksum: string;
  zipPath: string;
  cleanup: () => Promise<void>;
};

// npm always packs these regardless of `files`.
const ALWAYS_INCLUDED_FILE = /^(readme|license|licence)(\..*)?$/i;
const EXCLUDED_NAMES = new Set([
  '.DS_Store',
  '.npmrc',
  '.git',
  'node_modules',
  'npm-debug.log'
]);
const INTEGRATION_PACKAGE_PREFIX = '@slates-integrations/';

export async function createSlateBundle(packageDirectory: string): Promise<SlateBundle> {
  const packageJson = JSON.parse(
    await readFile(path.join(packageDirectory, 'package.json'), 'utf8')
  ) as PackageJson & { version?: string };
  const slateJson = JSON.parse(
    await readFile(path.join(packageDirectory, 'slate.json'), 'utf8')
  ) as { name?: string };

  if (!slateJson.name) {
    throw new Error(`Missing name in ${path.join(packageDirectory, 'slate.json')}.`);
  }

  if (!packageJson.version) {
    throw new Error(`Missing version in ${path.join(packageDirectory, 'package.json')}.`);
  }

  const publishPackageJson = stripIntegrationDependencies(
    await preparePackageJsonForPublish(packageDirectory, packageJson)
  );
  const files = await resolveBundleFiles(packageDirectory, publishPackageJson.files ?? []);

  const workDirectory = await mkdtemp(path.join(tmpdir(), 'slate-bundle-'));
  const stageDirectory = path.join(workDirectory, 'package');
  const zipPath = path.join(workDirectory, 'bundle.zip');
  const cleanup = () => rm(workDirectory, { force: true, recursive: true });

  try {
    await mkdir(stageDirectory);

    for (const file of files) {
      await mkdir(path.dirname(path.join(stageDirectory, file)), { recursive: true });
      await cp(path.join(packageDirectory, file), path.join(stageDirectory, file));
    }

    await writeFile(
      path.join(stageDirectory, 'package.json'),
      `${JSON.stringify(publishPackageJson, null, 2)}\n`,
      'utf8'
    );

    const zipFiles = ['package.json', ...files].sort();
    await $`zip -qX ${zipPath} ${zipFiles}`.cwd(stageDirectory);

    return {
      slateName: slateJson.name,
      version: packageJson.version,
      files: zipFiles,
      contentChecksum: await getContentChecksum(stageDirectory, zipFiles),
      zipPath,
      cleanup
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

// Must match the registry's getSlatePackageChecksum.
async function getContentChecksum(directory: string, sortedFiles: string[]) {
  const hash = createHash('sha256');
  for (const file of sortedFiles) {
    const content = await readFile(path.join(directory, file));
    hash.update(`${file}\0${content.length}\0`);
    hash.update(content);
  }
  return `sha256:${hash.digest('hex')}`;
}

// ncc already bundles these, and the hub would try to npm-install them.
function stripIntegrationDependencies(packageJson: PackageJson): PackageJson {
  const dependencies = packageJson.dependencies as Record<string, string> | undefined;
  if (!dependencies) {
    return packageJson;
  }

  return {
    ...packageJson,
    dependencies: Object.fromEntries(
      Object.entries(dependencies).filter(
        ([name]) => !name.startsWith(INTEGRATION_PACKAGE_PREFIX)
      )
    )
  };
}

async function resolveBundleFiles(
  packageDirectory: string,
  patterns: string[]
): Promise<string[]> {
  const files = new Set<string>();
  const topLevelEntries = await readdir(packageDirectory, { withFileTypes: true });

  for (const entry of topLevelEntries) {
    if (entry.isFile() && ALWAYS_INCLUDED_FILE.test(entry.name)) {
      files.add(entry.name);
    }
  }

  for (const pattern of patterns) {
    if (/^[^*/]+\/\*\*$/.test(pattern)) {
      for (const file of await listFilesRecursively(packageDirectory, pattern.slice(0, -3))) {
        files.add(file);
      }
    } else if (/^[^*/]+\*$/.test(pattern)) {
      const prefix = pattern.slice(0, -1);
      for (const entry of topLevelEntries) {
        if (entry.isFile() && entry.name.startsWith(prefix)) {
          files.add(entry.name);
        }
      }
    } else if (/^[^*/]+$/.test(pattern)) {
      files.add(pattern);
    } else {
      throw new Error(`Unsupported files pattern "${pattern}" in ${packageDirectory}.`);
    }
  }

  return [...files].sort();
}

async function listFilesRecursively(root: string, relativeDirectory: string) {
  const files: string[] = [];
  const entries = await readdir(path.join(root, relativeDirectory), {
    withFileTypes: true
  }).catch(() => []);

  for (const entry of entries) {
    if (EXCLUDED_NAMES.has(entry.name)) {
      continue;
    }

    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(root, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

type StoredSlateBundle = {
  slateName: string;
  version: string;
  contentChecksum: string;
  zipPath: string;
};

const storedBundleBaseName = (directory: string) => directory.replace(/\//g, '__');

export async function storeSlateBundle(
  bundle: SlateBundle,
  outDirectory: string,
  directory: string
) {
  const baseName = storedBundleBaseName(directory);
  await mkdir(outDirectory, { recursive: true });
  await cp(bundle.zipPath, path.join(outDirectory, `${baseName}.zip`), {
    errorOnExist: true,
    force: false
  });
  await writeFile(
    path.join(outDirectory, `${baseName}.bundle.json`),
    `${JSON.stringify({
      slateName: bundle.slateName,
      version: bundle.version,
      contentChecksum: bundle.contentChecksum
    })}\n`,
    { encoding: 'utf8', flag: 'wx' }
  );
}

export async function readStoredSlateBundle(
  bundleDirectory: string,
  directory: string
): Promise<StoredSlateBundle | null> {
  const baseName = storedBundleBaseName(directory);
  const manifestRaw = await readFile(
    path.join(bundleDirectory, `${baseName}.bundle.json`),
    'utf8'
  ).catch(() => null);
  if (manifestRaw === null) {
    return null;
  }

  let manifest: Partial<StoredSlateBundle> | null;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch {
    manifest = null;
  }
  if (!manifest?.slateName || !manifest.version || !manifest.contentChecksum) {
    throw new Error(`Invalid bundle manifest for ${directory}.`);
  }

  return {
    slateName: manifest.slateName,
    version: manifest.version,
    contentChecksum: manifest.contentChecksum,
    zipPath: path.join(bundleDirectory, `${baseName}.zip`)
  };
}
