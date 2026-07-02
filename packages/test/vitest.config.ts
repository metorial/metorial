import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const ROOT_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const workspacePackageEntry = (packageDirectory: string) =>
  path.join(ROOT_DIRECTORY, packageDirectory, 'src', 'index.ts');

export default defineConfig({
  resolve: {
    alias: {
      '@slates/client': workspacePackageEntry('client'),
      '@slates/profiles': workspacePackageEntry('profiles'),
      '@slates/provider': workspacePackageEntry('provider'),
      '@slates/provider-handler': workspacePackageEntry('provider-handler'),
      '@slates/proto': workspacePackageEntry('proto')
    }
  }
});
