import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mocks = vi.hoisted(() => ({
  createSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
  getDelta: vi.fn()
}));

vi.mock('../lib/client', () => ({
  Client: class {
    createSubscription = mocks.createSubscription;
    deleteSubscription = mocks.deleteSubscription;
    getDelta = mocks.getDelta;
  }
}));

import { provider } from '../index';
import { registerWordWebhook, unregisterWordWebhook } from './drive-item-changes';

let context = {
  auth: { token: 'test-token' },
  config: { driveId: 'drive-1' }
};
let client = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: { driveId: 'drive-1' },
      auth: { authenticationMethodId: 'oauth_common', output: { token: 'test-token' } }
    }
  });

beforeEach(() => {
  mocks.createSubscription.mockReset();
  mocks.deleteSubscription.mockReset();
  mocks.getDelta.mockReset();
});

describe('Word Online drive_item_changes lifecycle contract', () => {
  it('binds Graph delivery to active/retiring clientState and verified items', async () => {
    let contract = await getSlateContract(client());
    let trigger = contract.triggers.find(action => action.id === 'drive_item_changes');
    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        ingress: {
          verification: {
            mechanism: 'hub',
            allowedSecretRefs: [
              { name: 'graph_client_state', registrationKey: 'clientState' },
              { name: 'graph_retiring_client_state', registrationKey: 'retiringClientState' }
            ],
            rules: [
              {
                id: 'graph.bootstrap.v1',
                when: { registrationStatuses: ['pending', 'registering', 'renewing'] },
                verify: { type: 'path_secret' }
              },
              {
                id: 'graph.delivery.v1',
                result: { type: 'dispatch', scope: 'verified_items' },
                verify: { type: 'preset', preset: 'graph.change_notification.v1' }
              }
            ]
          }
        }
      }
    });
  });

  it('persists immutable subscription authority separately from initial delta state', async () => {
    mocks.createSubscription.mockResolvedValueOnce({
      subscriptionId: 'subscription-1',
      expirationDateTime: '2026-08-17T00:00:00.000Z'
    });
    mocks.getDelta.mockResolvedValueOnce({ items: [], deltaLink: 'delta-1' });
    let result = await registerWordWebhook({
      ...context,
      input: {
        webhookBaseUrl: 'https://example.com/word',
        capturedSecretVersions: { graph_client_state: 1, graph_retiring_client_state: 1 }
      }
    });
    expect(mocks.createSubscription).toHaveBeenCalledWith(
      'https://example.com/word',
      '/drives/drive-1/root',
      'updated',
      4230,
      expect.stringMatching(/^[A-Za-z0-9_-]{43}$/)
    );
    expect(result).toMatchObject({
      registrationDetails: {
        subscriptionId: 'subscription-1',
        resource: '/drives/drive-1/root',
        clientState: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
        subscriptions: expect.any(Array)
      },
      state: { deltaLink: 'delta-1' }
    });
    expect(result.registrationDetails).not.toHaveProperty('deltaLink');
  });

  it('creates replacement authority, retires prior active state, and removes older overlap', async () => {
    mocks.createSubscription.mockResolvedValueOnce({
      subscriptionId: 'replacement-subscription',
      expirationDateTime: '2026-08-18T00:00:00.000Z'
    });
    let result = await registerWordWebhook({
      ...context,
      input: {
        webhookBaseUrl: 'https://example.com/word',
        registrationDetails: {
          subscriptionId: 'active-subscription',
          expirationDateTime: '2026-08-17T00:00:00.000Z',
          resource: '/drives/drive-1/root',
          clientState: 'active-client-state',
          retiringSubscriptionId: 'older-subscription',
          retiringClientState: 'older-client-state'
        },
        capturedSecretVersions: { graph_client_state: 2, graph_retiring_client_state: 2 }
      }
    });
    expect(mocks.deleteSubscription).toHaveBeenCalledWith('older-subscription');
    expect(result).toMatchObject({
      registrationDetails: {
        subscriptionId: 'replacement-subscription',
        retiringSubscriptionId: 'active-subscription',
        retiringClientState: 'active-client-state',
        retiringValidUntil: expect.any(String),
        subscriptions: [
          { subscriptionId: 'replacement-subscription' },
          { subscriptionId: 'active-subscription', validUntil: expect.any(String) }
        ]
      }
    });
    expect(result).not.toHaveProperty('state');
    expect(result.capturedSecrets.graph_client_state.version).toBe(2);
  });

  it('advances only mutable delta state after an authenticated delivery', async () => {
    mocks.getDelta.mockResolvedValueOnce({
      items: [
        {
          itemId: 'item-1',
          name: 'Document.docx',
          isFolder: false,
          createdAt: '2026-08-15T00:00:00.000Z',
          modifiedAt: '2026-08-15T00:00:00.000Z'
        }
      ],
      deltaLink: 'delta-2'
    });
    let result = await handleSlateTriggerWebhook({
      client: client(),
      triggerId: 'drive_item_changes',
      url: 'https://example.com/word',
      body: JSON.stringify({ value: [{ subscriptionId: 'subscription-1' }] }),
      state: { deltaLink: 'delta-1' }
    });
    expect(mocks.getDelta).toHaveBeenCalledWith('delta-1');
    expect(result.updatedState).toEqual({ deltaLink: 'delta-2' });
    expect(result.inputs).toMatchObject([{ changeType: 'created', itemId: 'item-1' }]);
  });

  it('deletes every unique active and retiring subscription on final cleanup', async () => {
    await unregisterWordWebhook({
      ...context,
      input: {
        registrationDetails: {
          subscriptionId: 'active-subscription',
          retiringSubscriptionId: 'retiring-subscription'
        }
      }
    });
    expect(mocks.deleteSubscription).toHaveBeenCalledTimes(2);
    expect(mocks.deleteSubscription).toHaveBeenCalledWith('active-subscription');
    expect(mocks.deleteSubscription).toHaveBeenCalledWith('retiring-subscription');
  });

  it('treats an already-removed retiring subscription as an idempotent cleanup retry', async () => {
    mocks.deleteSubscription.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(
      unregisterWordWebhook({
        ...context,
        input: { registrationDetails: { subscriptionId: 'retiring-subscription' } }
      })
    ).resolves.toBeUndefined();
  });
});
