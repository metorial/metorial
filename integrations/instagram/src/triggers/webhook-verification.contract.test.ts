import { createHmacSignature } from '@slates/provider';
import {
  createLocalSlateTestClient,
  getSlateContract,
  handleScopedSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

let VERIFY_TOKEN = 'instagram-verify-token';
let APP_SECRET = 'instagram-app-secret-value';

let createInstagramTriggerTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {
        apiVersion: 'v21.0',
        webhookVerifyToken: VERIFY_TOKEN,
        webhookAppSecret: APP_SECRET
      },
      auth: {
        authenticationMethodId: 'instagram_login',
        output: { token: 'instagram-test-token' }
      }
    }
  });

let decodeWireBody = (body: { present: boolean; base64?: string } | undefined) =>
  body?.present ? Buffer.from(body.base64 ?? '', 'base64').toString('utf8') : '';

let verificationUrl = (verifyToken: string) =>
  `https://example.com/callbacks/instagram?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge-value`;

describe('Instagram webhook verification contract', () => {
  it('publishes the scoped provider-verification bootstrap and delivery rules', async () => {
    let contract = await getSlateContract(createInstagramTriggerTestClient());
    let trigger = contract.triggers.find(action => action.id === 'webhook_events');

    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        registration: { mode: 'manual_bootstrap' },
        ingress: {
          kind: 'receiver_route',
          verification: {
            mechanism: 'provider',
            rules: [
              { id: 'meta.bootstrap.v1', phase: 'bootstrap' },
              { id: 'meta.delivery.v1', phase: 'delivery' }
            ]
          }
        }
      }
    });
  });

  it('captures a verified challenge and rejects a mismatched token before capture', async () => {
    let client = createInstagramTriggerTestClient();
    let accepted = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'webhook_events',
      ruleId: 'meta.bootstrap.v1',
      phase: 'bootstrap',
      method: 'GET',
      url: verificationUrl(VERIFY_TOKEN)
    });
    let rejected = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'webhook_events',
      ruleId: 'meta.bootstrap.v1',
      phase: 'bootstrap',
      method: 'GET',
      url: verificationUrl('wrong-token')
    });

    expect(accepted.verification).toMatchObject({ status: 'accepted' });
    if (accepted.capture?.status !== 'accepted') {
      throw new Error('Expected an accepted bootstrap capture');
    }
    expect(decodeWireBody(accepted.capture.response.body)).toBe('challenge-value');
    expect(rejected).toMatchObject({
      verification: { status: 'rejected', code: 'credential_invalid' },
      capture: null,
      delivery: null
    });
  });

  it('rejects unsigned and duplicate-signature deliveries without dispatching', async () => {
    let client = createInstagramTriggerTestClient();
    let body = JSON.stringify({ object: 'instagram', entry: [] });
    let unsigned = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'webhook_events',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/instagram',
      body
    });
    let signature = createHmacSignature({ secret: APP_SECRET, payload: body, digest: 'hex' });
    let duplicate = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'webhook_events',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/instagram',
      headers: [
        ['x-hub-signature-256', `sha256=${signature}`],
        ['x-hub-signature-256', `sha256=${signature}`]
      ],
      body
    });

    expect(unsigned.delivery).toBeNull();
    expect(duplicate.delivery).toBeNull();
    expect(unsigned.verification.status).toBe('rejected');
    expect(duplicate.verification.status).toBe('rejected');
    expect(JSON.stringify([unsigned, duplicate])).not.toContain(APP_SECRET);
  });

  it('dispatches a correctly signed POST through scoped mapping without leaking secrets', async () => {
    let body = JSON.stringify({
      object: 'instagram',
      entry: [
        {
          id: 'ig-user-1',
          time: 1700000000,
          changes: [
            {
              field: 'comments',
              value: { id: 'comment-1', media: { id: 'media-1' }, text: 'Nice reel!' }
            }
          ]
        }
      ]
    });
    let signature = createHmacSignature({ secret: APP_SECRET, payload: body, digest: 'hex' });
    let result = await handleScopedSlateTriggerWebhook({
      client: createInstagramTriggerTestClient(),
      triggerId: 'webhook_events',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/instagram',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': `sha256=${signature}`
      },
      body
    });

    expect(result.verification).toMatchObject({ status: 'accepted' });
    expect(result.delivery?.inputs).toEqual([
      {
        eventType: 'comment',
        eventId: 'comment-1',
        commentId: 'comment-1',
        mediaId: 'media-1',
        commentText: 'Nice reel!',
        timestamp: new Date(1700000000 * 1000).toISOString()
      }
    ]);
    expect(JSON.stringify(result)).not.toContain(APP_SECRET);
  });
});
