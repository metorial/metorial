import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export type IntegrationPackage = {
  directory: string;
  name: string;
  slateName: string;
  version: string;
};

const INTEGRATIONS_WORKSPACE = path.resolve(import.meta.dir, '..', '..');
const INTEGRATION_ROOTS = ['integrations', 'test-integrations'] as const;

export async function listIntegrationPackages(): Promise<IntegrationPackage[]> {
  const packages: IntegrationPackage[] = [];

  for (const root of INTEGRATION_ROOTS) {
    const entries = await readdir(path.join(INTEGRATIONS_WORKSPACE, root), {
      withFileTypes: true
    });

    for (const entry of entries.filter(item => item.isDirectory())) {
      const directory = path.posix.join(root, entry.name);
      const packageJsonPath = path.join(INTEGRATIONS_WORKSPACE, directory, 'package.json');
      const packageJsonRaw = await readFile(packageJsonPath, 'utf8').catch(() => null);
      if (packageJsonRaw === null) {
        continue;
      }

      const packageJson = JSON.parse(packageJsonRaw) as {
        name?: string;
        private?: boolean;
        version?: string;
      };
      if (packageJson.private) {
        continue;
      }

      const slateJsonPath = path.join(INTEGRATIONS_WORKSPACE, directory, 'slate.json');
      const slateJson = JSON.parse(await readFile(slateJsonPath, 'utf8')) as { name?: string };

      if (!packageJson.name || !packageJson.version) {
        throw new Error(`Missing name or version in ${packageJsonPath}.`);
      }
      if (!slateJson.name) {
        throw new Error(`Missing name in ${slateJsonPath}.`);
      }

      packages.push({
        directory,
        name: packageJson.name,
        slateName: slateJson.name,
        version: packageJson.version
      });
    }
  }

  return packages;
}
