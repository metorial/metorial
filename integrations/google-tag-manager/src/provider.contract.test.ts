import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleTagManagerActionScopes } from './scopes';

describe('google-tag-manager provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-tag-manager',
        name: 'Google Tag Manager',
        description:
          'Manage Google Tag Manager accounts, containers, workspaces, tags, triggers, variables, versions, and user permissions.'
      },
      toolIds: [
        'list_accounts',
        'manage_container',
        'manage_workspace',
        'manage_tag',
        'manage_trigger',
        'manage_variable',
        'manage_version',
        'manage_environment',
        'manage_folder',
        'manage_user_permission'
      ],
      triggerIds: ['inbound_webhook', 'version_published', 'workspace_changed'],
      authMethodIds: ['google_oauth'],
      tools: [
        { id: 'list_accounts', readOnly: true, destructive: false },
        { id: 'manage_container', readOnly: false, destructive: false },
        { id: 'manage_workspace', readOnly: false, destructive: false },
        { id: 'manage_tag', readOnly: false, destructive: false },
        { id: 'manage_trigger', readOnly: false, destructive: false },
        { id: 'manage_variable', readOnly: false, destructive: false },
        { id: 'manage_version', readOnly: false, destructive: false },
        { id: 'manage_environment', readOnly: false, destructive: false },
        { id: 'manage_folder', readOnly: false, destructive: false },
        { id: 'manage_user_permission', readOnly: false, destructive: false }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'version_published', invocationType: 'polling' },
        { id: 'workspace_changed', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(13);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual([]);

    let expectedScopes = {
      list_accounts: googleTagManagerActionScopes.listAccounts,
      manage_container: googleTagManagerActionScopes.manageContainer,
      manage_workspace: googleTagManagerActionScopes.manageWorkspace,
      manage_tag: googleTagManagerActionScopes.manageTag,
      manage_trigger: googleTagManagerActionScopes.manageTrigger,
      manage_variable: googleTagManagerActionScopes.manageVariable,
      manage_version: googleTagManagerActionScopes.manageVersion,
      manage_environment: googleTagManagerActionScopes.manageEnvironment,
      manage_folder: googleTagManagerActionScopes.manageFolder,
      manage_user_permission: googleTagManagerActionScopes.manageUserPermission,
      inbound_webhook: googleTagManagerActionScopes.inboundWebhook,
      version_published: googleTagManagerActionScopes.versionPublished,
      workspace_changed: googleTagManagerActionScopes.workspaceChanged
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
