import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const VALIDATION_TOKEN = 'powerpoint validation + token';

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

describe('PowerPoint Online webhook validation contract', () => {
  it('advertises POST validation-token requests as synchronous', async () => {
    let contract = await getSlateContract(createTestClient());
    let trigger = contract.triggers.find(action => action.id === 'file_changes');

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
      triggerId: 'file_changes',
      url: `https://example.com/webhooks/powerpoint?validationToken=${encodeURIComponent(VALIDATION_TOKEN)}`
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
      triggerId: 'file_changes',
      url: 'https://example.com/webhooks/powerpoint',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        value: [
          {
            subscriptionId: 'sub',
            changeType: 'updated',
            resource: 'me/drive/root',
            tenantId: 'tenant-1',
            clientState: 'slates_123'
          }
        ]
      })
    });

    expect(result.response).toBeUndefined();
    expect(result.inputs).toEqual([
      {
        resourceId: 'me/drive/root',
        subscriptionId: 'sub',
        changeType: 'updated',
        tenantId: 'tenant-1',
        clientState: 'slates_123'
      }
    ]);
  });
});
