import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleSearchConsoleActionScopes } from './scopes';

describe('google-search-console provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-search-console',
        name: 'Google Search Console',
        description:
          "Monitor your site's presence in Google Search results. Query search traffic analytics, manage site properties and sitemaps, inspect URL indexing status, and run mobile-friendly tests."
      },
      toolIds: [
        'query_search_analytics',
        'list_sites',
        'manage_site',
        'manage_sitemap',
        'inspect_url',
        'run_mobile_friendly_test'
      ],
      triggerIds: ['inbound_webhook'],
      authMethodIds: ['oauth'],
      tools: [
        { id: 'query_search_analytics', readOnly: true, destructive: false },
        { id: 'list_sites', readOnly: true, destructive: false },
        { id: 'manage_site', readOnly: false, destructive: true },
        { id: 'manage_sitemap', readOnly: false, destructive: true },
        { id: 'inspect_url', readOnly: true, destructive: false },
        { id: 'run_mobile_friendly_test', readOnly: true, destructive: false }
      ],
      triggers: [{ id: 'inbound_webhook', invocationType: 'webhook' }]
    });

    expect(contract.actions).toHaveLength(7);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual([]);

    let expectedScopes = {
      query_search_analytics: googleSearchConsoleActionScopes.querySearchAnalytics,
      list_sites: googleSearchConsoleActionScopes.listSites,
      manage_site: googleSearchConsoleActionScopes.manageSite,
      manage_sitemap: googleSearchConsoleActionScopes.manageSitemap,
      inspect_url: googleSearchConsoleActionScopes.inspectUrl,
      run_mobile_friendly_test: googleSearchConsoleActionScopes.runMobileFriendlyTest,
      inbound_webhook: googleSearchConsoleActionScopes.inboundWebhook
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);
  });
});
