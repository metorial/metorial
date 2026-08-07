import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const TRIGGER_IDS = [
  'meeting_events',
  'webinar_events',
  'recording_events',
  'user_events',
  'chat_message_events'
] as const;
const PLAIN_TOKEN = 'qgg8vlvZRS6UYooatFL8Aw';
const ENCRYPTED_TOKEN = 'd9e0d764a78494688ba3f2d5c0ed4ca311394b4834d959759213424d2df961e3';

let createZoomTriggerTestClient = (secretToken?: string) =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: secretToken ? { secretToken } : {},
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'zoom-test-token' }
      }
    }
  });

let decodeBody = (response: { body?: { content: string } | null }) =>
  Buffer.from(response.body?.content ?? '', 'base64').toString();

describe('Zoom webhook URL validation contract', () => {
  it('advertises a narrow synchronous matcher on all webhook triggers', async () => {
    let contract = await getSlateContract(createZoomTriggerTestClient('zoom-secret-token'));

    for (let triggerId of TRIGGER_IDS) {
      let trigger = contract.triggers.find(action => action.id === triggerId);
      expect(trigger?.invocation).toMatchObject({
        type: 'webhook',
        http: {
          methods: ['POST'],
          sync: {
            mode: 'match',
            match: [
              {
                jsonBodyField: {
                  path: 'event',
                  equals: 'endpoint.url_validation'
                }
              }
            ]
          }
        }
      });
    }
  });

  it('returns the known HMAC-SHA256 CRC vector from every webhook trigger', async () => {
    let client = createZoomTriggerTestClient('zoom-secret-token');
    let body = JSON.stringify({
      event: 'endpoint.url_validation',
      payload: { plainToken: PLAIN_TOKEN }
    });

    for (let triggerId of TRIGGER_IDS) {
      let result = await handleSlateTriggerWebhook({
        client,
        triggerId,
        url: `https://example.com/callbacks/zoom/${triggerId}`,
        body
      });

      expect(result.inputs).toEqual([]);
      expect(result.response).toMatchObject({
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
      expect(JSON.parse(decodeBody(result.response!))).toEqual({
        plainToken: PLAIN_TOKEN,
        encryptedToken: ENCRYPTED_TOKEN
      });
    }
  });

  it('fails URL validation clearly when the Secret Token is not configured', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createZoomTriggerTestClient(),
      triggerId: 'meeting_events',
      url: 'https://example.com/callbacks/zoom/meeting-events',
      body: JSON.stringify({
        event: 'endpoint.url_validation',
        payload: { plainToken: PLAIN_TOKEN }
      })
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({ status: 500 });
    expect(decodeBody(result.response!)).toBe('Zoom webhook Secret Token is not configured');
  });
});
