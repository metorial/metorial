import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

let createInstagramTriggerTestClient = (webhookVerifyToken?: string) =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {
        apiVersion: 'v21.0',
        ...(webhookVerifyToken ? { webhookVerifyToken } : {})
      },
      auth: {
        authenticationMethodId: 'instagram_login',
        output: { token: 'instagram-test-token' }
      }
    }
  });

let decodeBody = (response: { body?: { content: string } | null }) =>
  Buffer.from(response.body?.content ?? '', 'base64').toString();

let verificationUrl = (verifyToken: string) =>
  `https://example.com/callbacks/instagram?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge-value`;

describe('Instagram webhook verification contract', () => {
  it('advertises GET verification without making POST events synchronous', async () => {
    let contract = await getSlateContract(createInstagramTriggerTestClient());
    let trigger = contract.triggers.find(action => action.id === 'webhook_events');

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
    let client = createInstagramTriggerTestClient('expected-token');
    let accepted = await handleSlateTriggerWebhook({
      client,
      triggerId: 'webhook_events',
      method: 'GET',
      url: verificationUrl('expected-token')
    });
    let rejected = await handleSlateTriggerWebhook({
      client,
      triggerId: 'webhook_events',
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
      client: createInstagramTriggerTestClient(),
      triggerId: 'webhook_events',
      method: 'GET',
      url: verificationUrl('legacy-token')
    });

    expect(result.response).toMatchObject({ status: 200 });
    expect(decodeBody(result.response!)).toBe('challenge-value');
  });

  it('preserves normal POST event inputs', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createInstagramTriggerTestClient('expected-token'),
      triggerId: 'webhook_events',
      url: 'https://example.com/callbacks/instagram',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        object: 'instagram',
        entry: [
          {
            id: 'ig-user-1',
            time: 1700000000,
            changes: [
              {
                field: 'comments',
                value: { id: 'comment-1', media: { id: 'media-1' }, text: 'Nice reel!' }
              }
            ]
          }
        ]
      })
    });

    expect(result.inputs).toEqual([
      {
        eventType: 'comment',
        eventId: 'comment-1',
        commentId: 'comment-1',
        mediaId: 'media-1',
        commentText: 'Nice reel!',
        timestamp: new Date(1700000000 * 1000).toISOString()
      }
    ]);
    expect(result.response).toBeUndefined();
  });
});
