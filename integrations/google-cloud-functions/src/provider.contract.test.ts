import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleCloudFunctionsActionScopes } from './scopes';

describe('google-cloud-functions provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-cloud-functions',
        name: 'Google Cloud Functions',
        description:
          'Manage serverless Cloud Functions on Google Cloud. Create, deploy, update, and monitor functions triggered by HTTP requests or cloud events.'
      },
      toolIds: [
        'list_functions',
        'get_function',
        'create_function',
        'update_function',
        'delete_function',
        'list_runtimes',
        'generate_upload_url',
        'generate_download_url',
        'manage_iam_policy',
        'get_operation'
      ],
      triggerIds: ['inbound_webhook', 'function_changes'],
      authMethodIds: ['google_oauth', 'service_account'],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'function_changes', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(12);

    let expectedScopes = {
      list_functions: googleCloudFunctionsActionScopes.listFunctions,
      get_function: googleCloudFunctionsActionScopes.getFunction,
      create_function: googleCloudFunctionsActionScopes.createFunction,
      update_function: googleCloudFunctionsActionScopes.updateFunction,
      delete_function: googleCloudFunctionsActionScopes.deleteFunction,
      list_runtimes: googleCloudFunctionsActionScopes.listRuntimes,
      generate_upload_url: googleCloudFunctionsActionScopes.generateUploadUrl,
      generate_download_url: googleCloudFunctionsActionScopes.generateDownloadUrl,
      manage_iam_policy: googleCloudFunctionsActionScopes.manageIamPolicy,
      get_operation: googleCloudFunctionsActionScopes.getOperation,
      function_changes: googleCloudFunctionsActionScopes.functionChanges
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
