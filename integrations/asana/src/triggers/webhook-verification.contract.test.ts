import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const TRIGGER_ID = 'task_changes_webhook';

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

describe('Asana webhook verification contract', () => {
  it('advertises synchronous X-Hook-Secret handshakes', async () => {
    let contract = await getSlateContract(createTestClient());
    let trigger = contract.triggers.find(action => action.id === TRIGGER_ID);

    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        methods: ['POST'],
        sync: {
          mode: 'match',
          match: [{ hasHeader: 'x-hook-secret' }]
        }
      }
    });
  });

  it('echoes the handshake secret in the response header', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: TRIGGER_ID,
      url: 'https://example.com/webhooks/asana',
      headers: { 'x-hook-secret': 'asana-hook-secret' }
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 200,
      headers: { 'x-hook-secret': 'asana-hook-secret' }
    });
  });

  it('uses registration details to reject an invalid event signature', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: TRIGGER_ID,
      url: 'https://example.com/webhooks/asana',
      headers: { 'x-hook-signature': 'invalid' },
      body: JSON.stringify({ events: [] }),
      registrationDetails: { hookSecret: 'stored-secret' }
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({ status: 401 });
    expect(decodeResponseBody(result.response!)).toBe('Invalid signature');
  });

  it('rejects an unsigned event when a hook secret is stored', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: TRIGGER_ID,
      url: 'https://example.com/webhooks/asana',
      body: JSON.stringify({ events: [] }),
      registrationDetails: { hookSecret: 'stored-secret' }
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({ status: 401 });
  });

  it('passes unsigned events through when no registration details exist', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: TRIGGER_ID,
      url: 'https://example.com/webhooks/asana',
      body: JSON.stringify({
        events: [
          {
            action: 'added',
            created_at: '2026-08-06T00:00:00.000Z',
            resource: { resource_type: 'task', gid: '67890' }
          }
        ]
      })
    });

    expect(result.inputs).toMatchObject([{ taskId: '67890', action: 'added' }]);
    expect(result.response).toBeUndefined();
  });

  it('accepts a correctly signed event delivery', async () => {
    let body = JSON.stringify({
      events: [
        {
          action: 'changed',
          created_at: '2026-08-06T00:00:00.000Z',
          resource: { resource_type: 'task', gid: '12345' }
        }
      ]
    });
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: TRIGGER_ID,
      url: 'https://example.com/webhooks/asana',
      headers: {
        'x-hook-signature': createHmac('sha256', 'stored-secret').update(body).digest('hex')
      },
      body,
      registrationDetails: { hookSecret: 'stored-secret' }
    });

    expect(result.inputs).toEqual([
      { taskId: '12345', action: 'changed', eventCreatedAt: '2026-08-06T00:00:00.000Z' }
    ]);
    expect(result.response).toBeUndefined();
  });
});
