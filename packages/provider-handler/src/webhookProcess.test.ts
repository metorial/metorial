import { SLATES_PROTOCOL_VERSION, SlatesProviderProtoHandlerManager } from '@slates/proto';
import { describe, expect, it } from 'vitest';
import { createProviderHandler } from './index';

let createManager = async (
  process: () => Promise<{
    events: any[];
    response?: { status?: number; body?: string };
    skipped?: { reason: string; message?: string };
  }>
) => {
  let webhookGroup = {
    key: 'webhook_group',
    name: 'Webhook Group',
    description: undefined,
    metadata: {},
    source: 'webhook',
    webhook: {
      autoRegistration: {
        webhookTargetList: async () => ({ targets: [], nextPageToken: null }),
        webhookRegister: async () => ({
          webhookRegistrationIdentifier: 'reg',
          webhookRegistrationPayload: {}
        }),
        webhookUnregister: async () => {}
      },
      process
    }
  };
  let slate = {
    spec: { key: 'test', name: 'Test' },
    adapters: [],
    actions: [],
    triggerGroups: [webhookGroup]
  };
  let manager = await createProviderHandler(slate as any, []).run();

  await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    method: 'slates/hello',
    params: { protocol: SLATES_PROTOCOL_VERSION }
  });
  await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    method: 'slates/participant.set',
    params: { participants: [] }
  });
  await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    method: 'slates/hub.capabilities.set',
    params: { capabilities: { triggers: true } }
  });

  return manager;
};

let processWebhook = (manager: SlatesProviderProtoHandlerManager) =>
  SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    id: 'process',
    method: 'slates/trigger_group.webhook.process',
    params: {
      triggerGroupId: 'webhook_group',
      url: 'https://hub.example/receive/key',
      method: 'POST',
      headers: {},
      body: null,
      webhookRegistrationPayload: {}
    }
  } as any);

describe('slates/trigger_group.webhook.process', () => {
  it('passes the skipped marker through to the hub', async () => {
    let manager = await createManager(async () => ({
      events: [],
      response: { status: 401, body: 'Invalid webhook signature.' },
      skipped: { reason: 'invalid_signature', message: 'Invalid webhook signature.' }
    }));

    expect(await processWebhook(manager)).toMatchObject({
      result: {
        events: [],
        response: { status: 401 },
        skipped: { reason: 'invalid_signature', message: 'Invalid webhook signature.' }
      }
    });
  });

  it('reports null skipped when the handler did not skip', async () => {
    let manager = await createManager(async () => ({
      events: [],
      response: { status: 200, body: '' }
    }));

    expect(await processWebhook(manager)).toMatchObject({
      result: { events: [], skipped: null }
    });
  });
});
