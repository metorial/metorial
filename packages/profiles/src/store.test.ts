import { access, mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createSlatesClientFromProfile } from './client';
import { SlatesCliStore } from './store';

let tempDirs: string[] = [];

let createTempDir = async () => {
  let dir = await mkdtemp(path.join(tmpdir(), 'slates-profiles-'));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

describe('@slates/profiles store', () => {
  it('creates an integration-scoped store with profiles and auth', async () => {
    let cwd = await createTempDir();
    let store = await SlatesCliStore.open({
      cwd,
      scope: {
        key: 'integrations/demo',
        name: 'demo'
      }
    });

    let profile = store.upsertProfile({
      name: 'Demo',
      target: {
        type: 'local',
        entry: './fixtures/demo-slate.mjs',
        exportName: 'provider'
      }
    });

    store.setCurrentProfile(profile.id);
    store.setProfileConfig(profile.id, { prefix: 'Hello' });
    store.upsertAuth(profile.id, {
      authMethodId: 'token_auth',
      authType: 'auth.token',
      input: { token: 'abc' },
      output: { token: 'abc' },
      scopes: []
    });
    await store.save();

    let reopened = await SlatesCliStore.open({ storePath: store.storePath });
    let reopenedProfile = reopened.requireProfile(profile.id);

    expect(reopened.getProfile()?.id).toBe(profile.id);
    expect(reopenedProfile.config).toEqual({ prefix: 'Hello' });
    expect(reopened.getAuth(profile.id, 'token_auth')?.output).toEqual({ token: 'abc' });
    expect(reopened.scope?.key).toBe('integrations/demo');
    expect(reopened.cliDir).toBe(path.join(cwd, '.slates-cli'));
    expect(reopened.storePath).toBe(
      path.join(cwd, '.slates-cli', 'profiles', 'integrations', 'demo', 'store.json')
    );
  });

  it('opens an external scoped store with a separate logical root', async () => {
    let workspaceRoot = await createTempDir();
    let storageRoot = await createTempDir();
    let storePath = path.join(
      storageRoot,
      '.slates-cli',
      'profiles',
      'integrations',
      'demo',
      'store.json'
    );

    let store = await SlatesCliStore.open({
      storePath,
      rootDir: workspaceRoot
    });

    let profile = store.upsertProfile({
      name: 'Demo',
      target: {
        type: 'local',
        entry: 'integrations/demo/src/index.ts',
        exportName: 'provider'
      }
    });
    store.setCurrentProfile(profile.id);
    await store.save();

    let reopened = await SlatesCliStore.open({
      storePath,
      rootDir: workspaceRoot
    });

    expect(reopened.rootDir).toBe(workspaceRoot);
    expect(reopened.cliDir).toBe(path.join(storageRoot, '.slates-cli'));
    expect(reopened.scope?.key).toBe('integrations/demo');
    expect(reopened.getProfile()?.target.entry).toBe('integrations/demo/src/index.ts');

    await expect(
      access(path.join(storageRoot, '.slates-cli', '.gitignore'))
    ).resolves.toBeUndefined();
    await expect(access(path.join(workspaceRoot, '.slates-cli'))).rejects.toMatchObject({
      code: 'ENOENT'
    });
  });

  it('migrates matching legacy profiles into an integration-scoped store', async () => {
    let cwd = await createTempDir();
    let cliDir = path.join(cwd, '.slates-cli');
    await mkdir(cliDir, { recursive: true });

    await writeFile(
      path.join(cliDir, 'store.json'),
      JSON.stringify(
        {
          version: 1,
          currentProfileId: 'demo-profile',
          profiles: {
            'demo-profile': {
              id: 'demo-profile',
              name: 'Demo',
              target: {
                type: 'local',
                entry: 'integrations/demo/src/index.ts',
                exportName: 'provider'
              },
              config: { prefix: 'Hello' },
              auth: {},
              session: null,
              metadata: {
                provider: null,
                actions: null
              },
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z'
            },
            'other-profile': {
              id: 'other-profile',
              name: 'Other',
              target: {
                type: 'local',
                entry: 'integrations/other/src/index.ts',
                exportName: 'provider'
              },
              config: null,
              auth: {},
              session: null,
              metadata: {
                provider: null,
                actions: null
              },
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z'
            }
          }
        },
        null,
        2
      ),
      'utf-8'
    );

    let store = await SlatesCliStore.open({
      cwd,
      scope: {
        key: 'integrations/demo',
        name: 'demo'
      }
    });

    expect(store.listProfiles().map(profile => profile.id)).toEqual(['demo-profile']);
    expect(store.getProfile()?.config).toEqual({ prefix: 'Hello' });
    expect(store.listOAuthCredentials()).toEqual([]);
  });

  it('creates a local client from a profile target', async () => {
    let cwd = await createTempDir();
    let entry = path.join(cwd, 'demo-slate.mjs');
    await writeFile(
      entry,
      `
import { Slate, SlateAuth, SlateConfig, SlateSpecification } from '@slates/provider';
import { z } from 'zod';

let config = SlateConfig.create(
  z.object({
    prefix: z.string().optional()
  })
).getDefaultConfig(() => ({}));

let auth = SlateAuth.create();

export let provider = Slate.create({
  spec: SlateSpecification.create({
    key: 'demo',
    name: 'Demo Slate',
    description: 'Local test slate',
    config,
    auth
  }),
  tools: [],
  triggers: []
});
`,
      'utf-8'
    );

    let store = await SlatesCliStore.open({
      cwd,
      scope: {
        key: 'integrations/demo',
        name: 'demo'
      }
    });
    let profile = store.upsertProfile({
      name: 'Demo',
      target: {
        type: 'local',
        entry: './demo-slate.mjs',
        exportName: 'provider'
      }
    });

    let client = await createSlatesClientFromProfile(profile, { cwd });
    let provider = await client.identify();

    expect(provider.provider.id).toBe('demo');
    expect(provider.provider.name).toBe('Demo Slate');
  });

  it('resolves profile entry paths against the store root when the store lives elsewhere', async () => {
    let workspaceRoot = await createTempDir();
    let storageRoot = await createTempDir();
    let entry = path.join(workspaceRoot, 'integrations', 'demo-slate.mjs');
    await mkdir(path.dirname(entry), { recursive: true });
    await writeFile(
      entry,
      `
import { Slate, SlateAuth, SlateConfig, SlateSpecification } from '@slates/provider';
import { z } from 'zod';

let config = SlateConfig.create(z.object({})).getDefaultConfig(() => ({}));
let auth = SlateAuth.create();

export let provider = Slate.create({
  spec: SlateSpecification.create({
    key: 'external-demo',
    name: 'External Demo',
    description: 'Store root resolution test',
    config,
    auth
  }),
  tools: [],
  triggers: []
});
`,
      'utf-8'
    );

    let store = await SlatesCliStore.open({
      storePath: path.join(
        storageRoot,
        '.slates-cli',
        'profiles',
        'integrations',
        'demo',
        'store.json'
      ),
      rootDir: workspaceRoot
    });
    let profile = store.upsertProfile({
      name: 'Demo',
      target: {
        type: 'local',
        entry: 'integrations/demo-slate.mjs',
        exportName: 'provider'
      }
    });

    let client = await createSlatesClientFromProfile(profile, { store });
    let provider = await client.identify();

    expect(provider.provider.id).toBe('external-demo');
    expect(provider.provider.name).toBe('External Demo');
  });

  it('stores OAuth client credentials per integration', async () => {
    let cwd = await createTempDir();
    let store = await SlatesCliStore.open({
      cwd,
      scope: {
        key: 'integrations/demo',
        name: 'demo'
      }
    });

    let credential = store.upsertOAuthCredential({
      name: 'Primary OAuth App',
      authMethodId: 'oauth',
      clientId: 'client-id',
      clientSecret: 'client-secret'
    });
    await store.save();

    let reopened = await SlatesCliStore.open({ storePath: store.storePath });
    expect(reopened.getOAuthCredential(credential.id)?.clientId).toBe('client-id');
    expect(reopened.getOAuthCredential('Primary OAuth App')?.clientSecret).toBe(
      'client-secret'
    );
  });

  it('refreshes expired OAuth auth automatically in the profile-backed client', async () => {
    let cwd = await createTempDir();
    let entry = path.join(cwd, 'oauth-slate.mjs');
    await writeFile(
      entry,
      `
import { Slate, SlateAuth, SlateConfig, SlateSpecification, SlateTool } from '@slates/provider';
import { z } from 'zod';

let config = SlateConfig.create(z.object({})).getDefaultConfig(() => ({}));
let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    key: 'oauth',
    name: 'OAuth',
    scopes: [],
    getAuthorizationUrl: async () => ({ url: 'https://example.com' }),
    handleCallback: async () => ({ output: { token: 'initial-token' } }),
    handleTokenRefresh: async ctx => ({
      output: {
        token: \`\${ctx.output.token}-refreshed\`,
        refreshToken: ctx.output.refreshToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }
    })
  });

let spec = SlateSpecification.create({
  key: 'oauth-demo',
  name: 'OAuth Demo',
  description: 'OAuth test slate',
  config,
  auth
});

let tool = SlateTool.create(spec, {
  key: 'whoami',
  name: 'Who Am I'
})
  .input(z.object({}))
  .output(
    z.object({
      token: z.string()
    })
  )
  .handleInvocation(async ctx => ({
    output: {
      token: ctx.auth.token
    }
  }))
  .build();

export let provider = Slate.create({
  spec,
  tools: [tool],
  triggers: []
});
`,
      'utf-8'
    );

    let store = await SlatesCliStore.open({
      cwd,
      scope: {
        key: 'integrations/demo',
        name: 'demo'
      }
    });
    let profile = store.upsertProfile({
      name: 'Demo',
      target: {
        type: 'local',
        entry: './oauth-slate.mjs',
        exportName: 'provider'
      }
    });
    store.setProfileConfig(profile.id, {});
    store.upsertAuth(profile.id, {
      authMethodId: 'oauth',
      authType: 'auth.oauth',
      input: {},
      output: {
        token: 'expired-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() - 60 * 1000).toISOString()
      },
      scopes: [],
      clientId: 'client-id',
      clientSecret: 'client-secret'
    });
    await store.save();

    let client = await createSlatesClientFromProfile(profile, { cwd, store });
    let result = await client.invokeTool('whoami', {});

    expect(result.output).toEqual({ token: 'expired-token-refreshed' });
    expect(store.getAuth(profile.id, 'oauth')?.output).toMatchObject({
      token: 'expired-token-refreshed'
    });
  });

  it('refreshes expired custom auth automatically in the profile-backed client', async () => {
    let cwd = await createTempDir();
    let entry = path.join(cwd, 'custom-slate.mjs');
    await writeFile(
      entry,
      `
import { Slate, SlateAuth, SlateConfig, SlateSpecification, SlateTool } from '@slates/provider';
import { z } from 'zod';

let config = SlateConfig.create(z.object({})).getDefaultConfig(() => ({}));
let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      expiresAt: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    key: 'custom',
    name: 'Custom',
    inputSchema: z.object({
      tokenPrefix: z.string()
    }),
    getOutput: async ctx => ({
      output: {
        token: \`\${ctx.input.tokenPrefix}-initial\`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }
    }),
    handleTokenRefresh: async ctx => ({
      output: {
        token: \`\${ctx.input.tokenPrefix}-refreshed\`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }
    })
  });

let spec = SlateSpecification.create({
  key: 'custom-demo',
  name: 'Custom Demo',
  description: 'Custom auth test slate',
  config,
  auth
});

let tool = SlateTool.create(spec, {
  key: 'whoami',
  name: 'Who Am I'
})
  .input(z.object({}))
  .output(
    z.object({
      token: z.string()
    })
  )
  .handleInvocation(async ctx => ({
    output: {
      token: ctx.auth.token
    }
  }))
  .build();

export let provider = Slate.create({
  spec,
  tools: [tool],
  triggers: []
});
`,
      'utf-8'
    );

    let store = await SlatesCliStore.open({
      cwd,
      scope: {
        key: 'integrations/demo',
        name: 'demo'
      }
    });
    let profile = store.upsertProfile({
      name: 'Demo',
      target: {
        type: 'local',
        entry: './custom-slate.mjs',
        exportName: 'provider'
      }
    });
    store.setProfileConfig(profile.id, {});
    store.upsertAuth(profile.id, {
      authMethodId: 'custom',
      authType: 'auth.custom',
      input: {
        tokenPrefix: 'custom-token'
      },
      output: {
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 60 * 1000).toISOString()
      },
      scopes: []
    });
    await store.save();

    let client = await createSlatesClientFromProfile(profile, { cwd, store });
    let result = await client.invokeTool('whoami', {});

    expect(result.output).toEqual({ token: 'custom-token-refreshed' });
    expect(store.getAuth(profile.id, 'custom')?.output).toMatchObject({
      token: 'custom-token-refreshed'
    });
  });
});
