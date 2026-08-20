import { SLATES_PROTOCOL_VERSION, SlatesProviderProtoHandlerManager } from '@slates/proto';
import { auth, config, configV2, Slate, spec, trigger } from '@slates/provider';
import { describe, expect, it, vi } from 'vitest';
import z from 'zod';
import { createProviderHandler } from './index';

let createManager = async (changedOutput?: Record<string, unknown>) => {
  let configuration = configV2({
    fields: {
      endpoint: { schema: z.string(), visibility: 'plain', lifecycle: 'none' },
      token: { schema: z.string(), visibility: 'secret', lifecycle: 'renew' }
    }
  })
    .getDefaultConfig(() => ({ endpoint: 'https://default.test', token: 'secret-default' }))
    .onConfigChanged(() =>
      changedOutput === undefined ? undefined : ({ config: changedOutput } as any)
    );
  let specification = spec({
    key: 'config-contract',
    name: 'Config Contract',
    config: configuration,
    auth: auth().addNone().output(z.object({}))
  });
  let manager = await createProviderHandler(
    Slate.create({ spec: specification, tools: [], triggers: [] }),
    []
  ).run();
  await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    method: 'slates/hello',
    params: { protocol: SLATES_PROTOCOL_VERSION }
  });
  await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    method: 'slates/participant.set',
    params: { participants: [{ type: 'hub', id: 'hub', name: 'Hub' }] }
  });
  return manager;
};

