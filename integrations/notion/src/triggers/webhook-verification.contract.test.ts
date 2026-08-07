import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const TRIGGER_IDS = ['page_events', 'comment_events', 'database_events'];
const VERIFICATION_TOKEN = 'secret_notion-verification-token';

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

let signNotionRequest = (body: string, token = VERIFICATION_TOKEN) => ({
  'x-notion-signature': `sha256=${createHmac('sha256', token).update(body).digest('hex')}`
});

let pageEventBody = () =>
  JSON.stringify({
    type: 'page.created',
    id: 'event-1',
    timestamp: '2026-08-06T00:00:00.000Z',
    entity: { id: 'page-1', type: 'page' }
  });

describe('Notion webhook verification contract', () => {
  it('advertises synchronous verification-token requests for every webhook', async () => {
    let contract = await getSlateContract(createTestClient());

    for (let triggerId of TRIGGER_IDS) {
      let trigger = contract.triggers.find(action => action.id === triggerId);
      expect(trigger?.invocation).toMatchObject({
        type: 'webhook',
        http: {
          methods: ['POST'],
          sync: {
            mode: 'match',
            match: [{ jsonBodyField: { path: 'verification_token' } }]
          }
        }
      });
    }
  });

  it.each(
    TRIGGER_IDS
  )('stores the verification token and acknowledges the request for %s', async triggerId => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId,
      url: 'https://example.com/webhooks/notion',
      body: JSON.stringify({ verification_token: VERIFICATION_TOKEN })
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({ status: 200, body: null });
    expect(result.updatedState).toMatchObject({ verificationToken: VERIFICATION_TOKEN });
  });

  it('accepts a correctly signed delivery once the token is stored', async () => {
    let body = pageEventBody();
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: 'page_events',
      url: 'https://example.com/webhooks/notion',
      headers: signNotionRequest(body),
      body,
      state: { verificationToken: VERIFICATION_TOKEN }
    });

    expect(result.inputs).toMatchObject([{ eventType: 'page.created', pageId: 'page-1' }]);
    expect(result.response).toBeUndefined();
  });

  it('rejects missing or invalid signatures once the token is stored', async () => {
    let body = pageEventBody();

    for (let headers of [undefined, signNotionRequest(body, 'wrong-token')]) {
      let result = await handleSlateTriggerWebhook({
        client: createTestClient(),
        triggerId: 'page_events',
        url: 'https://example.com/webhooks/notion',
        headers,
        body,
        state: { verificationToken: VERIFICATION_TOKEN }
      });

      expect(result.inputs).toEqual([]);
      expect(result.response).toMatchObject({ status: 401 });
    }
  });

  it('keeps unsigned deliveries working when no token has been stored', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: 'page_events',
      url: 'https://example.com/webhooks/notion',
      body: pageEventBody()
    });

    expect(result.inputs).toMatchObject([{ eventType: 'page.created', pageId: 'page-1' }]);
    expect(result.response).toBeUndefined();
  });

  it('ignores malformed JSON bodies without failing', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: 'page_events',
      url: 'https://example.com/webhooks/notion',
      body: 'not-json'
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toBeUndefined();
  });
});
