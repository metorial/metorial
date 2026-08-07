import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const TRIGGER_IDS = [
  'channel_message',
  'chat_message',
  'team_change',
  'membership_change',
  'channel_change'
];
const VALIDATION_TOKEN = 'teams validation + token';

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

describe('Microsoft Teams webhook validation contract', () => {
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
      url: `https://example.com/webhooks/teams?validationToken=${encodeURIComponent(VALIDATION_TOKEN)}`
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
      triggerId: 'channel_message',
      url: 'https://example.com/webhooks/teams',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        value: [
          {
            subscriptionId: 'sub',
            changeType: 'created',
            resource: "teams('team-1')/channels('channel-1')/messages('message-1')",
            tenantId: 'tenant-1',
            resourceData: { id: 'message-1' }
          }
        ]
      })
    });

    expect(result.response).toBeUndefined();
    expect(result.inputs).toEqual([
      {
        changeType: 'created',
        resourceUrl: "teams('team-1')/channels('channel-1')/messages('message-1')",
        subscriptionId: 'sub',
        tenantId: 'tenant-1',
        resourceData: { id: 'message-1' }
      }
    ]);
  });
});
