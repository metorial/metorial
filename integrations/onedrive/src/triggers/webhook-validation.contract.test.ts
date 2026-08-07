import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const VALIDATION_TOKEN = 'onedrive validation + token';

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

describe('OneDrive webhook validation contract', () => {
  it('advertises POST validation-token requests as synchronous', async () => {
    let contract = await getSlateContract(createTestClient());
    let trigger = contract.triggers.find(action => action.id === 'drive_item_changes');

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
      triggerId: 'drive_item_changes',
      url: `https://example.com/webhooks/onedrive?validationToken=${encodeURIComponent(VALIDATION_TOKEN)}`
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 200,
      headers: { 'content-type': 'text/plain' }
    });
    expect(decodeResponseBody(result.response!)).toBe(VALIDATION_TOKEN);
  });

  it('returns no inputs and no synchronous response for an empty notification batch', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: 'drive_item_changes',
      url: 'https://example.com/webhooks/onedrive',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ value: [] })
    });

    expect(result.response).toBeUndefined();
    expect(result.inputs).toEqual([]);
  });
});
