import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleAdminActionScopes } from './scopes';

describe('google-admin provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-admin',
        name: 'Google Admin',
        description:
          'Manage Google Workspace organizations through the Admin SDK. Provides capabilities for managing users, groups, organizational units, devices, roles, domains, licenses, audit logs, and security alerts.'
      },
      toolIds: [
        'list_users',
        'get_user',
        'create_user',
        'update_user',
        'delete_user',
        'manage_user_aliases',
        'list_groups',
        'manage_group',
        'manage_group_members',
        'manage_org_units',
        'manage_roles',
        'manage_chromeos_devices',
        'manage_mobile_devices',
        'manage_domains',
        'get_activity_reports',
        'get_usage_reports',
        'manage_alerts',
        'manage_calendar_resources',
        'manage_licenses',
        'transfer_data',
        'get_customer_info'
      ],
      triggerIds: ['user_changes', 'activity_events'],
      authMethodIds: ['google_oauth'],
      tools: [
        { id: 'list_users', readOnly: true, destructive: false },
        { id: 'get_user', readOnly: true, destructive: false },
        { id: 'create_user', readOnly: false, destructive: false },
        { id: 'update_user', readOnly: false, destructive: false },
        { id: 'delete_user', readOnly: false, destructive: true },
        { id: 'manage_user_aliases', readOnly: false, destructive: false },
        { id: 'list_groups', readOnly: true, destructive: false },
        { id: 'manage_group', readOnly: false, destructive: false },
        { id: 'manage_group_members', readOnly: false, destructive: false },
        { id: 'manage_org_units', readOnly: false, destructive: false },
        { id: 'manage_roles', readOnly: false, destructive: false },
        { id: 'manage_chromeos_devices', readOnly: false, destructive: false },
        { id: 'manage_mobile_devices', readOnly: false, destructive: false },
        { id: 'manage_domains', readOnly: false, destructive: false },
        { id: 'get_activity_reports', readOnly: true, destructive: false },
        { id: 'get_usage_reports', readOnly: true, destructive: false },
        { id: 'manage_alerts', readOnly: false, destructive: false },
        { id: 'manage_calendar_resources', readOnly: false, destructive: false },
        { id: 'manage_licenses', readOnly: false, destructive: false },
        { id: 'transfer_data', readOnly: false, destructive: false },
        { id: 'get_customer_info', readOnly: true, destructive: false }
      ],
      triggers: [
        { id: 'user_changes', invocationType: 'webhook' },
        { id: 'activity_events', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(23);
    expect(Object.keys(contract.configSchema.properties ?? {}).sort()).toEqual([
      'customerId',
      'domain'
    ]);

    let expectedScopes = {
      list_users: googleAdminActionScopes.listUsers,
      get_user: googleAdminActionScopes.getUser,
      create_user: googleAdminActionScopes.createUser,
      update_user: googleAdminActionScopes.updateUser,
      delete_user: googleAdminActionScopes.deleteUser,
      manage_user_aliases: googleAdminActionScopes.manageUserAliases,
      list_groups: googleAdminActionScopes.listGroups,
      manage_group: googleAdminActionScopes.manageGroup,
      manage_group_members: googleAdminActionScopes.manageGroupMembers,
      manage_org_units: googleAdminActionScopes.manageOrgUnits,
      manage_roles: googleAdminActionScopes.manageRoles,
      manage_chromeos_devices: googleAdminActionScopes.manageChromeosDevices,
      manage_mobile_devices: googleAdminActionScopes.manageMobileDevices,
      manage_domains: googleAdminActionScopes.manageDomains,
      get_activity_reports: googleAdminActionScopes.getActivityReports,
      get_usage_reports: googleAdminActionScopes.getUsageReports,
      manage_alerts: googleAdminActionScopes.manageAlerts,
      manage_calendar_resources: googleAdminActionScopes.manageCalendarResources,
      manage_licenses: googleAdminActionScopes.manageLicenses,
      transfer_data: googleAdminActionScopes.transferData,
      get_customer_info: googleAdminActionScopes.getCustomerInfo,
      user_changes: googleAdminActionScopes.userChanges,
      activity_events: googleAdminActionScopes.activityEvents
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(
        contract.actions.find(
          (action: { id?: string; scopes?: unknown }) => action.id === actionId
        )?.scopes
      ).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map((scope: { title?: string }) => scope.title)
    );
    expect(scopeTitles.has('Users (Read Only)')).toBe(true);
    expect(scopeTitles.has('Data Transfer')).toBe(true);
  });
});