describe('Task 10 config output contracts', () => {
  it('projects classified defaults to presence without returning plaintext', async () => {
    let manager = await createManager();
    let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'default',
      method: 'slates/config.get_default',
      params: {}
    });
    expect(response).toMatchObject({
      result: {
        config: {
          endpoint: 'https://default.test',
          token: { configured: true }
        }
      }
    });
    expect(JSON.stringify(response)).not.toContain('secret-default');
  });

  it.each([
    ['unknown', { undeclared: 'value' }],
    ['invalid type', { endpoint: 42 }],
    ['classified', { token: 'provider-secret' }]
  ])('rejects %s config change output', async (_name, changedOutput) => {
    let manager = await createManager(changedOutput);
    let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'change',
      method: 'slates/config.changed',
      params: {
        previousConfig: null,
        newConfig: { endpoint: 'https://current.test', token: { configured: true } }
      }
    });
    expect(response).toHaveProperty('error');
    expect(JSON.stringify(response)).not.toContain('provider-secret');
  });

  it('fails classified polling and registration closed before provider code sees presence values', async () => {
    let called = vi.fn();
    let registerCalled = vi.fn();
    let configuration = configV2({
      fields: {
        token: { schema: z.string(), visibility: 'secret', lifecycle: 'projection' }
      }
    });
    let specification = spec({
      key: 'ordinary-fail-closed',
      name: 'Ordinary Fail Closed',
      config: configuration,
      auth: auth().addNone().output(z.object({}))
    });
    let action = trigger(specification, { key: 'poll', name: 'Poll' })
      .input(z.object({ value: z.string() }))
      .output(z.object({ value: z.string() }))
      .polling({
        options: { intervalInSeconds: 60 },
        handleEvent: async context => ({
          id: 'event',
          type: 'event',
          output: context.input
        }),
        pollEvents: async () => {
          called();
          return { inputs: [], updatedState: {} };
        }
      })
      .build();
    let registrationAction = trigger(specification, { key: 'register', name: 'Register' })
      .input(z.object({ value: z.string() }))
      .output(z.object({ value: z.string() }))
      .webhook({
        autoRegisterWebhook: async () => {
          registerCalled();
          return { registrationDetails: { id: 'must-not-register' } };
        },
        handleEvent: async context => ({
          id: 'event',
          type: 'event',
          output: context.input
        }),
        handleRequest: async () => ({ inputs: [] })
      })
      .build();
    let manager = await createProviderHandler(
      Slate.create({ spec: specification, tools: [], triggers: [action, registrationAction] }),
      []
    ).run();
    for (let message of [
      {
        jsonrpc: '2.0' as const,
        method: 'slates/hello' as const,
        params: { protocol: SLATES_PROTOCOL_VERSION }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/participant.set' as const,
        params: { participants: [{ type: 'hub' as const, id: 'hub', name: 'Hub' }] }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/config.set' as const,
        params: { config: { token: { configured: true } } }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/session.start' as const,
        params: { sessionId: 'session', state: {} }
      }
    ]) {
      await SlatesProviderProtoHandlerManager.handleInput(manager, message);
    }
    let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'poll-request',
      method: 'slates/action.trigger.poll_events',
      params: { actionId: 'poll', state: null }
    });
    expect(response).toHaveProperty('error');
    expect(called).not.toHaveBeenCalled();
    let registerResponse = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'register-request',
      method: 'slates/action.trigger.webhook_register',
      params: {
        actionId: 'register',
        webhookBaseUrl: 'https://callback.example.test',
        capturedSecretVersions: {}
      }
    });
    expect(registerResponse).toHaveProperty('error');
    expect(registerCalled).not.toHaveBeenCalled();
  });

  it('validates exact registration capture authority before provider mutation and rejects stale results', async () => {
    let registrationMode: 'exact' | 'missing' | 'extra' | 'stale' = 'exact';
    let registerCalled = vi.fn();
    let specification = spec({
      key: 'registration-capture-contract',
      name: 'Registration Capture Contract',
      config: config(z.object({})),
      auth: auth().addNone().output(z.object({}))
    });
    let registrationAction = trigger(specification, {
      key: 'register',
      name: 'Register'
    })
      .input(z.object({ value: z.string() }))
      .output(z.object({ value: z.string() }))
      .webhook({
        http: {
          methods: ['POST'],
          ingress: {
            kind: 'receiver_route',
            baseline: 'receiver_path_secret',
            verification: {
              mechanism: 'hub',
              baseline: 'receiver_path_secret',
              allowedSecretRefs: [
                {
                  source: 'registration',
                  name: 'registration_secret',
                  registrationKey: 'secret',
                  encoding: 'utf8'
                }
              ],
              rules: [
                {
                  id: 'delivery.v1',
                  phase: 'delivery',
                  when: { methods: ['POST'] },
                  verify: {
                    type: 'static_token',
                    secretName: 'registration_secret',
                    selector: { source: 'header', headerName: 'X-Secret' }
                  },
                  result: { type: 'dispatch', scope: 'receiver_trigger' },
                  replay: {
                    kind: 'enforced',
                    deduplicate: {
                      source: 'header',
                      headerName: 'X-Delivery-Id',
                      ttlSeconds: 60,
                      scope: 'request'
                    }
                  }
                }
              ]
            }
          }
        },
        autoRegisterWebhook: async context => {
          registerCalled();
          let version = context.input.capturedSecretVersions.registration_secret;
          return {
            registrationDetails: { id: 'remote' },
            capturedSecrets:
              registrationMode === 'missing'
                ? {}
                : {
                    registration_secret: {
                      value: 'captured',
                      version: registrationMode === 'stale' ? version - 1 : version
                    },
                    ...(registrationMode === 'extra'
                      ? { undeclared: { value: 'bad', version } }
                      : {})
                  }
          };
        },
        handleEvent: async context => ({
          id: 'event',
          type: 'event',
          output: context.input
        }),
        handleRequest: async () => ({ inputs: [] })
      })
      .build();
    let manager = await createProviderHandler(
      Slate.create({ spec: specification, tools: [], triggers: [registrationAction] }),
      []
    ).run();
    for (let message of [
      {
        jsonrpc: '2.0' as const,
        method: 'slates/hello' as const,
        params: { protocol: SLATES_PROTOCOL_VERSION }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/participant.set' as const,
        params: { participants: [{ type: 'hub' as const, id: 'hub', name: 'Hub' }] }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/config.set' as const,
        params: { config: {} }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/session.start' as const,
        params: { sessionId: 'session', state: {} }
      }
    ]) {
      await SlatesProviderProtoHandlerManager.handleInput(manager, message);
    }
    let invoke = (versions: Record<string, number>) =>
      SlatesProviderProtoHandlerManager.handleInput(manager, {
        jsonrpc: '2.0',
        id: `register-${registrationMode}-${Object.keys(versions).join('-')}`,
        method: 'slates/action.trigger.webhook_register',
        params: {
          actionId: 'register',
          webhookBaseUrl: 'https://callback.example.test',
          capturedSecretVersions: versions
        }
      });

    expect(await invoke({ wrong_secret: 7 })).toHaveProperty('error');
    expect(registerCalled).not.toHaveBeenCalled();
    await expect(invoke({ registration_secret: 7 })).resolves.toMatchObject({
      result: {
        capturedSecrets: {
          registration_secret: { value: 'captured', version: 7 }
        }
      }
    });
    for (let invalidMode of ['missing', 'extra', 'stale'] as const) {
      registrationMode = invalidMode;
      expect(await invoke({ registration_secret: 7 })).toHaveProperty('error');
    }
    expect(registerCalled).toHaveBeenCalledTimes(4);
  });
});
