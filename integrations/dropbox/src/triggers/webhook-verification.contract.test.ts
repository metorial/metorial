import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const CHALLENGE = 'dropbox challenge + token';

let createTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'test-token' }
      }
    }
  });

let decodeResponseBody = (response: {
  body?: { encoding: 'base64'; content: string } | null;
}) => Buffer.from(response.body?.content ?? '', 'base64').toString();

describe('Dropbox webhook verification contract', () => {
  it('advertises GET challenge handling while retaining POST notifications', async () => {
    let contract = await getSlateContract(createTestClient());
    let trigger = contract.triggers.find(action => action.id === 'inbound_webhook');

    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        methods: ['GET', 'POST'],
        sync: {
          mode: 'match',
          match: [{ method: 'GET', hasQueryParam: 'challenge' }]
        }
      }
    });
  });

  it('echoes the exact decoded GET challenge with safe text headers', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: 'inbound_webhook',
      url: `https://example.com/webhooks/dropbox?challenge=${encodeURIComponent(CHALLENGE)}`,
      method: 'GET'
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 200,
      headers: {
        'content-type': 'text/plain',
        'x-content-type-options': 'nosniff'
      }
    });
    expect(decodeResponseBody(result.response!)).toBe(CHALLENGE);
  });

  it('rejects a GET without a challenge parameter without creating inputs', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: 'inbound_webhook',
      url: 'https://example.com/webhooks/dropbox',
      method: 'GET'
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 400,
      headers: { 'content-type': 'text/plain' }
    });
    expect(decodeResponseBody(result.response!)).toBe('missing challenge parameter');
  });

  it('preserves normal POST event inputs', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: 'inbound_webhook',
      url: 'https://example.com/webhooks/dropbox',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ list_folder: { accounts: ['dbid:test'] } })
    });

    expect(result.inputs).toEqual([
      {
        payload: { list_folder: { accounts: ['dbid:test'] } },
        contentType: 'application/json'
      }
    ]);
    expect(result.response).toBeUndefined();
  });
});
