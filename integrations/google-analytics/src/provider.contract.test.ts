import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleAnalyticsActionScopes } from './scopes';

describe('google-analytics provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-analytics',
        name: 'Google Analytics',
        description:
          'Google Analytics 4 integration for querying analytics reports, sending event data via the Measurement Protocol, and managing GA4 properties, data streams, audiences, and custom dimensions/metrics.'
      },
      toolIds: [
        'run_report',
        'run_realtime_report',
        'run_funnel_report',
        'send_events',
        'validate_events',
        'get_metadata',
        'list_accounts_and_properties',
        'manage_data_streams',
        'manage_custom_dimensions',
        'manage_custom_metrics',
        'manage_key_events',
        'manage_audiences',
        'audit_data_access'
      ],
      triggerIds: ['inbound_webhook', 'property_change'],
      authMethodIds: ['oauth', 'measurement_protocol'],
      tools: [
        { id: 'run_report', readOnly: true, destructive: false },
        { id: 'run_realtime_report', readOnly: true, destructive: false },
        { id: 'run_funnel_report', readOnly: true, destructive: false },
        { id: 'send_events', readOnly: false, destructive: false },
        { id: 'validate_events', readOnly: true, destructive: false },
        { id: 'get_metadata', readOnly: true, destructive: false },
        { id: 'list_accounts_and_properties', readOnly: true, destructive: false },
        { id: 'manage_data_streams', readOnly: false, destructive: false },
        { id: 'manage_custom_dimensions', readOnly: false, destructive: false },
        { id: 'manage_custom_metrics', readOnly: false, destructive: false },
        { id: 'manage_key_events', readOnly: false, destructive: false },
        { id: 'manage_audiences', readOnly: false, destructive: false },
        { id: 'audit_data_access', readOnly: true, destructive: false }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'property_change', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(15);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual([
      'propertyId',
      'measurementId'
    ]);
    expect(contract.configSchema.required ?? []).toEqual([]);

    let expectedScopes = {
      run_report: googleAnalyticsActionScopes.runReport,
      run_realtime_report: googleAnalyticsActionScopes.runRealtimeReport,
      run_funnel_report: googleAnalyticsActionScopes.runFunnelReport,
      get_metadata: googleAnalyticsActionScopes.getMetadata,
      list_accounts_and_properties: googleAnalyticsActionScopes.listAccountsAndProperties,
      manage_data_streams: googleAnalyticsActionScopes.manageDataStreams,
      manage_custom_dimensions: googleAnalyticsActionScopes.manageCustomDimensions,
      manage_custom_metrics: googleAnalyticsActionScopes.manageCustomMetrics,
      manage_key_events: googleAnalyticsActionScopes.manageKeyEvents,
      manage_audiences: googleAnalyticsActionScopes.manageAudiences,
      audit_data_access: googleAnalyticsActionScopes.auditDataAccess,
      property_change: googleAnalyticsActionScopes.propertyChange
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }
    for (let actionId of ['send_events', 'validate_events', 'inbound_webhook']) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toBeUndefined();
    }

    let oauth = await client.getAuthMethod('oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let mp = await client.getAuthMethod('measurement_protocol');
    expect(mp.authenticationMethod.type).toBe('auth.custom');
    expect(mp.authenticationMethod.scopes).toBeUndefined();
  });
});
