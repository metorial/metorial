import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { auth } from './auth';
import { configSchema } from './config';
import { provider, toolInventory, tools } from './index';
import { superGoogle3Manifest } from './manifest';
import {
  restrictedP1Scopes,
  superGoogle3FutureToolScopes,
  superGoogle3OAuthScopes,
  superGoogle3ProfileScopes,
  superGoogle3ScopeEnvelope,
  superGoogle3Scopes
} from './scopes';
import { superGoogle3Sources } from './sources';

let sourceTools = new Map(
  superGoogle3Sources.flatMap(source =>
    source.provider.actions
      .filter(action => action.type === 'tool')
      .map(action => [`${source.integration}:${action.key}`, action] as const)
  )
);

let collectScopeValues = (expression: unknown): string[] => {
  if (typeof expression === 'string') return [expression];
  if (Array.isArray(expression)) return expression.flatMap(collectScopeValues);
  if (expression && typeof expression === 'object') {
    return Object.values(expression as Record<string, unknown>).flatMap(collectScopeValues);
  }
  return [];
};

let isScopeExpressionSatisfied = (expression: unknown, granted: Set<string>): boolean => {
  if (!expression) return true;
  if (typeof expression === 'string') return granted.has(expression);
  if (Array.isArray(expression)) {
    return expression.every(value => isScopeExpressionSatisfied(value, granted));
  }
  if (typeof expression !== 'object') return false;

  let record = expression as Record<string, unknown>;
  if (Array.isArray(record.AND)) {
    return record.AND.every(value => isScopeExpressionSatisfied(value, granted));
  }
  if (Array.isArray(record.OR)) {
    return record.OR.some(value => isScopeExpressionSatisfied(value, granted));
  }
  return false;
};

