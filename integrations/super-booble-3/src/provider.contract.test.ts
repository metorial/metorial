import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { auth } from './auth';
import { configSchema } from './config';
import { provider, toolInventory, tools } from './index';
import { superGoogle3Manifest } from './manifest';
import {
  restrictedP1Scopes,
  superGoogle3OAuthScopes,
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
  it('exposes all 115 source capabilities with identity supplied by a shared recipe', () => {
    expect(sourceTools.size).toBe(115);
    expect(superGoogle3Manifest).toHaveLength(115);
    expect(provider.actions).toHaveLength(115);
    expect(tools).toHaveLength(115);
    expect(toolInventory).toMatchObject({
      sourceToolCount: 115,
      importedToolCount: 114,
      omitted: [
        expect.objectContaining({
          sourceIntegration: 'bigquery',
          sourceKey: 'get_current_user'
        })
      ]
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
    expect(new Set(keys).size).toBe(115);
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

    let error = await invocation.catch((error: unknown) => error);
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

  it('requests only Cloud, Realtime Database and identity scopes, each backed by a tool', () => {
    let declaredScopes = superGoogle3OAuthScopes.map(scope => scope.scope);
    let granted = new Set<string>(declaredScopes);
    let p1Restricted = new Set<string>(restrictedP1Scopes);

    expect(declaredScopes).toEqual([
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/firebase.database',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]);
    expect(declaredScopes).toEqual(superGoogle3ScopeEnvelope);
    let mentionedByTools = new Set(tools.flatMap(tool => collectScopeValues(tool.scopes)));
    for (let descriptor of superGoogle3OAuthScopes) {
      expect(descriptor.title.trim().length, descriptor.scope).toBeGreaterThan(0);
      expect(descriptor.description.trim().length, descriptor.scope).toBeGreaterThan(0);
      expect(mentionedByTools.has(descriptor.scope), descriptor.scope).toBe(true);
      expect(p1Restricted.has(descriptor.scope), descriptor.scope).toBe(false);
    }
    for (let tool of tools) {
      expect(tool.scopes, `Missing scope gate for ${tool.key}`).toBeDefined();
      expect(isScopeExpressionSatisfied(tool.scopes, granted), tool.key).toBe(true);
    }
  });

  it('exposes identity without requiring a Cloud project and requires both identity scopes', () => {
    let identity = tools.find(tool => tool.key === 'get_current_user');
    expect(identity).toBeDefined();
    expect(identity?.authMethods).toEqual(['google_oauth']);
    expect(identity?.tags).toMatchObject({ readOnly: true, destructive: false });
    expect(identity?.inputSchema.parse({})).toEqual({});
    expect(
      isScopeExpressionSatisfied(
        identity?.scopes,
        new Set([superGoogle3Scopes.userinfoEmail, superGoogle3Scopes.userinfoProfile])
      )
    ).toBe(true);
    for (let scope of Object.values(superGoogle3Scopes)) {
      expect(isScopeExpressionSatisfied(identity?.scopes, new Set([scope])), scope).toBe(
        false
      );
    }
  });

  it('preserves narrow BigQuery grants without allowing read-only grants to submit jobs', () => {
    let canUse = (key: string, ...scopes: string[]) => {
      let tool = tools.find(tool => tool.key === key);
      expect(tool, key).toBeDefined();
      return isScopeExpressionSatisfied(tool?.scopes, new Set(scopes));
    };
    let prefix = 'https://www.googleapis.com/auth/';
    for (let scope of ['bigquery.readonly', 'cloud-platform.read-only']) {
      expect(canUse('read_table_data', `${prefix}${scope}`)).toBe(true);
      for (let key of [
        'execute_query',
        'execute_sql_readonly',
        'create_table',
        'insert_rows'
      ]) {
        expect(canUse(key, `${prefix}${scope}`), key).toBe(false);
      }
    }
    expect(canUse('insert_rows', `${prefix}bigquery.insertdata`)).toBe(true);
    expect(canUse('read_table_data', `${prefix}bigquery.insertdata`)).toBe(false);
    expect(canUse('list_functions', `${prefix}cloud-platform.read-only`)).toBe(false);
    expect(canUse('get_function', `${prefix}cloud-platform.read-only`)).toBe(false);
    expect(canUse('manage_realtime_data', `${prefix}firebase.database`)).toBe(false);
    expect(canUse('manage_realtime_data', `${prefix}cloud-platform`)).toBe(false);
    expect(
      canUse('manage_realtime_data', `${prefix}firebase.database`, `${prefix}userinfo.email`)
    ).toBe(true);
  });
});

describeMcpCompatibleToolSchemas('Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 3 tool input schemas', provider.actions);
