import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook,
  mapSlateTriggerEvent
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

let client = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth',
        output: {
          token: 'xoxb-test-token',
          actorType: 'bot',
          signingSecret: 'slack-signing-secret'
        }
      }
    }
  });

describe('Slack new_message_webhook fail-closed contract', () => {
  it('requires the named signing secret before bootstrap or delivery', async () => {
    let contract = await getSlateContract(client());
    let trigger = contract.triggers.find(action => action.id === 'new_message_webhook');
    expect(JSON.stringify(contract.configSchema)).not.toContain('signingSecret');
    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        methods: ['POST'],
        ingress: {
          verification: {
            mechanism: 'hub',
            allowedSecretRefs: [
              {
                source: 'auth_config',
                name: 'slack_signing_secret',
                credentialKey: 'signingSecret'
              }
            ],
            rules: [
              {
                phase: 'bootstrap',
                verify: { type: 'preset', preset: 'slack.v0' },
                result: { type: 'dispatch', scope: 'receiver_trigger' }
              },
              {
                phase: 'delivery',
                verify: { type: 'preset', preset: 'slack.v0' },
                replay: {
                  freshness: { source: 'preset', presetField: 'timestamp' },
                  deduplicate: { source: 'json_pointer', pointer: '/event_id' }
                }
              }
            ]
          }
        }
      }
    });
  });

  it('returns a synchronous URL verification challenge only after signature verification', async () => {
    let body = JSON.stringify({
      type: 'url_verification',
      challenge: 'challenge-value'
    });
    let result = await handleSlateTriggerWebhook({
      client: client(),
      triggerId: 'new_message_webhook',
      url: 'https://example.com/slack',
      body
    });
    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({ status: 200 });
    expect(Buffer.from(result.response?.body?.content ?? '', 'base64').toString('utf8')).toBe(
      JSON.stringify({ challenge: 'challenge-value' })
    );
  });

  it('maps only a valid message event and gives retries a stable event id', async () => {
    let result = await handleSlateTriggerWebhook({
      client: client(),
      triggerId: 'new_message_webhook',
      url: 'https://example.com/slack',
      body: JSON.stringify({
        type: 'event_callback',
        event_id: 'event-1',
        event: {
          type: 'message',
          channel: 'C123',
          user: 'U123',
          text: 'hello',
          ts: '1710000000.000100'
        }
      })
    });
    expect(result.inputs).toEqual([
      {
        messageTs: '1710000000.000100',
        channelId: 'C123',
        text: 'hello',
        userId: 'U123'
      }
    ]);
    let event = await mapSlateTriggerEvent({
      client: client(),
      triggerId: 'new_message_webhook',
      input: result.inputs[0]!
    });
    expect(event.id).toBe('C123-1710000000.000100');
  });

  it('does not parse malformed or non-message events into inputs', async () => {
    for (let body of [
      'not-json',
      JSON.stringify({ type: 'event_callback', event: { type: 'reaction_added' } })
    ]) {
      let result = await handleSlateTriggerWebhook({
        client: client(),
        triggerId: 'new_message_webhook',
        url: 'https://example.com/slack',
        body
      });
      expect(result.inputs).toEqual([]);
    }
  });
});
