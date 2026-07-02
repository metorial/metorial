import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { firebaseActionScopes } from './scopes';

describe('firebase provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider as any });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'firebase',
        name: 'Firebase',
        description:
          'Firebase is a Google-backed Backend-as-a-Service platform providing cloud databases, user authentication, cloud messaging, file storage, remote configuration, and serverless functions.'
      },
      toolIds: [
        'manage_firestore_document',
        'query_firestore',
        'manage_realtime_data',
        'manage_user',
        'list_users',
        'lookup_user',
        'send_fcm_message',
        'manage_topic_subscriptions',
        'get_remote_config',
        'update_remote_config',
        'manage_storage',
        'get_firebase_apps'
      ],
      triggerIds: [
        'inbound_webhook',
        'firestore_document_changes',
        'realtime_db_changes',
        'user_changes'
      ],
      authMethodIds: ['google_oauth', 'service_account'],
      tools: [
        { id: 'manage_firestore_document', readOnly: false, destructive: true },
        { id: 'query_firestore', readOnly: true, destructive: false },
        { id: 'manage_realtime_data', readOnly: false, destructive: true },
        { id: 'manage_user', readOnly: false, destructive: true },
        { id: 'list_users', readOnly: true, destructive: false },
        { id: 'lookup_user', readOnly: true, destructive: false },
        { id: 'send_fcm_message', readOnly: false, destructive: false },
        { id: 'manage_topic_subscriptions', readOnly: false, destructive: false },
        { id: 'get_remote_config', readOnly: true, destructive: false },
        { id: 'update_remote_config', readOnly: false, destructive: true },
        { id: 'manage_storage', readOnly: false, destructive: true },
        { id: 'get_firebase_apps', readOnly: true, destructive: false }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'firestore_document_changes', invocationType: 'polling' },
        { id: 'realtime_db_changes', invocationType: 'polling' },
        { id: 'user_changes', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(16);
    expect(Object.keys(contract.configSchema.properties ?? {}).sort()).toEqual([
      'databaseUrl',
      'projectId',
      'storageBucket',
      'webApiKey'
    ]);

    let expectedScopes = {
      manage_firestore_document: firebaseActionScopes.manageFirestoreDocument,
      query_firestore: firebaseActionScopes.queryFirestore,
      manage_realtime_data: firebaseActionScopes.manageRealtimeData,
      manage_user: firebaseActionScopes.manageUser,
      list_users: firebaseActionScopes.listUsers,
      lookup_user: firebaseActionScopes.lookupUser,
      send_fcm_message: firebaseActionScopes.sendFcmMessage,
      manage_topic_subscriptions: firebaseActionScopes.manageTopicSubscriptions,
      get_remote_config: firebaseActionScopes.getRemoteConfig,
      update_remote_config: firebaseActionScopes.updateRemoteConfig,
      manage_storage: firebaseActionScopes.manageStorage,
      get_firebase_apps: firebaseActionScopes.getFirebaseApps,
      firestore_document_changes: firebaseActionScopes.firestoreDocumentChanges,
      realtime_db_changes: firebaseActionScopes.realtimeDbChanges,
      user_changes: firebaseActionScopes.userChanges,
      inbound_webhook: firebaseActionScopes.inboundWebhook
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let serviceAccount = await client.getAuthMethod('service_account');
    expect(serviceAccount.authenticationMethod.type).toBe('auth.custom');

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map(scope => scope.title)
    );
    expect(scopeTitles.has('Cloud Platform')).toBe(true);
    expect(scopeTitles.has('Realtime Database')).toBe(true);
  });
});
