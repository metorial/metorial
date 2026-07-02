import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import path from 'path';
import { chooseProfile } from '../lib/context';
import { listWorkspaceIntegrations } from '../lib/integration';
import type { WithProfile } from '../lib/types';

let runVitest = async (opts: {
  cwd: string;
  env: NodeJS.ProcessEnv;
  vitestArgs: string[];
  label?: string;
}) => {
  let command = process.execPath;
  let args = ['x', 'vitest', 'run', '--passWithNoTests', ...opts.vitestArgs];

  if (opts.label) {
    console.log(`\n==> ${opts.label}`);
  }

  await new Promise<void>((resolve, reject) => {
    let child = spawn(command, args, {
      cwd: opts.cwd,
      stdio: 'inherit',
      env: opts.env
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Vitest exited with code ${code ?? 1}.`));
    });
  });
};

export let runVitestWithProfile = async (opts: WithProfile & { vitestArgs: string[] }) => {
  let { integration, store, profile } = await chooseProfile(opts);
  let contextPath = path.join(store.dirPath, 'test-runtime.json');

  await writeFile(
    contextPath,
    `${JSON.stringify(
      {
        integration: integration.relativeDir,
        profileId: profile.id,
        rootDir: store.rootDir,
        storePath: store.storePath,
        cliDir: store.dirPath
      },
      null,
      2
    )}\n`,
    'utf-8'
  );

  await runVitest({
    cwd: integration.dirPath,
    vitestArgs: opts.vitestArgs,
    env: {
      ...process.env,
      SLATES_INTEGRATION: integration.relativeDir,
      SLATES_PROFILE_ID: profile.id,
      SLATES_CLI_DIR: store.dirPath,
      SLATES_STORE_ROOT_DIR: store.rootDir,
      SLATES_STORE_PATH: store.storePath,
      SLATES_TEST_CONTEXT_PATH: contextPath
    }
  });
};

export let runAllIntegrationTests = async (opts: { cwd?: string; vitestArgs: string[] }) => {
  let integrations = await listWorkspaceIntegrations({ cwd: opts.cwd });
  if (integrations.length === 0) {
    throw new Error('No integrations directory was found in the current repository.');
  }

  for (let integration of integrations) {
    await runVitest({
      cwd: integration.dirPath,
      vitestArgs: opts.vitestArgs,
      env: process.env,
      label: integration.relativeDir
    });
  }

  return {
    success: true,
    count: integrations.length
  };
};
