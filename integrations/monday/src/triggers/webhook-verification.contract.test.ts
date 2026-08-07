import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const TRIGGER_IDS = ['item_events', 'column_value_changes', 'update_events'];
const CHALLENGE = 'monday-challenge';

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

describe('monday.com webhook verification contract', () => {
  it('advertises synchronous challenge requests for every webhook', async () => {
    let contract = await getSlateContract(createTestClient());

    for (let triggerId of TRIGGER_IDS) {
      let trigger = contract.triggers.find(action => action.id === triggerId);
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
    }
  });

  it.each(TRIGGER_IDS)('echoes the JSON challenge for %s', async triggerId => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId,
      url: 'https://example.com/webhooks/monday',
      body: JSON.stringify({ challenge: CHALLENGE })
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
    expect(Buffer.from(result.response?.body?.content ?? '', 'base64').toString()).toBe(
      JSON.stringify({ challenge: CHALLENGE })
    );
  });
});
