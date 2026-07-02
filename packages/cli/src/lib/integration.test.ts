import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { listWorkspaceIntegrations, resolveIntegration } from './integration';

let tempDirs: string[] = [];

let createTempDir = async () => {
  let dir = await mkdtemp(path.join(tmpdir(), 'slates-cli-'));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

describe('resolveIntegration', () => {
  it('resolves an integration by name from the integrations directory', async () => {
    let cwd = await createTempDir();
    let integrationDir = path.join(cwd, 'integrations', 'demo');
    await mkdir(path.join(integrationDir, 'src'), { recursive: true });
    await writeFile(
      path.join(integrationDir, 'package.json'),
      JSON.stringify({ main: 'src/index.ts' }, null, 2),
      'utf-8'
    );
    await writeFile(
      path.join(integrationDir, 'src', 'index.ts'),
      'export let provider = {};\n',
      'utf-8'
    );

    let resolved = await resolveIntegration('demo', { cwd });

    expect(resolved.name).toBe('demo');
    expect(resolved.relativeDir).toBe('integrations/demo');
    expect(resolved.entry).toBe('integrations/demo/src/index.ts');
  });

  it('resolves an integration from a relative path', async () => {
    let cwd = await createTempDir();
    let integrationDir = path.join(cwd, 'custom', 'demo');
    await mkdir(path.join(integrationDir, 'src'), { recursive: true });
    await writeFile(
      path.join(integrationDir, 'package.json'),
      JSON.stringify({ source: 'src/index.ts' }, null, 2),
      'utf-8'
    );
    await writeFile(
      path.join(integrationDir, 'src', 'index.ts'),
      'export let provider = {};\n',
      'utf-8'
    );

    let resolved = await resolveIntegration('./custom/demo', { cwd });

    expect(resolved.name).toBe('demo');
    expect(resolved.relativeDir).toBe('custom/demo');
    expect(resolved.entry).toBe('custom/demo/src/index.ts');
  });

  it('lists workspace integrations from the integrations directory', async () => {
    let cwd = await createTempDir();
    for (let name of ['beta', 'alpha']) {
      let integrationDir = path.join(cwd, 'integrations', name);
      await mkdir(integrationDir, { recursive: true });
      await writeFile(
        path.join(integrationDir, 'package.json'),
        JSON.stringify({ main: 'src/index.ts' }, null, 2),
        'utf-8'
      );
    }

    let integrations = await listWorkspaceIntegrations({ cwd });

    expect(integrations.map(integration => integration.name)).toEqual(['alpha', 'beta']);
    expect(integrations.map(integration => integration.relativeDir)).toEqual([
      'integrations/alpha',
      'integrations/beta'
    ]);
  });
});
