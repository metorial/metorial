import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const VALIDATION_TOKEN = 'superhuman validation + token';

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

describe('Superhuman Microsoft 365 webhook validation contract', () => {
  it('advertises POST validation-token requests as synchronous', async () => {
    let contract = await getSlateContract(createTestClient());
    let trigger = contract.triggers.find(action => action.id === 'conversation_changes');

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
  });

  it('echoes the decoded validation token as synchronous text', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: 'conversation_changes',
      url: `https://example.com/webhooks/superhuman?validationToken=${encodeURIComponent(VALIDATION_TOKEN)}`
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
      triggerId: 'conversation_changes',
      url: 'https://example.com/webhooks/superhuman',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        value: [
          {
            changeType: 'created',
            resource: 'Users/user-1/Messages/message-1',
            resourceData: { id: 'message-1' },
            subscriptionId: 'sub',
            clientState: 'slates-conversation-changes',
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
