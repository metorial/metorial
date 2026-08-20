import { createHmacSignature } from '@slates/provider';
import {
  createLocalSlateTestClient,
  getSlateContract,
  handleScopedSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

let VERIFY_TOKEN = 'facebook-verify-token';
let APP_SECRET = 'facebook-app-secret-value';

let createFacebookTriggerTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {
        apiVersion: 'v25.0',
        webhookVerifyToken: VERIFY_TOKEN,
        webhookAppSecret: APP_SECRET
      },
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'facebook-test-token' }
      }
    }
  });

let decodeWireBody = (body: { present: boolean; base64?: string } | undefined) =>
  body?.present ? Buffer.from(body.base64 ?? '', 'base64').toString('utf8') : '';

let verificationUrl = (verifyToken: string) =>
  `https://example.com/callbacks/facebook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge-value`;

describe('Facebook webhook verification contract', () => {
  it('publishes the scoped provider-verification bootstrap and delivery rules', async () => {
    let contract = await getSlateContract(createFacebookTriggerTestClient());
    let trigger = contract.triggers.find(action => action.id === 'page_webhook');

    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        registration: { mode: 'manual_bootstrap' },
        ingress: {
          kind: 'receiver_route',
          baseline: 'receiver_path_secret',
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
    let client = createFacebookTriggerTestClient();
    let accepted = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'page_webhook',
      ruleId: 'meta.bootstrap.v1',
      phase: 'bootstrap',
      method: 'GET',
      url: verificationUrl(VERIFY_TOKEN)
    });
    let rejected = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'page_webhook',
      ruleId: 'meta.bootstrap.v1',
      phase: 'bootstrap',
      method: 'GET',
      url: verificationUrl('wrong-token')
    });

    expect(accepted.verification).toMatchObject({ status: 'accepted' });
    expect(accepted.capture).toMatchObject({
      status: 'accepted',
      response: { status: 200, headers: [['content-type', 'text/plain']] }
    });
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
    let client = createFacebookTriggerTestClient();
    let body = JSON.stringify({ object: 'page', entry: [] });
    let unsigned = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'page_webhook',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/facebook',
      body
    });
    let signature = createHmacSignature({ secret: APP_SECRET, payload: body, digest: 'hex' });
    let duplicate = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'page_webhook',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/facebook',
      headers: [
        ['x-hub-signature-256', `sha256=${signature}`],
        ['X-Hub-Signature-256', `sha256=${signature}`]
      ],
      body
    });

    expect(unsigned).toMatchObject({ verification: { status: 'rejected' }, delivery: null });
    expect(duplicate).toMatchObject({ verification: { status: 'rejected' }, delivery: null });
    expect(JSON.stringify([unsigned, duplicate])).not.toContain(APP_SECRET);
  });

  it('dispatches a correctly signed POST through scoped mapping without leaking secrets', async () => {
    let entry = {
      id: 'page-id',
      time: 1700000000,
      changes: [{ field: 'feed', value: { post_id: 'post-1', from: { id: 'user-1' } } }]
    };
    let body = JSON.stringify({ object: 'page', entry: [entry] });
    let signature = createHmacSignature({ secret: APP_SECRET, payload: body, digest: 'hex' });
    let result = await handleScopedSlateTriggerWebhook({
      client: createFacebookTriggerTestClient(),
      triggerId: 'page_webhook',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/facebook',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': `sha256=${signature}`
      },
      body
    });

    expect(result.verification).toMatchObject({ status: 'accepted' });
    expect(result.delivery?.inputs).toEqual([
      {
        eventType: 'feed',
        eventId: 'page-id_feed_1700000000_post-1',
        pageId: 'page-id',
        changeField: 'feed',
        changeValue: { post_id: 'post-1', from: { id: 'user-1' } },
        senderId: 'user-1',
        timestamp: 1700000000,
        rawEntry: entry
      }
    ]);
    expect(JSON.stringify(result)).not.toContain(APP_SECRET);
  });
});
