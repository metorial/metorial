import { SLATES_PROTOCOL_VERSION, SlatesProviderProtoHandlerManager } from '@slates/proto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createProviderHandler } from './index';

type Authentication = { routingKeys?: string[]; rejected?: { status: number } };

let createManager = async (authenticate: (ctx: any) => Promise<Authentication>) => {
  let contexts: {
    auth: unknown;
    config: unknown;
    deliveryConfig: unknown;
    request: Request;
  }[] = [];
  let autoRegistration = {
    webhookTargetList: async () => ({ targets: [], nextPageToken: null }),
    webhookRegister: async () => ({
      webhookRegistrationIdentifier: 'reg',
      webhookRegistrationPayload: {}
    }),
    webhookUnregister: async () => {}
  };
  let deliveryConfig = {
    userConfigSchema: z.object({}),
    fullConfigSchema: z.object({}),
    setup: async () => ({ webhookSetupDocument: '', partialWebhookRegistrationPayload: {} }),
    finish: async () => ({ webhookRegistrationPayload: {} }),
    authenticate: async (ctx: any) => {
      contexts.push({
        auth: ctx.auth,
        config: ctx.config,
        deliveryConfig: ctx.input.deliveryConfig,
        request: ctx.input.request
      });
      return authenticate(ctx);
    }
  };
  let group = (key: string, webhook: Record<string, unknown>) => ({
    key,
    name: key,
    description: undefined,
    metadata: {},
    source: 'webhook',
    webhook: { process: async () => ({ events: [] }), ...webhook }
  });
  let slate = {
    spec: { key: 'test', name: 'Test' },
    adapters: [],
    actions: [],
    triggerGroups: [
      group('configured', { autoRegistration, deliveryConfig }),
      group('auto', { autoRegistration }),
      group('manual', { manualRegistration: deliveryConfig }),
      { key: 'poll', name: 'poll', source: 'polling', polling: { intervalSeconds: 600 } }
    ]
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

  return {
    contexts,
    authenticate: (params: Record<string, unknown> = {}) =>
      SlatesProviderProtoHandlerManager.handleInput(manager, {
        jsonrpc: '2.0',
        id: 'authenticate',
        method: 'slates/trigger_group.webhook.delivery_authenticate',
        params: {
          triggerGroupId: 'configured',
          url: 'https://hub.example/receive/config?attempt=1',
          method: 'POST',
          headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
          body: { encoding: 'base64', content: btoa('{"message":{}}') },
          deliveryConfig: { audience: 'https://hub.example/receive/config', extra: [1, 2] },
          ...params
        }
      } as any)
  };
};

describe('slates/trigger_group.webhook.delivery_authenticate', () => {
  it('hands the received request and the saved config to the handler without credentials', async () => {
    let { authenticate, contexts } = await createManager(async () => ({
      routingKeys: ['mailbox:user@example.com', 'mailbox:other@example.com']
    }));

    expect(await authenticate()).toEqual({
      jsonrpc: '2.0',
      id: 'authenticate',
      result: {
        routingKeys: ['mailbox:user@example.com', 'mailbox:other@example.com'],
        rejected: null
      }
    });
    let [received] = contexts;
    expect(received).toMatchObject({
      auth: {},
      config: {},
      deliveryConfig: { audience: 'https://hub.example/receive/config', extra: [1, 2] }
    });
    expect(received!.request.url).toBe('https://hub.example/receive/config?attempt=1');
    expect(received!.request.method).toBe('POST');
    expect(Object.fromEntries(received!.request.headers)).toEqual({
      authorization: 'Bearer token',
      'content-type': 'application/json'
    });
    expect(await received!.request.text()).toBe('{"message":{}}');
  });

  it('reconstructs a request without a body', async () => {
    let { authenticate, contexts } = await createManager(async () => ({ routingKeys: [] }));

    await authenticate({ method: 'GET', headers: {}, body: null });
    expect(contexts[0]!.request.method).toBe('GET');
    expect(contexts[0]!.request.body).toBeNull();
  });

  it('acknowledges an authenticated request that addresses no registration', async () => {
    let { authenticate } = await createManager(async () => ({ routingKeys: [] }));

    expect(await authenticate()).toMatchObject({
      result: { routingKeys: [], rejected: null }
    });
  });

  it.each([
    401, 403, 404, 503
  ])('passes a rejection with status %i through without routing keys', async status => {
    let { authenticate } = await createManager(async () => ({ rejected: { status } }));

    expect(await authenticate()).toMatchObject({
      result: { routingKeys: [], rejected: { status } }
    });
  });

  it.each([
    ['a status outside 400-599', { rejected: { status: 200 } }],
    ['a fractional status', { rejected: { status: 401.5 } }],
    ['no routing keys and no rejection', {}],
    ['an empty routing key', { routingKeys: [''] }],
    ['a routing key over 512 characters', { routingKeys: ['x'.repeat(513)] }],
    ['more than 16 routing keys', { routingKeys: Array(17).fill('key') }]
  ])('rejects a handler result with %s', async (_, result) => {
    let { authenticate } = await createManager(async () => result);

    expect(await authenticate()).toMatchObject({
      error: { message: 'Webhook delivery authentication returned an invalid result' }
    });
  });

  it.each([
    'auto',
    'manual',
    'poll'
  ])('rejects the %s group, which has no delivery config', async triggerGroupId => {
    let { authenticate, contexts } = await createManager(async () => ({ routingKeys: [] }));

    expect(await authenticate({ triggerGroupId })).toMatchObject({
      error: {
        message: `Trigger group does not support webhook delivery authentication: ${triggerGroupId}`
      }
    });
    expect(contexts).toEqual([]);
  });
});
