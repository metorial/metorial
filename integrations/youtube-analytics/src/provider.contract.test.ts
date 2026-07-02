import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { youtubeAnalyticsActionScopes } from './scopes';

describe('youtube-analytics provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'youtube-analytics',
        name: 'You Tube Analytics'
      },
      toolIds: [
        'query_analytics',
        'manage_groups',
        'manage_group_items',
        'manage_reporting_jobs',
        'list_bulk_reports',
        'list_report_types',
        'download_bulk_report'
      ],
      triggerIds: ['inbound_webhook', 'new_bulk_reports'],
      authMethodIds: ['google_oauth'],
      tools: [
        { id: 'query_analytics', readOnly: true, destructive: false },
        { id: 'manage_groups', destructive: false },
        { id: 'manage_group_items', destructive: false },
        { id: 'manage_reporting_jobs', destructive: false },
        { id: 'list_bulk_reports', readOnly: true, destructive: false },
        { id: 'list_report_types', readOnly: true, destructive: false },
        { id: 'download_bulk_report', readOnly: true, destructive: false }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'new_bulk_reports', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(9);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual([]);

    let expectedScopes = {
      query_analytics: youtubeAnalyticsActionScopes.queryAnalytics,
      manage_groups: youtubeAnalyticsActionScopes.manageGroups,
      manage_group_items: youtubeAnalyticsActionScopes.manageGroupItems,
      manage_reporting_jobs: youtubeAnalyticsActionScopes.manageReportingJobs,
      list_bulk_reports: youtubeAnalyticsActionScopes.listBulkReports,
      list_report_types: youtubeAnalyticsActionScopes.listReportTypes,
      download_bulk_report: youtubeAnalyticsActionScopes.downloadBulkReport,
      new_bulk_reports: youtubeAnalyticsActionScopes.newBulkReports,
      inbound_webhook: youtubeAnalyticsActionScopes.inboundWebhook
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map(scope => scope.title)
    );
    expect(scopeTitles.has('Analytics Read-Only')).toBe(true);
    expect(scopeTitles.has('YouTube Manage')).toBe(true);
  });
});
