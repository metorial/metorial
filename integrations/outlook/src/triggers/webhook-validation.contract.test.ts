import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const TRIGGER_IDS = ['message_changes', 'event_changes', 'contact_changes'];
const VALIDATION_TOKEN = 'outlook validation + token';

let createTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth_common',
        output: { token: 'test-token' }
      }
    }
  });

let decodeResponseBody = (response: {
  body?: { encoding: 'base64'; content: string } | null;
}) => Buffer.from(response.body?.content ?? '', 'base64').toString();

describe('Outlook webhook validation contract', () => {
  it('advertises POST validation-token requests as synchronous', async () => {
    let contract = await getSlateContract(createTestClient());

    for (let triggerId of TRIGGER_IDS) {
      let trigger = contract.triggers.find(action => action.id === triggerId);
      expect(trigger?.invocation).toMatchObject({
        type: 'webhook',
        http: {
          methods: ['POST'],
          sync: {
            mode: 'match',
            match: [{ hasQueryParam: 'validationToken' }]
          }
        }
      });
    }
  });

  it.each(TRIGGER_IDS)('echoes the decoded validation token for %s', async triggerId => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId,
      url: `https://example.com/webhooks/outlook?validationToken=${encodeURIComponent(VALIDATION_TOKEN)}`
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 200,
      headers: { 'content-type': 'text/plain' }
    });
    expect(decodeResponseBody(result.response!)).toBe(VALIDATION_TOKEN);
  });

  it('maps ordinary change notifications to inputs without a synchronous response', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: 'message_changes',
      url: 'https://example.com/webhooks/outlook',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        value: [
          {
            changeType: 'created',
            resource: 'Users/user-1/Messages/message-1',
            resourceData: { id: 'message-1' },
            subscriptionId: 'sub',
            clientState: 'slates-message-changes',
            tenantId: 'tenant-1'
          }
        ]
      })
    });

    expect(result.response).toBeUndefined();
    expect(result.inputs).toEqual([
      {
        changeType: 'created',
        resourceUri: 'Users/user-1/Messages/message-1',
        messageId: 'message-1',
        subscriptionId: 'sub',
        tenantId: 'tenant-1'
      }
    ]);
  });
});
