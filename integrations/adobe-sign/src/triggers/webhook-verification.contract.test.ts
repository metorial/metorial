import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const TRIGGER_CASES = [
  {
    triggerId: 'agreement_events',
    body: {
      event: 'AGREEMENT_CREATED',
      webhookNotificationId: 'agreement-notification',
      agreement: { id: 'agreement-id' }
    }
  },
  {
    triggerId: 'web_form_events',
    body: {
      event: 'WIDGET_CREATED',
      webhookNotificationId: 'widget-notification',
      widget: { id: 'widget-id' }
    }
  },
  {
    triggerId: 'megasign_events',
    body: {
      event: 'MEGASIGN_CREATED',
      webhookNotificationId: 'megasign-notification',
      megaSign: { id: 'megasign-id' }
    }
  }
];
const CLIENT_ID = 'adobe-client-id';

let createTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth_na1',
        output: { token: 'test-token', shard: 'na1' }
      }
    }
  });

let decodeResponseBody = (response: {
  body?: { encoding: 'base64'; content: string } | null;
}) => Buffer.from(response.body?.content ?? '', 'base64').toString();

describe('Adobe Sign webhook verification contract', () => {
  it('advertises every webhook as always synchronous for GET and POST', async () => {
    let contract = await getSlateContract(createTestClient());

    for (let { triggerId } of TRIGGER_CASES) {
      let trigger = contract.triggers.find(action => action.id === triggerId);
      expect(trigger?.invocation).toMatchObject({
        type: 'webhook',
        http: {
          methods: ['GET', 'POST'],
          sync: { mode: 'always' }
        }
      });
    }
  });

  it.each(TRIGGER_CASES)('echoes the client id for GET on $triggerId', async ({
    triggerId
  }) => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId,
      url: 'https://example.com/webhooks/adobe-sign',
      method: 'GET',
      headers: { 'x-adobesign-clientid': CLIENT_ID }
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
    expect(decodeResponseBody(result.response!)).toBe(
      JSON.stringify({ xAdobeSignClientId: CLIENT_ID })
    );
  });

  it.each(TRIGGER_CASES)('preserves $triggerId event inputs while responding to POST', async ({
    triggerId,
    body
  }) => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId,
      url: 'https://example.com/webhooks/adobe-sign',
      headers: { 'x-adobesign-clientid': CLIENT_ID },
      body: JSON.stringify(body)
    });

    expect(result.inputs).toHaveLength(1);
    expect(result.response).toMatchObject({ status: 200 });
    expect(decodeResponseBody(result.response!)).toBe(
      JSON.stringify({ xAdobeSignClientId: CLIENT_ID })
    );
  });
});
