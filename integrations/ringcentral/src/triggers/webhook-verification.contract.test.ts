import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const TRIGGER_IDS = [
  'telephony_events',
  'sms_events',
  'presence_events',
  'message_events',
  'team_messaging_events'
];

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

describe('RingCentral webhook verification contract', () => {
  it('advertises synchronous Validation-Token handshakes for every webhook', async () => {
    let contract = await getSlateContract(createTestClient());

    for (let triggerId of TRIGGER_IDS) {
      let trigger = contract.triggers.find(action => action.id === triggerId);
      expect(trigger?.invocation).toMatchObject({
        type: 'webhook',
        http: {
          methods: ['POST'],
          sync: {
            mode: 'match',
            match: [{ hasHeader: 'validation-token' }]
          }
        }
      });
    }
  });

  it.each(TRIGGER_IDS)('echoes the validation token for %s', async triggerId => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId,
      url: 'https://example.com/webhooks/ringcentral',
      headers: { 'validation-token': 'ringcentral-validation-token' }
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 200,
      headers: {
        'content-type': 'application/json',
        'validation-token': 'ringcentral-validation-token'
      }
    });
  });
});
