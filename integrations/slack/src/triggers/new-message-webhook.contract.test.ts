import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook,
  mapSlateTriggerEvent
} from '@slates/test';
import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const SIGNING_SECRET = 'slack-signing-secret';
const WEBHOOK_URL = 'https://example.com/callbacks/slack/messages';

let createSlackTriggerTestClient = (signingSecret?: string) =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: signingSecret ? { signingSecret } : {},
      auth: {
        authenticationMethodId: 'oauth',
        output: {
          token: 'xoxb-test-token',
          actorType: 'bot'
        }
      }
    }
  });

let signSlackRequest = (body: string, timestamp = Math.floor(Date.now() / 1_000)) => ({
  'x-slack-request-timestamp': String(timestamp),
  'x-slack-signature': `v0=${createHmac('sha256', SIGNING_SECRET)
    .update(`v0:${timestamp}:${body}`)
    .digest('hex')}`
});

let decodeResponseBody = (response: {
  body?: { encoding: 'base64'; content: string } | null;
}) => Buffer.from(response.body?.content ?? '', 'base64').toString();

let signatureRejectionCases: { name: string; headers: Record<string, string> }[] = [
  {
    name: 'missing signature headers',
    headers: {}
  },
  {
    name: 'an invalid signature',
    headers: {
      'x-slack-request-timestamp': String(Math.floor(Date.now() / 1_000)),
      'x-slack-signature': 'v0=invalid'
    }
  },
  {
    name: 'a stale timestamp',
    headers: signSlackRequest(
      JSON.stringify({ type: 'event_callback' }),
      Math.floor(Date.now() / 1_000) - 301
    )
  }
];

describe('Slack new_message_webhook contract', () => {
  it('advertises synchronous handling only for URL verification requests', async () => {
    let contract = await getSlateContract(createSlackTriggerTestClient());
    let trigger = contract.triggers.find(action => action.id === 'new_message_webhook');

    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        methods: ['POST'],
        sync: {
          mode: 'match',
          match: [
            {
              jsonBodyField: {
                path: 'type',
                equals: 'url_verification'
              }
            }
          ]
        }
      }
    });
  });

  it('returns the exact URL verification challenge as synchronous text', async () => {
    let client = createSlackTriggerTestClient(SIGNING_SECRET);
    let body = JSON.stringify({ type: 'url_verification', challenge: 'challenge-value' });
    let result = await handleSlateTriggerWebhook({
      client,
      triggerId: 'new_message_webhook',
      url: WEBHOOK_URL,
      headers: signSlackRequest(body),
      body
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 200,
      headers: {
        'content-type': 'text/plain'
      }
    });
    expect(decodeResponseBody(result.response!)).toBe('challenge-value');
  });

  it('accepts a valid signed message event', async () => {
    let client = createSlackTriggerTestClient(SIGNING_SECRET);
    let body = JSON.stringify({
      type: 'event_callback',
      event: {
        type: 'message',
        channel: 'C123',
        user: 'U123',
        text: 'hello',
        ts: '1710000000.000100'
      }
    });
    let result = await handleSlateTriggerWebhook({
      client,
      triggerId: 'new_message_webhook',
      url: WEBHOOK_URL,
      headers: signSlackRequest(body),
      body
    });

    expect(result.inputs).toEqual([
      {
        messageTs: '1710000000.000100',
        channelId: 'C123',
        text: 'hello',
        userId: 'U123'
      }
    ]);
    expect(result.response).toBeUndefined();
  });

  it.each(signatureRejectionCases)('rejects $name without producing inputs', async ({
    headers
  }) => {
    let client = createSlackTriggerTestClient(SIGNING_SECRET);
    let body = JSON.stringify({ type: 'event_callback' });
    let result = await handleSlateTriggerWebhook({
      client,
      triggerId: 'new_message_webhook',
      url: WEBHOOK_URL,
      headers,
      body
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({ status: 401 });
    expect(decodeResponseBody(result.response!)).toBe('invalid signature');
  });

  it('keeps unsigned event delivery backward compatible when no secret is configured', async () => {
    let client = createSlackTriggerTestClient();
    let body = JSON.stringify({
      type: 'event_callback',
      event: {
        type: 'message',
        channel: 'C456',
        text: 'unsigned event',
        ts: '1710000001.000200'
      }
    });
    let result = await handleSlateTriggerWebhook({
      client,
      triggerId: 'new_message_webhook',
      url: WEBHOOK_URL,
      body
    });

    expect(result.inputs).toEqual([
      {
        messageTs: '1710000001.000200',
        channelId: 'C456',
        text: 'unsigned event'
      }
    ]);
  });

  it('maps Slack retries for the same message to one stable event id', async () => {
    let client = createSlackTriggerTestClient();
    let body = JSON.stringify({
      type: 'event_callback',
      event: {
        type: 'message',
        channel: 'C789',
        text: 'retry me',
        ts: '1710000002.000300'
      }
    });
    let first = await handleSlateTriggerWebhook({
      client,
      triggerId: 'new_message_webhook',
      url: WEBHOOK_URL,
      body
    });
    let retry = await handleSlateTriggerWebhook({
      client,
      triggerId: 'new_message_webhook',
      url: WEBHOOK_URL,
      headers: {
        'x-slack-retry-num': '1',
        'x-slack-retry-reason': 'http_timeout'
      },
      body
    });

    let firstEvent = await mapSlateTriggerEvent({
      client,
      triggerId: 'new_message_webhook',
      input: first.inputs[0]!
    });
    let retriedEvent = await mapSlateTriggerEvent({
      client,
      triggerId: 'new_message_webhook',
      input: retry.inputs[0]!
    });

    expect(firstEvent.id).toBe('C789-1710000002.000300');
    expect(retriedEvent.id).toBe(firstEvent.id);
  });
});
