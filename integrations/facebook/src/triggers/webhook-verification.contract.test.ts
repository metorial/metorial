import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

let createFacebookTriggerTestClient = (webhookVerifyToken?: string) =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {
        apiVersion: 'v25.0',
        ...(webhookVerifyToken ? { webhookVerifyToken } : {})
      },
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'facebook-test-token' }
      }
    }
  });

let decodeBody = (response: { body?: { content: string } | null }) =>
  Buffer.from(response.body?.content ?? '', 'base64').toString();

let verificationUrl = (verifyToken: string) =>
  `https://example.com/callbacks/facebook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge-value`;

describe('Facebook webhook verification contract', () => {
  it('advertises GET verification without making POST events synchronous', async () => {
    let contract = await getSlateContract(createFacebookTriggerTestClient());
    let trigger = contract.triggers.find(action => action.id === 'page_webhook');

    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        methods: ['GET', 'POST'],
        sync: {
          mode: 'match',
          match: [{ method: 'GET', hasQueryParam: 'hub.mode' }]
        }
      }
    });
  });

  it('echoes a matching challenge and rejects a mismatched Verify Token', async () => {
    let client = createFacebookTriggerTestClient('expected-token');
    let accepted = await handleSlateTriggerWebhook({
      client,
      triggerId: 'page_webhook',
      method: 'GET',
      url: verificationUrl('expected-token')
    });
    let rejected = await handleSlateTriggerWebhook({
      client,
      triggerId: 'page_webhook',
      method: 'GET',
      url: verificationUrl('wrong-token')
    });

    expect(accepted.response).toMatchObject({
      status: 200,
      headers: { 'content-type': 'text/plain' }
    });
    expect(decodeBody(accepted.response!)).toBe('challenge-value');
    expect(rejected.inputs).toEqual([]);
    expect(rejected.response).toMatchObject({ status: 403 });
  });

  it('preserves legacy challenge handling when no Verify Token is configured', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createFacebookTriggerTestClient(),
      triggerId: 'page_webhook',
      method: 'GET',
      url: verificationUrl('legacy-token')
    });

    expect(result.response).toMatchObject({ status: 200 });
    expect(decodeBody(result.response!)).toBe('challenge-value');
  });

  it('preserves normal POST event inputs', async () => {
    let entry = {
      id: 'page-id',
      time: 1700000000,
      changes: [{ field: 'feed', value: { post_id: 'post-1', from: { id: 'user-1' } } }]
    };
    let result = await handleSlateTriggerWebhook({
      client: createFacebookTriggerTestClient('expected-token'),
      triggerId: 'page_webhook',
      url: 'https://example.com/callbacks/facebook',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ object: 'page', entry: [entry] })
    });

    expect(result.inputs).toEqual([
      {
        eventType: 'feed',
        eventId: 'page-id_feed_1700000000_post-1',
        pageId: 'page-id',
        changeField: 'feed',
        changeValue: { post_id: 'post-1', from: { id: 'user-1' } },
        senderId: 'user-1',
        timestamp: 1700000000,
        rawEntry: entry
      }
    ]);
    expect(result.response).toBeUndefined();
  });
});
