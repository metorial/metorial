import { createHmacSignature } from '@slates/provider';
import {
  createLocalSlateTestClient,
  getSlateContract,
  handleScopedSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

let TRIGGER_IDS = [
  'meeting_events',
  'webinar_events',
  'recording_events',
  'user_events',
  'chat_message_events'
] as const;
let PLAIN_TOKEN = 'qgg8vlvZRS6UYooatFL8Aw';
let ENCRYPTED_TOKEN = 'd9e0d764a78494688ba3f2d5c0ed4ca311394b4834d959759213424d2df961e3';
let SECRET_TOKEN = 'zoom-secret-token';

let createZoomTriggerTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'zoom-test-token', secretToken: SECRET_TOKEN }
      }
    }
  });

let decodeWireBody = (body: { present: boolean; base64?: string } | undefined) =>
  body?.present ? Buffer.from(body.base64 ?? '', 'base64').toString('utf8') : '';

let zoomSignedHeaders = (timestamp: string, body: string) => ({
  'content-type': 'application/json',
  'x-zm-request-timestamp': timestamp,
  'x-zm-signature': createHmacSignature({
    secret: SECRET_TOKEN,
    payload: `v0:${timestamp}:${body}`,
    digest: 'hex',
    prefix: 'v0='
  })
});

describe('Zoom webhook URL validation contract', () => {
  it('publishes scoped provider-verification rules on every webhook trigger', async () => {
    let contract = await getSlateContract(createZoomTriggerTestClient());
    expect(JSON.stringify(contract.configSchema)).not.toContain('secretToken');

    for (let triggerId of TRIGGER_IDS) {
      let trigger = contract.triggers.find(action => action.id === triggerId);
      expect(trigger?.invocation).toMatchObject({
        type: 'webhook',
        http: {
          registration: { mode: 'manual_bootstrap' },
          ingress: {
            kind: 'receiver_route',
            verification: {
              mechanism: 'provider',
              allowedSecretRefs: [
                {
                  source: 'auth_config',
                  name: 'zoom_secret_token',
                  credentialKey: 'secretToken'
                }
              ],
              rules: [
                { id: 'zoom.bootstrap.v1', phase: 'bootstrap' },
                { id: 'zoom.delivery.v1', phase: 'delivery' }
              ]
            }
          }
        }
      });
    }
  });

  it('returns the known HMAC-SHA256 bootstrap vector from every trigger', async () => {
    let client = createZoomTriggerTestClient();
    let body = JSON.stringify({
      event: 'endpoint.url_validation',
      payload: { plainToken: PLAIN_TOKEN }
    });

    for (let triggerId of TRIGGER_IDS) {
      let result = await handleScopedSlateTriggerWebhook({
        client,
        triggerId,
        ruleId: 'zoom.bootstrap.v1',
        phase: 'bootstrap',
        url: `https://example.com/callbacks/zoom/${triggerId}`,
        body
      });
      expect(result.verification.status).toBe('accepted');
      expect(result.capture).toMatchObject({ status: 'accepted', response: { status: 200 } });
      if (result.capture?.status !== 'accepted') {
        throw new Error('Expected an accepted bootstrap capture');
      }
      expect(JSON.parse(decodeWireBody(result.capture.response.body))).toEqual({
        plainToken: PLAIN_TOKEN,
        encryptedToken: ENCRYPTED_TOKEN
      });
      expect(JSON.stringify(result)).not.toContain(SECRET_TOKEN);
    }
  });

  it('rejects unsigned and duplicate signed deliveries without dispatching', async () => {
    let client = createZoomTriggerTestClient();
    let timestamp = '1700000000';
    let body = JSON.stringify({
      event: 'meeting.started',
      event_ts: 1700000000000,
      payload: {}
    });
    let unsigned = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'meeting_events',
      ruleId: 'zoom.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/zoom/meeting-events',
      body
    });
    let headers = zoomSignedHeaders(timestamp, body);
    let duplicate = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'meeting_events',
      ruleId: 'zoom.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/zoom/meeting-events',
      headers: [
        ['x-zm-request-timestamp', timestamp],
        ['x-zm-signature', headers['x-zm-signature']],
        ['x-zm-signature', headers['x-zm-signature']]
      ],
      body
    });
    expect(unsigned.delivery).toBeNull();
    expect(duplicate.delivery).toBeNull();
    expect(unsigned.verification.status).toBe('rejected');
    expect(duplicate.verification.status).toBe('rejected');
    expect(JSON.stringify([unsigned, duplicate])).not.toContain(SECRET_TOKEN);
  });

  it('dispatches a correctly signed delivery through scoped mapping', async () => {
    let timestamp = '1700000000';
    let meeting = { id: 123, uuid: 'meeting-uuid', topic: 'Scoped callbacks' };
    let body = JSON.stringify({
      event: 'meeting.started',
      event_ts: 1700000000000,
      payload: { account_id: 'account-1', object: meeting }
    });
    let result = await handleScopedSlateTriggerWebhook({
      client: createZoomTriggerTestClient(),
      triggerId: 'meeting_events',
      ruleId: 'zoom.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/zoom/meeting-events',
      headers: zoomSignedHeaders(timestamp, body),
      body
    });

    expect(result.verification).toMatchObject({
      status: 'accepted',
      authenticatedFields: { timestamp }
    });
    expect(result.delivery?.inputs).toEqual([
      {
        eventType: 'meeting.started',
        eventTimestamp: 1700000000000,
        accountId: 'account-1',
        meeting
      }
    ]);
    expect(JSON.stringify(result)).not.toContain(SECRET_TOKEN);
  });
});
