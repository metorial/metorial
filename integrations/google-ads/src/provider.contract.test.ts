import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleAdsActionScopes } from './scopes';

describe('google-ads provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider as any });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-ads',
        name: 'Google Ads',
        description:
          'Google Ads integration for managing campaigns, ad groups, ads, keywords, bidding strategies, conversion tracking, audience targeting, and reporting across Google Search, Display, Video, and Shopping networks.'
      },
      toolIds: [
        'list_accounts',
        'search_reports',
        'manage_campaigns',
        'manage_ad_groups',
        'manage_ads',
        'manage_keywords',
        'manage_bidding_strategies',
        'manage_conversion_actions',
        'generate_keyword_ideas',
        'upload_offline_conversions',
        'manage_audience_lists'
      ],
      triggerIds: ['lead_form_submit'],
      authMethodIds: ['google_oauth'],
      tools: [
        { id: 'list_accounts', readOnly: true, destructive: false },
        { id: 'search_reports', readOnly: true, destructive: false },
        { id: 'manage_campaigns', readOnly: false, destructive: false },
        { id: 'manage_ad_groups', readOnly: false, destructive: false },
        { id: 'manage_ads', readOnly: false, destructive: false },
        { id: 'manage_keywords', readOnly: false, destructive: false },
        { id: 'manage_bidding_strategies', readOnly: false, destructive: false },
        { id: 'manage_conversion_actions', readOnly: false, destructive: false },
        { id: 'generate_keyword_ideas', readOnly: true, destructive: false },
        { id: 'upload_offline_conversions', readOnly: false, destructive: false },
        { id: 'manage_audience_lists', readOnly: false, destructive: false }
      ],
      triggers: [{ id: 'lead_form_submit', invocationType: 'webhook' }]
    });

    expect(contract.actions).toHaveLength(12);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual(['loginCustomerId']);

    let expectedScopes = {
      list_accounts: googleAdsActionScopes.listAccounts,
      search_reports: googleAdsActionScopes.searchReports,
      manage_campaigns: googleAdsActionScopes.manageCampaigns,
      manage_ad_groups: googleAdsActionScopes.manageAdGroups,
      manage_ads: googleAdsActionScopes.manageAds,
      manage_keywords: googleAdsActionScopes.manageKeywords,
      manage_bidding_strategies: googleAdsActionScopes.manageBiddingStrategies,
      manage_conversion_actions: googleAdsActionScopes.manageConversionActions,
      generate_keyword_ideas: googleAdsActionScopes.generateKeywordIdeas,
      upload_offline_conversions: googleAdsActionScopes.uploadOfflineConversions,
      manage_audience_lists: googleAdsActionScopes.manageAudienceLists,
      lead_form_submit: googleAdsActionScopes.leadFormSubmit
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);
  });
});