describe('Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 3 provider contract', () => {
  it('imports the exhaustive 114-tool source inventory with two aliases and no omissions', () => {
    expect(sourceTools.size).toBe(114);
    expect(superGoogle3Manifest).toHaveLength(114);
    expect(provider.actions).toHaveLength(114);
    expect(tools).toHaveLength(114);
    expect(toolInventory).toMatchObject({
      sourceToolCount: 114,
      importedToolCount: 114,
      omitted: []
    });
    expect(toolInventory.renamed).toEqual([
      expect.objectContaining({
        sourceIntegration: 'google-cloud-functions',
        sourceKey: 'get_operation',
        exposedKey: 'functions_get_operation'
      }),
      expect.objectContaining({
        sourceIntegration: 'google-cloud-speech',
        sourceKey: 'get_operation',
        exposedKey: 'speech_get_operation'
      })
    ]);
  });

  it('preserves source contracts and rebinds every imported tool to aggregate OAuth', () => {
    for (let entry of toolInventory.included) {
      let source = sourceTools.get(`${entry.sourceIntegration}:${entry.sourceKey}`);
      let imported = tools.find(tool => tool.key === entry.exposedKey);

      expect(source, `${entry.sourceIntegration}:${entry.sourceKey}`).toBeDefined();
      expect(imported, entry.exposedKey).toBeDefined();
      expect(imported?.name).toBe(source?.name);
      expect(imported?.description).toBe(source?.description);
      expect(imported?.tags).toEqual(source?.tags);
      expect(imported?.scopes).toEqual(source?.scopes);
      expect(imported?.inputSchema).toBe(source?.inputSchema);
      expect(imported?.outputSchema).toBe(source?.outputSchema);
      expect(imported?.authMethods).toEqual(['google_oauth']);
      expect(imported?.handleInvocation).toEqual(expect.any(Function));
    }
  });

  it('keeps aggregate keys and production IDs unique and below the platform limit', () => {
    let keys = tools.map(tool => tool.key);
    expect(new Set(keys).size).toBe(114);
    expect(keys).not.toContain('get_operation');
    expect(keys).toContain('functions_get_operation');
    expect(keys).toContain('speech_get_operation');

    for (let key of keys) {
      expect(`super-booble-3-${key}`.length, key).toBeLessThan(60);
    }
  });

  it('provides an optional aggregate config superset with source-specific defaults', () => {
    expect(configSchema.parse({})).toEqual({
      bigQueryLocation: 'US',
      functionsRegion: 'us-central1',
      speechRegion: 'global'
    });

    let sample = configSchema.parse({
      projectId: 'example-project',
      defaultZone: 'europe-west1-b',
      defaultRegion: 'europe-west1',
      bigQueryLocation: 'EU',
      functionsRegion: 'europe-west1',
      speechRegion: 'global',
      databaseUrl: 'https://example-default-rtdb.europe-west1.firebasedatabase.app',
      storageBucket: 'example-project.appspot.com',
      webApiKey: 'firebase-web-key'
    });

    expect(
      superGoogle3Sources
        .find(source => source.integration === 'bigquery')
        ?.mapConfig?.(sample)
    ).toEqual({ projectId: 'example-project', location: 'EU' });
    expect(
      superGoogle3Sources
        .find(source => source.integration === 'google-cloud-functions')
        ?.mapConfig?.(sample)
    ).toEqual({ projectId: 'example-project', region: 'europe-west1' });
    expect(
      superGoogle3Sources
        .find(source => source.integration === 'google-cloud-speech')
        ?.mapConfig?.(sample)
    ).toEqual({ projectId: 'example-project', region: 'global' });
    expect(
      superGoogle3Sources
        .find(source => source.integration === 'google-address-validation')
        ?.mapConfig?.(sample)
    ).toEqual({ projectId: 'example-project' });
  });

  it('rejects missing required source config locally before constructing invalid API paths', async () => {
    let listBuckets = tools.find(tool => tool.key === 'list_buckets');
    expect(listBuckets).toBeDefined();

    let invocation = listBuckets!.handleInvocation({
      auth: { token: 'access-token', authMethod: 'oauth' },
      config: configSchema.parse({}),
      input: {}
    } as any);

    let error = await invocation.catch(error => error);
    expect(error).toMatchObject({
      data: { reason: 'super_google_source_config' }
    });
    expect(String(error?.message)).toContain('google-cloud-storage:list_buckets');
    expect(String(error?.message)).toContain('config.projectId');
    expect(String(error?.message)).not.toContain('projects/undefined');
  });

  it('exposes only google_oauth and requires the complete runtime auth shape', () => {
    expect(auth.authStack.map(method => method.key)).toEqual(['google_oauth']);
    let oauth = auth.authStack[0];
    expect(oauth?.type).toBe('auth.oauth');
    if (!oauth || oauth.type !== 'auth.oauth') {
      throw new TypeError('Expected google_oauth to be an OAuth method.');
    }
    expect(oauth.scopes).toEqual(superGoogle3OAuthScopes);
    expect(oauth.handleTokenRefresh).toEqual(expect.any(Function));
    expect(oauth.getProfile).toEqual(expect.any(Function));
    expect(
      auth.outputSchema.parse({
        token: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: '2026-09-01T00:00:00.000Z',
        authMethod: 'oauth'
      })
    ).toEqual({
      token: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: '2026-09-01T00:00:00.000Z',
      authMethod: 'oauth'
    });
    expect(() => auth.outputSchema.parse({ token: 'access-token' })).toThrow();
  });

  it('requests the complete P3 declaration in Console order, future scopes included', () => {
    let declaredScopes: string[] = superGoogle3OAuthScopes.map(scope => scope.scope);
    let granted = new Set(declaredScopes);
    let p1Restricted = new Set<string>(restrictedP1Scopes);

    expect(declaredScopes).toEqual([...superGoogle3ScopeEnvelope]);
    expect(declaredScopes).toHaveLength(14);
    expect(new Set(declaredScopes).size).toBe(declaredScopes.length);
    expect(granted.has(superGoogle3Scopes.cloudPlatform)).toBe(true);
    for (let descriptor of superGoogle3OAuthScopes) {
      expect(descriptor.title.trim().length, descriptor.scope).toBeGreaterThan(0);
      expect(descriptor.description.trim().length, descriptor.scope).toBeGreaterThan(0);
    }

    for (let tool of tools) {
      expect(isScopeExpressionSatisfied(tool.scopes, granted), tool.key).toBe(true);
    }

    // Every requested scope is used by a retained tool, the profile lookup, or is explicitly
    // listed as a future-tool scope; nothing restricted may be requested.
    let mentionedByTools = new Set(tools.flatMap(tool => collectScopeValues(tool.scopes)));
    let accounted = new Set<string>([
      ...mentionedByTools,
      ...superGoogle3ProfileScopes,
      ...superGoogle3FutureToolScopes
    ]);
    for (let scope of declaredScopes) {
      expect(accounted.has(scope), `Unaccounted declared scope ${scope}`).toBe(true);
      expect(p1Restricted.has(scope), scope).toBe(false);
    }
    for (let scope of superGoogle3FutureToolScopes) {
      expect(granted.has(scope), scope).toBe(true);
      expect(
        mentionedByTools.has(scope),
        `Future scope is already used by a tool and should leave the future list: ${scope}`
      ).toBe(false);
    }
  });
});

describeMcpCompatibleToolSchemas('Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 3 tool input schemas', provider.actions);
