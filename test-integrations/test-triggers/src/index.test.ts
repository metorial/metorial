import {
  SLATES_PROTOCOL_VERSION,
  type SlatesAction,
  SlatesProviderProtoHandlerManager
} from '@slates/proto';
import { createProviderHandler } from '@slates/provider-handler';
import { SlateContext, SlateLogger } from 'slates';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { spec } from './spec';
import { webhookSyncEcho } from './triggers/webhook-sync-echo';

describe('@slates-integrations/test-triggers callback fixture', () => {
  it('serializes the empty v2 config and receiver path-secret ingress contracts', async () => {
    let manager = await createProviderHandler(provider, []).run();
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

    let configResponse = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'config-schema',
      method: 'slates/config.schema.get',
      params: {}
    });
    expect(configResponse).toMatchObject({
      result: {
        schema: {
          version: 2,
          fieldOrder: [],
          fields: {}
        }
      }
    });

    let actionsResponse = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'actions',
      method: 'slates/actions.list',
      params: {}
    });
    if (!actionsResponse || !('result' in actionsResponse)) {
      throw new Error('Provider handler did not return serialized actions');
    }

    let action = actionsResponse.result.actions.find(
      (candidate: SlatesAction) => candidate.id === 'webhook_sync_echo'
    );
    expect(action?.invocation).toEqual({
      type: 'webhook',
      autoRegistration: false,
      autoUnregistration: false,
      http: {
        methods: ['POST'],
        ingress: {
          kind: 'receiver_route',
          baseline: 'receiver_path_secret',
          verification: {
            mechanism: 'path_secret_only',
            baseline: 'receiver_path_secret',
            reason: 'Internal smoke-test fixture relies on receiver path secrecy.'
          }
        },
        sync: {
          mode: 'match',
          match: [
            { hasHeader: 'x-test-sync' },
            { formBodyField: { path: 'mode', equals: 'subscribe' } }
          ],
          timeoutMs: 5_000
        }
      }
    });
  });

  it('serializes no authentication methods', async () => {
    let manager = await createProviderHandler(provider, []).run();
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

    let authResponse = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'auth-methods',
      method: 'slates/auth.methods.list',
      params: {}
    });
    expect(authResponse).toMatchObject({
      result: {
        authenticationMethods: []
      }
    });
  });

  it('maps a normal trigger event with empty config', async () => {
    let manager = await createProviderHandler(provider, []).run();
    let config = {};
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
        params: { config }
      },
      {
        jsonrpc: '2.0' as const,
        method: 'slates/session.start' as const,
        params: { sessionId: 'session', state: {} }
      }
    ]) {
      await SlatesProviderProtoHandlerManager.handleInput(manager, message);
    }

    let mapResponse = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'map-event',
      method: 'slates/action.trigger.map_event',
      params: {
        actionId: 'webhook_sync_echo',
        input: { payload: 'callback payload' }
      }
    });
    expect(mapResponse).toMatchObject({
      result: {
        type: 'test.webhook.sync_echo',
        output: { payload: 'callback payload' }
      }
    });
    expect(mapResponse).not.toHaveProperty('error');
  });

  it('returns the synchronous callback response and trigger input', async () => {
    let context = new SlateContext(
      {},
      {
        request: new Request('https://callbacks.example.test/receiver-secret', {
          method: 'POST',
          headers: {
            'content-type': 'text/plain',
            'x-test-sync': '1'
          },
          body: 'callback payload'
        }),
        state: null,
        registrationDetails: null
      },
      {},
      spec,
      new SlateLogger([])
    );
    let result = await webhookSyncEcho.handleRequest?.(context);

    expect(result?.inputs).toEqual([{ payload: 'callback payload' }]);
    expect(result?.response).toBeInstanceOf(Response);

    let response = result?.response as Response;
    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toBe('text/plain');
    expect(response.headers.get('x-test-webhook-response')).toBe('sync-echo');
    await expect(response.text()).resolves.toBe('webhook accepted');
  });
});
