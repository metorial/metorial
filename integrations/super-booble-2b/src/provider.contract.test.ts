import {
  createLocalSlateTestClient,
  describeMcpCompatibleToolSchemas,
  expectSlateContract
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { superGoogle2BAuthOutputSchema } from './auth';
import { superGoogle2BConfigSchema } from './config';
import { inventory, provider, tools } from './index';
import { restrictedP1Scopes, superGoogle2BVerificationScopeEnvelope } from './scope-envelope';
import {
  superGoogle2BActionSpecificToolScopes,
  superGoogle2BFutureToolScopes,
  superGoogle2BProfileScopes,
  superGoogle2BScopes,
  superGoogle2BScopeValues
} from './scopes';
import { superGoogle2BSources } from './sources';
import {
  superGoogle2BIncludedToolManifest,
  superGoogle2BOmittedToolManifest,
  superGoogle2BToolManifest
} from './tool-manifest';

type ScopeExpression = {
  AND?: Array<{
    OR?: string[];
  }>;
};

type SourceAction = (typeof superGoogle2BSources)[number]['provider']['actions'][number];

let getToolScopeExpression = (tool: (typeof tools)[number]) =>
  tool.parameters.scopes as ScopeExpression | undefined;

let getMentionedScopes = (expression: ScopeExpression | undefined) =>
  (expression?.AND ?? []).flatMap(group => group.OR ?? []);

let satisfiesScopeExpression = (
  expression: ScopeExpression | undefined,
  grantedScopes: Set<string>
) =>
  (expression?.AND ?? []).every(group =>
    (group.OR ?? []).some(scope => grantedScopes.has(scope))
  );

// Consent scopes of each source integration, read from its auth stack at runtime.
let getSourceConsentScopes = () => {
  let scopes = new Set<string>();
  for (let source of superGoogle2BSources) {
    let authStack = (
      source.provider.spec.auth as { authStack?: Array<{ scopes?: unknown[] }> }
    ).authStack;
    for (let method of authStack ?? []) {
      for (let scope of method.scopes ?? []) {
        scopes.add(typeof scope === 'string' ? scope : (scope as { scope: string }).scope);
      }
    }
  }
  return scopes;
};

describe('super-booble-2b provider contract', () => {
  it('accounts for all 63 source tools and exposes exactly 63 unique tools', async () => {
    let expectedKeys = superGoogle2BIncludedToolManifest.map(entry => entry.exposedKey);
    let actualKeys = tools.map(tool => tool.key);

    expect(inventory.sourceToolCount).toBe(63);
    expect(inventory.importedToolCount).toBe(63);
    expect(expectedKeys).toHaveLength(63);
    expect(actualKeys).toEqual(expectedKeys);
    expect(new Set(actualKeys).size).toBe(actualKeys.length);

    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'super-booble-2b',
        name: 'Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2B'
      },
      toolIds: expectedKeys,
      triggerIds: [],
      authMethodIds: ['google_oauth']
    });

    expect(contract.actions).toHaveLength(63);
  });

  it('imports only the four low-value sources, with no aliases and no omissions', () => {
    let sources = new Set(
      superGoogle2BIncludedToolManifest.map(entry => entry.sourceIntegration)
    );
    expect([...sources].sort()).toEqual(
      ['google-photos', 'youtube', 'youtube-analytics', 'google-admin'].sort()
    );
    expect(superGoogle2BSources.map(source => source.integration).sort()).toEqual(
      [...sources].sort()
    );
    expect(inventory.renamed).toEqual([]);
    expect(superGoogle2BOmittedToolManifest).toEqual([]);
    expect(inventory.omitted).toEqual([]);

    let keys = new Set(tools.map(tool => tool.key));
    for (let key of ['list_albums', 'get_channel', 'query_analytics', 'list_users']) {
      expect(keys.has(key), key).toBe(true);
    }
    // manage_alerts is not registered by google-admin (Alert Center is service-account-only).
    expect(keys.has('manage_alerts')).toBe(false);
    for (let key of [
      'create_space',
      'create_event',
      'create_document',
      'ads_list_accounts',
      'list_courses'
    ]) {
      expect(keys.has(key), key).toBe(false);
    }
  });

  it('preserves source contracts and delegates handlers while rebinding authentication', () => {
    let importedByKey = new Map(tools.map(tool => [tool.key, tool]));
    let sourceByIntegration = new Map(
      superGoogle2BSources.map(source => [source.integration, source.provider])
    );

    for (let entry of superGoogle2BIncludedToolManifest) {
      let imported = importedByKey.get(entry.exposedKey);
      let source = sourceByIntegration
        .get(entry.sourceIntegration)
        ?.actions.find(
          (action: SourceAction) => action.type === 'tool' && action.key === entry.sourceKey
        );

      expect(imported, entry.exposedKey).toBeDefined();
      expect(source, `${entry.sourceIntegration}/${entry.sourceKey}`).toBeDefined();
      if (!imported || !source || source.type !== 'tool') continue;

      let manifestEntry = superGoogle2BToolManifest.find(
        candidate =>
          candidate.sourceIntegration === entry.sourceIntegration &&
          candidate.sourceKey === entry.sourceKey
      );

      expect(imported.inputSchema).toBe(source.inputSchema);
      expect(imported.outputSchema).toBe(source.outputSchema);
      expect(imported.handleInvocation).toEqual(expect.any(Function));
      expect(imported.handleInvocation).not.toBe(source.handleInvocation);
      expect(imported.parameters.tags).toEqual(source.parameters.tags);
      expect(imported.parameters.scopes).toEqual(
        manifestEntry?.status !== 'omitted' && manifestEntry?.scopes
          ? manifestEntry.scopes
          : source.parameters.scopes
      );
      expect(imported.parameters.authMethods).toEqual(['google_oauth']);
    }
  });

  it('keeps every production tool ID under 60 characters', () => {
    for (let tool of tools) {
      expect(`super-booble-2b-${tool.key}`.length, tool.key).toBeLessThan(60);
    }
  });

  it('requests the complete P2B declaration in Console order, which is the union of its source consent lists', () => {
    let requestedScopes = new Set(superGoogle2BScopeValues);
    let profileScopes = new Set<string>(superGoogle2BProfileScopes);

    expect(superGoogle2BScopes).toHaveLength(42);
    expect(requestedScopes.size).toBe(superGoogle2BScopes.length);
    // One project per super app: the consent request is the project declaration.
    expect(superGoogle2BScopeValues).toEqual([...superGoogle2BVerificationScopeEnvelope]);
    expect([...superGoogle2BVerificationScopeEnvelope].sort()).toEqual(
      [...getSourceConsentScopes()].sort()
    );
    for (let descriptor of superGoogle2BScopes) {
      expect(descriptor.title.trim().length, descriptor.scope).toBeGreaterThan(0);
      expect(descriptor.description.trim().length, descriptor.scope).toBeGreaterThan(0);
    }

    // Google rejects any authorization request that mixes a Drive scope with YouTube scopes.
    expect(requestedScopes.has('https://www.googleapis.com/auth/youtube')).toBe(true);
    for (let scope of requestedScopes) {
      expect(
        scope.includes('/auth/drive'),
        `Drive scope requested next to YouTube: ${scope}`
      ).toBe(false);
      expect(scope.includes('/auth/calendar'), scope).toBe(false);
      expect(scope.includes('/auth/meetings.'), scope).toBe(false);
      expect(scope.includes('/auth/documents'), scope).toBe(false);
      expect(scope.includes('/auth/spreadsheets'), scope).toBe(false);
      expect(scope.includes('/auth/adwords'), scope).toBe(false);
    }

    expect([...profileScopes]).toEqual([
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]);
    for (let scope of [
      'https://www.googleapis.com/auth/photoslibrary.appendonly',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
      'https://www.googleapis.com/auth/admin.directory.user',
      'https://www.googleapis.com/auth/apps.licensing'
    ]) {
      expect(requestedScopes.has(scope), scope).toBe(true);
    }

    for (let tool of tools) {
      expect(
        satisfiesScopeExpression(getToolScopeExpression(tool), requestedScopes),
        `Unsatisfied scope requirement for ${tool.key}`
      ).toBe(true);
    }

    // Every requested scope is used by a retained tool, the profile lookup, or is explicitly
    // listed as a future-tool scope; nothing restricted may be requested.
    let futureScopes = new Set<string>(superGoogle2BFutureToolScopes);
    for (let requestedScope of requestedScopes) {
      let usedByTool = tools.some(tool =>
        getMentionedScopes(getToolScopeExpression(tool)).includes(requestedScope)
      );
      expect(
        usedByTool || profileScopes.has(requestedScope) || futureScopes.has(requestedScope),
        `Unaccounted requested scope ${requestedScope}`
      ).toBe(true);
      expect(
        restrictedP1Scopes.has(requestedScope),
        `Restricted P1 scope entered P2B: ${requestedScope}`
      ).toBe(false);
    }
    for (let scope of futureScopes) {
      expect(requestedScopes.has(scope), scope).toBe(true);
      expect(
        tools.some(tool => getMentionedScopes(getToolScopeExpression(tool)).includes(scope)),
        `Future scope is already used by a tool and should leave the future list: ${scope}`
      ).toBe(false);
    }
  });

  it('mirrors the P2B Console declaration and keeps every restricted scope out of it', () => {
    expect(superGoogle2BVerificationScopeEnvelope.size).toBe(42);
    expect(
      superGoogle2BVerificationScopeEnvelope.has('https://www.googleapis.com/auth/apps.alerts')
    ).toBe(false);
    for (let scope of [
      'https://www.googleapis.com/auth/photoslibrary.appendonly',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
      'https://www.googleapis.com/auth/admin.directory.user'
    ]) {
      expect(superGoogle2BVerificationScopeEnvelope.has(scope), scope).toBe(true);
    }
    expect(restrictedP1Scopes.size).toBe(15);
    for (let scope of restrictedP1Scopes) {
      expect(superGoogle2BVerificationScopeEnvelope.has(scope), scope).toBe(false);
    }
    // Families that belong to the separate P2A project (super-booble-2a) are never declared here,
    // Classroom was removed from this super app on 2026-09-03, and no Drive scope at all may sit
    // next to YouTube.
    for (let scope of superGoogle2BVerificationScopeEnvelope) {
      expect(
        /\/auth\/(drive|classroom\.|meetings\.|calendar|contacts|directory\.|tasks|analytics|adwords|webmasters|tagmanager|documents|spreadsheets|presentations|forms\.)/.test(
          scope
        ),
        scope
      ).toBe(false);
      expect(
        scope.includes('/auth/gmail.') || scope === 'https://mail.google.com/',
        scope
      ).toBe(false);
      expect(scope.includes('/auth/chat.'), scope).toBe(false);
    }
  });

  it('requests the monetary analytics scope and advertises it on query_analytics', () => {
    let requestedScopes = new Set(superGoogle2BScopeValues);

    for (let requirement of superGoogle2BActionSpecificToolScopes) {
      let tool = tools.find(tool => tool.key === requirement.toolKey);
      expect(tool, requirement.toolKey).toBeDefined();
      expect(requestedScopes.has(requirement.scope), requirement.scope).toBe(true);
      expect(
        getMentionedScopes(tool ? getToolScopeExpression(tool) : undefined).includes(
          requirement.scope
        ),
        `${requirement.toolKey} does not advertise ${requirement.scope}`
      ).toBe(true);
      expect(JSON.stringify(tool?.parameters.constraints ?? []).toLowerCase()).toContain(
        'monetary'
      );
    }
  });

  it('preserves the Admin config fields and a plain Google OAuth credential shape', async () => {
    let configSchema = superGoogle2BConfigSchema.toJSONSchema();
    expect(Object.keys(configSchema.properties ?? {})).toEqual(['domain', 'customerId']);
    expect(configSchema.required ?? []).toEqual([]);

    expect(
      superGoogle2BAuthOutputSchema.parse({
        token: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: '2030-01-01T00:00:00.000Z',
        authMethod: 'oauth'
      })
    ).toEqual({
      token: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: '2030-01-01T00:00:00.000Z',
      authMethod: 'oauth'
    });

    let client = createLocalSlateTestClient({ slate: provider });
    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);
    expect(
      oauth.authenticationMethod.scopes?.map((scope: { id: string }) => scope.id)
    ).toEqual(superGoogle2BScopeValues);
  });
});

describeMcpCompatibleToolSchemas('Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2B tool input schemas', provider.actions);
