import { resolveSlatesCliRoot } from '@slates/profiles';
import { access, readdir, readFile } from 'fs/promises';
import path from 'path';

export interface ResolvedIntegration {
  input: string;
  rootDir: string;
  dirPath: string;
  relativeDir: string;
  name: string;
  entry: string;
}

export interface WorkspaceIntegrationSummary {
  rootDir: string;
  dirPath: string;
  relativeDir: string;
  name: string;
}

let toPosixPath = (value: string) => value.replace(/\\/g, '/');

let pathExists = async (targetPath: string) => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

let isWithinRoot = (rootDir: string, targetPath: string) => {
  let relative = path.relative(rootDir, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

let resolveIntegrationDir = async (input: string, cwd: string) => {
  let rootDir = resolveSlatesCliRoot(cwd);
  let integrationRoots = [
    path.join(rootDir, 'integrations'),
    path.join(rootDir, 'test-integrations')
  ];

  if (!input.includes(path.sep) && !input.includes('/')) {
    for (let root of integrationRoots) {
      let namedPath = path.join(root, input);
      if (await pathExists(path.join(namedPath, 'package.json'))) {
        return { rootDir, dirPath: namedPath };
      }
    }
  }

  let candidate = path.resolve(cwd, input);
  if (!(await pathExists(path.join(candidate, 'package.json')))) {
    throw new Error(
      `Could not resolve integration "${input}". Pass an integration name from \`integrations/\` or \`test-integrations/\`, or a relative path to an integration directory.`
    );
  }

  if (!isWithinRoot(rootDir, candidate)) {
    throw new Error(`Integration "${input}" must be inside the current repository.`);
  }

  return { rootDir, dirPath: candidate };
};

let resolveDefaultEntry = async (dirPath: string) => {
  let packageJsonPath = path.join(dirPath, 'package.json');
  let manifest = JSON.parse(await readFile(packageJsonPath, 'utf-8')) as {
    main?: string;
    source?: string;
  };

  let candidates = [
    manifest.source,
    manifest.main,
    'src/index.ts',
    'src/index.js',
    'index.ts',
    'index.js'
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (let candidate of candidates) {
    if (await pathExists(path.join(dirPath, candidate))) {
      return candidate;
    }
  }

  throw new Error(`Could not determine a default entry file for integration at ${dirPath}.`);
};

export let resolveIntegration = async (
  input: string,
  opts: { cwd?: string } = {}
): Promise<ResolvedIntegration> => {
  let cwd = opts.cwd ?? process.cwd();
  let { rootDir, dirPath } = await resolveIntegrationDir(input, cwd);
  let relativeDir = path.relative(rootDir, dirPath);

  return {
    input,
    rootDir,
    dirPath,
    relativeDir: toPosixPath(relativeDir),
    name: path.basename(dirPath),
    entry: toPosixPath(path.join(relativeDir, await resolveDefaultEntry(dirPath)))
  };
};

export let listWorkspaceIntegrations = async (opts: { cwd?: string } = {}) => {
  let cwd = opts.cwd ?? process.cwd();
  let rootDir = resolveSlatesCliRoot(cwd);
  let integrationRoots = [
    path.join(rootDir, 'integrations'),
    path.join(rootDir, 'test-integrations')
  ];

  let integrations: WorkspaceIntegrationSummary[] = [];

  for (let integrationsDir of integrationRoots) {
    if (!(await pathExists(integrationsDir))) {
      continue;
    }

    let entries = await readdir(integrationsDir, { withFileTypes: true });
    let chunk = await Promise.all(
      entries
        .filter(entry => entry.isDirectory())
        .map(async entry => {
          let dirPath = path.join(integrationsDir, entry.name);
          if (!(await pathExists(path.join(dirPath, 'package.json')))) {
            return null;
          }

          return {
            rootDir,
            dirPath,
            relativeDir: toPosixPath(path.relative(rootDir, dirPath)),
            name: entry.name
          } satisfies WorkspaceIntegrationSummary;
        })
    );

    integrations.push(
      ...chunk.filter(
        (integration): integration is WorkspaceIntegrationSummary => integration !== null
      )
    );
  }

  return integrations.sort((a, b) => a.relativeDir.localeCompare(b.relativeDir));
};
