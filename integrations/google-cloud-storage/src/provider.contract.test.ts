import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleCloudStorageActionScopes } from './scopes';

describe('google-cloud-storage provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-cloud-storage',
        name: 'Google Cloud Storage'
      },
      toolIds: [
        'list_buckets',
        'get_bucket',
        'manage_bucket',
        'list_objects',
        'get_object',
        'upload_object',
        'delete_object',
        'copy_object',
        'update_object_metadata',
        'manage_bucket_iam',
        'manage_lifecycle',
        'manage_notifications'
      ],
      triggerIds: ['inbound_webhook', 'object_changes'],
      authMethodIds: ['oauth', 'service_account'],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'object_changes', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(14);

    let expectedScopes = {
      list_buckets: googleCloudStorageActionScopes.listBuckets,
      get_bucket: googleCloudStorageActionScopes.getBucket,
      manage_bucket: googleCloudStorageActionScopes.manageBucket,
      list_objects: googleCloudStorageActionScopes.listObjects,
      get_object: googleCloudStorageActionScopes.getObject,
      upload_object: googleCloudStorageActionScopes.uploadObject,
      delete_object: googleCloudStorageActionScopes.deleteObject,
      copy_object: googleCloudStorageActionScopes.copyObject,
      update_object_metadata: googleCloudStorageActionScopes.updateObjectMetadata,
      manage_bucket_iam: googleCloudStorageActionScopes.manageBucketIam,
      manage_lifecycle: googleCloudStorageActionScopes.manageLifecycle,
      manage_notifications: googleCloudStorageActionScopes.manageNotifications,
      object_changes: googleCloudStorageActionScopes.objectChanges
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
