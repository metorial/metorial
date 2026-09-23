import {
  createLocalSlateTestClient,
  describeMcpCompatibleToolSchemas,
  expectSlateContract
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { auth, superGoogle2AAuthOutputSchema } from './auth';
import { superGoogle2AConfigSchema } from './config';
import { inventory, provider, tools } from './index';
import { restrictedP1Scopes, superGoogle2AVerificationScopeEnvelope } from './scope-envelope';
import {
  superGoogle2AActionSpecificToolScopes,
  superGoogle2AProfileScopes,
  superGoogle2AScopes,
  superGoogle2AScopeValues
} from './scopes';
import { superGoogle2ASources } from './sources';
import {
  superGoogle2AIncludedToolManifest,
  superGoogle2AOmittedToolManifest,
  superGoogle2AToolManifest
} from './tool-manifest';

type ScopeExpression = {
  AND?: Array<{
    OR?: string[];
  }>;
};

type SourceAction = (typeof superGoogle2ASources)[number]['provider']['actions'][number];

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
  for (let source of superGoogle2ASources) {
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

describe('super-booble-2a provider contract', () => {
  it('accounts for all 128 source tools and exposes exactly 128 unique tools', async () => {
    let expectedKeys = superGoogle2AIncludedToolManifest.map(entry => entry.exposedKey);
    let actualKeys = tools.map(tool => tool.key);

    expect(inventory.sourceToolCount).toBe(128);
    expect(inventory.importedToolCount).toBe(128);
    expect(expectedKeys).toHaveLength(128);
    expect(actualKeys).toEqual(expectedKeys);
    expect(new Set(actualKeys).size).toBe(actualKeys.length);

    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'super-booble-2a',
        name: 'Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2A'
      },
      toolIds: expectedKeys,
      triggerIds: [],
      authMethodIds: ['google_oauth']
    });

    expect(contract.actions).toHaveLength(128);
  });

  it('imports only the ten high-value sources and none of the super-booble-2b or removed families', () => {
    let sources = new Set(
      superGoogle2AIncludedToolManifest.map(entry => entry.sourceIntegration)
    );
    expect([...sources].sort()).toEqual(
      [
        'google-docs',
        'google-sheets',
        'google-slides',
        'google-forms',
        'google-calendar',
        'google-meet',
        'google-contacts',
        'google-tasks',
        'google-search-console',
        'google-tag-manager'
      ].sort()
    );
    expect(superGoogle2ASources.map(source => source.integration).sort()).toEqual(
      [...sources].sort()
    );

    let keys = new Set(tools.map(tool => tool.key));
    for (let key of [
      'ads_list_accounts',
      'search_reports',
      'manage_campaigns',
      'manage_ad_groups',
      'manage_ads',
      'manage_keywords',
      'manage_bidding_strategies',
      'manage_conversion_actions',
      'generate_keyword_ideas',
      'upload_offline_conversions',
      'manage_audience_lists',
      'list_courses',
      'list_albums',
      'get_channel',
      'query_analytics',
      'list_users',
      'manage_alerts',
      'run_report',
      'list_accounts_and_properties'
    ]) {
      expect(keys.has(key), key).toBe(false);
    }
    expect(keys.has('create_space')).toBe(true);
    expect(keys.has('create_event')).toBe(true);
  });

  it('preserves all five remaining aliases for stable public tool keys', () => {
    expect(inventory.renamed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceIntegration: 'google-tag-manager',
          sourceKey: 'list_accounts',
          exposedKey: 'tag_manager_list_accounts'
        }),
        expect.objectContaining({
          sourceIntegration: 'google-docs',
          sourceKey: 'manage_named_ranges',
          exposedKey: 'docs_manage_named_ranges'
        }),
        expect.objectContaining({
          sourceIntegration: 'google-sheets',
          sourceKey: 'manage_named_ranges',
          exposedKey: 'sheets_manage_named_ranges'
        }),
        expect.objectContaining({
          sourceIntegration: 'google-sheets',
          sourceKey: 'batch_update',
          exposedKey: 'sheets_batch_update'
        }),
        expect.objectContaining({
          sourceIntegration: 'google-slides',
          sourceKey: 'batch_update',
          exposedKey: 'slides_batch_update'
        })
      ])
    );
    expect(inventory.renamed).toHaveLength(5);
  });

  it('includes the drive.file-backed Docs and Sheets tools and omits nothing', () => {
    expect(superGoogle2AOmittedToolManifest).toEqual([]);
    expect(inventory.omitted).toEqual([]);

    let requestedScopes = new Set(superGoogle2AScopeValues);
    for (let key of [
      'create_document_markdown',
      'update_document_markdown',
      'list_documents',
      'delete_spreadsheet'
    ]) {
      let tool = tools.find(candidate => candidate.key === key);
      expect(tool, key).toBeDefined();
      expect(
        getMentionedScopes(getToolScopeExpression(tool!)),
        `${key} should accept drive.file`
      ).toContain('https://www.googleapis.com/auth/drive.file');
      expect(
        satisfiesScopeExpression(getToolScopeExpression(tool!), requestedScopes),
        key
      ).toBe(true);
    }

    for (let key of ['get_response', 'list_responses']) {
      let tool = tools.find(candidate => candidate.key === key);
      expect(getToolScopeExpression(tool!)).toEqual({
        AND: [{ OR: ['https://www.googleapis.com/auth/forms.responses.readonly'] }]
      });
    }
  });

  it('preserves source contracts and delegates handlers while rebinding authentication', () => {
    let importedByKey = new Map(tools.map(tool => [tool.key, tool]));
    let sourceByIntegration = new Map(
      superGoogle2ASources.map(source => [source.integration, source.provider])
    );

    for (let entry of superGoogle2AIncludedToolManifest) {
      let imported = importedByKey.get(entry.exposedKey);
      let source = sourceByIntegration
        .get(entry.sourceIntegration)
        ?.actions.find(
          (action: SourceAction) => action.type === 'tool' && action.key === entry.sourceKey
        );

      expect(imported, entry.exposedKey).toBeDefined();
      expect(source, `${entry.sourceIntegration}/${entry.sourceKey}`).toBeDefined();
      if (!imported || !source || source.type !== 'tool') continue;

      let manifestEntry = superGoogle2AToolManifest.find(
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
      expect(`super-booble-2a-${tool.key}`.length, tool.key).toBeLessThan(60);
    }
  });

  it('requests the complete P2A declaration in Console order, which is the union of its source consent lists', () => {
    let requestedScopes = new Set(superGoogle2AScopeValues);
    let profileScopes = new Set<string>(superGoogle2AProfileScopes);

    expect(superGoogle2AScopes).toHaveLength(47);
    expect(requestedScopes.has('https://www.googleapis.com/auth/adwords')).toBe(false);
    expect(requestedScopes.size).toBe(superGoogle2AScopes.length);
    // One project per super app: the consent request is the project declaration.
    expect(superGoogle2AScopeValues).toEqual([...superGoogle2AVerificationScopeEnvelope]);
    expect([...superGoogle2AVerificationScopeEnvelope].sort()).toEqual(
      [...getSourceConsentScopes()].sort()
    );
    for (let descriptor of superGoogle2AScopes) {
      expect(descriptor.title.trim().length, descriptor.scope).toBeGreaterThan(0);
      expect(descriptor.description.trim().length, descriptor.scope).toBeGreaterThan(0);
    }

    // drive.file is legal here only because no YouTube scope is requested next to it.
    expect(requestedScopes.has('https://www.googleapis.com/auth/drive.file')).toBe(true);
    for (let scope of requestedScopes) {
      expect(scope.includes('/auth/youtube'), scope).toBe(false);
      expect(scope.includes('/auth/yt-'), scope).toBe(false);
      expect(scope.includes('/auth/classroom.'), scope).toBe(false);
      expect(scope.includes('/auth/photos'), scope).toBe(false);
      expect(scope.includes('/auth/admin.'), scope).toBe(false);
      expect(scope.includes('/auth/apps.'), scope).toBe(false);
      expect(scope.includes('/auth/analytics'), scope).toBe(false);
    }
    // The bare OIDC scopes came only from google-analytics; the userinfo pair covers the profile lookup.
    for (let scope of ['openid', 'email', 'profile']) {
      expect(requestedScopes.has(scope), scope).toBe(false);
    }

    expect([...profileScopes]).toEqual([
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]);
    for (let scope of [
      'https://www.googleapis.com/auth/meetings.space.created',
      'https://www.googleapis.com/auth/meetings.space.readonly',
      'https://www.googleapis.com/auth/meetings.space.settings',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/presentations',
      'https://www.googleapis.com/auth/forms.responses.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]) {
      expect(requestedScopes.has(scope), scope).toBe(true);
    }

    for (let tool of tools) {
      expect(
        satisfiesScopeExpression(getToolScopeExpression(tool), requestedScopes),
        `Unsatisfied scope requirement for ${tool.key}`
      ).toBe(true);
    }

    // Every requested scope must be supported by an imported tool, including identity scopes.
    // Metadata coverage alone does not prove upstream authorization; live suites cover behavior.
    for (let requestedScope of requestedScopes) {
      let usedByTool = tools.some(tool =>
        getMentionedScopes(getToolScopeExpression(tool)).includes(requestedScope)
      );
      expect(usedByTool, `Unused requested scope ${requestedScope}`).toBe(true);
      expect(
        restrictedP1Scopes.has(requestedScope),
        `Restricted P1 scope entered P2A: ${requestedScope}`
      ).toBe(false);
    }
  });

  it('mirrors the P2A Console declaration and keeps every restricted scope out of it', () => {
    expect(superGoogle2AVerificationScopeEnvelope.size).toBe(47);
    for (let scope of [
      'https://www.googleapis.com/auth/meetings.space.created',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/documents'
    ]) {
      expect(superGoogle2AVerificationScopeEnvelope.has(scope), scope).toBe(true);
    }
    // Families that belong to the separate P2B project (super-booble-2b) are never declared here,
    // and neither is Google Analytics (removed from this super app on 2026-09-03).
    for (let scope of superGoogle2AVerificationScopeEnvelope) {
      expect(
        /\/auth\/(youtube|yt-|classroom\.|photos|admin\.|apps\.|analytics)/.test(scope),
        scope
      ).toBe(false);
    }
    expect(restrictedP1Scopes.size).toBe(15);
    for (let scope of restrictedP1Scopes) {
      expect(superGoogle2AVerificationScopeEnvelope.has(scope), scope).toBe(false);
    }
    // Only the non-restricted drive.file grant may appear; no Gmail or Chat scope belongs here.
    for (let scope of superGoogle2AVerificationScopeEnvelope) {
      let isDriveFile = scope === 'https://www.googleapis.com/auth/drive.file';
      expect(isDriveFile || !scope.includes('/auth/drive'), scope).toBe(true);
      expect(
        scope.includes('/auth/gmail.') || scope === 'https://mail.google.com/',
        scope
      ).toBe(false);
      expect(scope.includes('/auth/chat.'), scope).toBe(false);
    }
  });

  it('requests scopes for container deletion, version creation, and publishing', () => {
    let requestedScopes = new Set(superGoogle2AScopeValues);

    for (let requirement of superGoogle2AActionSpecificToolScopes) {
      let tool = tools.find(tool => tool.key === requirement.toolKey);
      expect(tool, requirement.toolKey).toBeDefined();
      expect(requestedScopes.has(requirement.scope), requirement.scope).toBe(true);
      expect(
        getMentionedScopes(tool ? getToolScopeExpression(tool) : undefined).includes(
          requirement.scope
        ),
        `${requirement.toolKey} does not advertise ${requirement.scope}`
      ).toBe(true);

      let schema = tool?.inputSchema.toJSONSchema() as {
        properties?: { action?: { enum?: string[] } };
      };
      expect(schema.properties?.action?.enum).toContain(requirement.operation);
    }
  });

  it('supports the narrow grants for calendar reads, account updates, and identity', () => {
    for (let [key, scope] of [
      ['get_calendar', 'calendar.calendars.readonly'],
      ['list_calendar_sharing', 'calendar.acls.readonly'],
      ['update_account', 'tagmanager.manage.accounts'],
      ['get_my_profile', 'userinfo.email']
    ]) {
      let tool = tools.find(candidate => candidate.key === key);
      expect(tool, key).toBeDefined();
      expect(
        satisfiesScopeExpression(
          tool ? getToolScopeExpression(tool) : undefined,
          new Set([`https://www.googleapis.com/auth/${scope}`])
        ),
        `${key} should accept ${scope} without an additional grant`
      ).toBe(true);
    }

    for (let key of ['get_calendar', 'list_calendar_sharing', 'get_my_profile']) {
      expect(tools.find(tool => tool.key === key)?.parameters.tags?.readOnly, key).toBe(true);
    }
    expect(tools.find(tool => tool.key === 'update_account')?.parameters.tags?.readOnly).toBe(
      false
    );
  });

  it('preserves compatible optional config and OAuth credential shapes', async () => {
    let configSchema = superGoogle2AConfigSchema.toJSONSchema();
    expect(Object.keys(configSchema.properties ?? {})).toEqual([]);
    expect(configSchema.required ?? []).toEqual([]);

    expect(auth.authStack[0]?.inputSchema).toBeUndefined();
    expect(
      superGoogle2AAuthOutputSchema.parse({
        token: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: '2030-01-01T00:00:00.000Z',
        authMethod: 'oauth',
        developerToken: 'developer-token'
      })
    ).toEqual({
      token: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: '2030-01-01T00:00:00.000Z',
      authMethod: 'oauth'
    });

    expect(
      superGoogle2AAuthOutputSchema.safeParse({ token: 'access-token', authMethod: 'oauth' })
        .success
    ).toBe(true);

    expect(
      superGoogle2AAuthOutputSchema.parse({
        token: 'access-token',
        authMethod: 'oauth',
        scopes: ['https://www.googleapis.com/auth/userinfo.email']
      }).scopes
    ).toEqual(['https://www.googleapis.com/auth/userinfo.email']);

    let client = createLocalSlateTestClient({ slate: provider });
    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);
    expect(
      oauth.authenticationMethod.scopes?.map((scope: { id: string }) => scope.id)
    ).toEqual(superGoogle2AScopeValues);
  });
});

describeMcpCompatibleToolSchemas('Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 2A tool input schemas', provider.actions);
