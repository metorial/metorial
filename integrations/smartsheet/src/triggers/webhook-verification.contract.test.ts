import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const CHALLENGE = 'smartsheet-challenge';

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

describe('Smartsheet webhook verification contract', () => {
  it('advertises synchronous challenge requests', async () => {
    let contract = await getSlateContract(createTestClient());
    let trigger = contract.triggers.find(action => action.id === 'sheet_changes');

    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        methods: ['POST'],
        sync: {
          mode: 'match',
          match: [{ jsonBodyField: { path: 'challenge' } }]
        }
      }
    });
  });

  it('returns the documented JSON challenge response', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: 'sheet_changes',
      url: 'https://example.com/webhooks/smartsheet',
      body: JSON.stringify({ challenge: CHALLENGE })
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
    expect(Buffer.from(result.response?.body?.content ?? '', 'base64').toString()).toBe(
      JSON.stringify({ smartsheetHookResponse: CHALLENGE })
    );
  });
});
