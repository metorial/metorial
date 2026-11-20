import { SLATES_PROTOCOL_VERSION, SlatesProviderProtoHandlerManager } from '@slates/proto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createProviderHandler } from './index';

let createManager = async () => {
  let contexts: { operation: string; auth: unknown; config: unknown; input: unknown }[] = [];
  let config = (finish = true) => ({
    userConfigSchema: z.object({ secret: z.string() }),
    fullConfigSchema: z.object({ secret: z.string(), endpoint: z.string() }),
    setup: async (ctx: any) => {
      contexts.push({
        operation: 'setup',
        auth: ctx.auth,
        config: ctx.config,
        input: ctx.input
      });
      return {
        webhookSetupDocument: `Send events to ${ctx.input.webhookUrl}`,
        partialWebhookRegistrationPayload: { endpoint: ctx.input.webhookUrl }
      };
    },
    ...(finish
      ? {
          finish: async (ctx: any) => {
            contexts.push({
              operation: 'finish',
              auth: ctx.auth,
              config: ctx.config,
              input: ctx.input
            });
            return {
              webhookRegistrationPayload: {
                ...ctx.input.partialWebhookRegistrationPayload,
                ...ctx.input.userWebhookRegistrationPayload
              }
            };
          }
        }
      : {})
  });
  let autoRegistration = {
    webhookTargetList: async () => ({ targets: [], nextPageToken: null }),
    webhookRegister: async () => ({
      webhookRegistrationIdentifier: 'reg',
      webhookRegistrationPayload: {}
    }),
    webhookUnregister: async () => {}
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
      group('manual', { manualRegistration: config() }),
      group('manual_without_finish', { manualRegistration: config(false) }),
      group('configured', { autoRegistration, deliveryConfig: config() }),
      group('auto', { autoRegistration }),
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

  let request = (method: string, params: Record<string, unknown>) =>
    SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: method,
      method,
      params
    } as any);

  return {
    contexts,
    setup: (triggerGroupId: string) =>
      request('slates/trigger_group.webhook.manual_setup', {
        triggerGroupId,
        webhookUrl: 'https://receive.example/key'
      }),
    finish: (triggerGroupId: string) =>
      request('slates/trigger_group.webhook.manual_finish', {
        triggerGroupId,
        webhookUrl: 'https://receive.example/key',
        partialWebhookRegistrationPayload: { endpoint: 'https://receive.example/key' },
        userWebhookRegistrationPayload: { secret: 'shared' }
      })
  };
};

describe('slates/trigger_group.webhook.manual_setup and manual_finish', () => {
  it.each([
    'manual',
    'configured'
  ])('serve the %s group with unchanged shapes and an empty context', async triggerGroupId => {
    let { setup, finish, contexts } = await createManager();

    expect(await setup(triggerGroupId)).toMatchObject({
      result: {
        webhookSetupDocument: 'Send events to https://receive.example/key',
        partialWebhookRegistrationPayload: { endpoint: 'https://receive.example/key' }
      }
    });
    expect(await finish(triggerGroupId)).toMatchObject({
      result: {
        webhookRegistrationPayload: {
          endpoint: 'https://receive.example/key',
          secret: 'shared'
        }
      }
    });
    expect(contexts).toEqual([
      {
        operation: 'setup',
        auth: {},
        config: {},
        input: { webhookUrl: 'https://receive.example/key' }
      },
      {
        operation: 'finish',
        auth: {},
        config: {},
        input: {
          webhookUrl: 'https://receive.example/key',
          partialWebhookRegistrationPayload: { endpoint: 'https://receive.example/key' },
          userWebhookRegistrationPayload: { secret: 'shared' }
        }
      }
    ]);
  });

  it.each([
    'auto',
    'poll'
  ])('reject the %s group, which has no setup to complete', async triggerGroupId => {
    let { setup, finish, contexts } = await createManager();

    for (let response of [await setup(triggerGroupId), await finish(triggerGroupId)]) {
      expect(response).toMatchObject({
        error: {
          message: `Trigger group does not support manual webhook registration: ${triggerGroupId}`
        }
      });
    }
    expect(contexts).toEqual([]);
  });

  it('reject finish for a manual group that does not implement it', async () => {
    let { finish } = await createManager();

    expect(await finish('manual_without_finish')).toMatchObject({
      error: {
        message: 'Trigger group does not support manual webhook finish: manual_without_finish'
      }
    });
  });
});
