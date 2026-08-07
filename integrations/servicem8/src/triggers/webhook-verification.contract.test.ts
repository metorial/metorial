import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook,
  unregisterSlateTriggerWebhook
} from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provider } from '../index';

const webhookMocks = vi.hoisted(() => ({
  subscribeEventWebhook: vi.fn(),
  unsubscribeEventWebhook: vi.fn()
}));

vi.mock('../lib/webhooks', async importOriginal => {
  let actual = await importOriginal<typeof import('../lib/webhooks')>();
  return {
    ...actual,
    WebhookClient: class {
      subscribeEventWebhook = webhookMocks.subscribeEventWebhook;
      unsubscribeEventWebhook = webhookMocks.unsubscribeEventWebhook;
    }
  };
});

const TRIGGER_IDS = ['job_events', 'client_events', 'staff_events'];
const CHALLENGE = 'servicem8-challenge';
const WEBHOOK_CASES = [
  {
    triggerId: 'job_events',
    event: 'job.updated',
    uniqueId: 'job_event_notifications',
    legacyUniqueId: 'slates_job_events'
  },
  {
    triggerId: 'client_events',
    event: 'company.updated',
    uniqueId: 'client_event_notifications',
    legacyUniqueId: 'slates_client_events'
  },
  {
    triggerId: 'staff_events',
    event: 'staff.clocked_on',
    uniqueId: 'staff_event_notifications',
    legacyUniqueId: 'slates_staff_events'
  }
];

beforeEach(() => {
  vi.clearAllMocks();
});

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

describe('ServiceM8 webhook verification contract', () => {
  it('advertises synchronous subscribe-mode requests for every webhook', async () => {
    let contract = await getSlateContract(createTestClient());

    for (let triggerId of TRIGGER_IDS) {
      let trigger = contract.triggers.find(action => action.id === triggerId);
      expect(trigger?.invocation).toMatchObject({
        type: 'webhook',
        http: {
          methods: ['POST'],
          sync: {
            mode: 'match',
            match: [
              { formBodyField: { path: 'mode', equals: 'subscribe' } },
              { jsonBodyField: { path: 'mode', equals: 'subscribe' } }
            ]
          }
        }
      });
    }
  });

  it.each(TRIGGER_IDS)('returns only the challenge for %s', async triggerId => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId,
      url: 'https://example.com/webhooks/servicem8',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ mode: 'subscribe', challenge: CHALLENGE }).toString()
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 200,
      headers: { 'content-type': 'text/plain' }
    });
    expect(Buffer.from(result.response?.body?.content ?? '', 'base64').toString()).toBe(
      CHALLENGE
    );
  });

  it.each(TRIGGER_IDS)('preserves JSON challenge compatibility for %s', async triggerId => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId,
      url: 'https://example.com/webhooks/servicem8',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'subscribe', challenge: CHALLENGE })
    });

    expect(result.inputs).toEqual([]);
    expect(Buffer.from(result.response?.body?.content ?? '', 'base64').toString()).toBe(
      CHALLENGE
    );
  });

  it.each([
    ['job_events', 'job.updated'],
    ['client_events', 'company.updated'],
    ['staff_events', 'staff.clocked_on']
  ])('keeps ordinary JSON event handling for %s', async (triggerId, event) => {
    let body = { event, data: { uuid: `${triggerId}-resource` } };
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId,
      url: 'https://example.com/webhooks/servicem8',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });

    expect(result.response).toBeUndefined();
    expect(result.inputs).toEqual([{ eventType: event, eventPayload: body }]);
  });

  it.each(WEBHOOK_CASES)('unregisters $triggerId with its stored neutral unique id', async ({
    triggerId,
    event,
    uniqueId
  }) => {
    await unregisterSlateTriggerWebhook({
      client: createTestClient(),
      triggerId,
      webhookBaseUrl: 'https://example.com/webhooks/servicem8',
      registrationDetails: {
        registeredEvents: [event],
        callbackUrl: 'https://example.com/webhooks/servicem8',
        uniqueId
      }
    });

    expect(webhookMocks.unsubscribeEventWebhook).toHaveBeenCalledWith({
      event,
      callbackUrl: 'https://example.com/webhooks/servicem8',
      uniqueId
    });
  });

  it.each(
    WEBHOOK_CASES
  )('unregisters legacy $triggerId details with the historical unique id', async ({
    triggerId,
    event,
    legacyUniqueId
  }) => {
    await unregisterSlateTriggerWebhook({
      client: createTestClient(),
      triggerId,
      webhookBaseUrl: 'https://example.com/webhooks/servicem8',
      registrationDetails: {
        registeredEvents: [event],
        callbackUrl: 'https://example.com/webhooks/servicem8'
      }
    });

    expect(webhookMocks.unsubscribeEventWebhook).toHaveBeenCalledWith({
      event,
      callbackUrl: 'https://example.com/webhooks/servicem8',
      uniqueId: legacyUniqueId
    });
  });
});
