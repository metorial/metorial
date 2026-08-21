import { createLocalSlateTransport, createSlatesClient } from '@slates/client';
import { createHmacSignature } from '@slates/provider';
import { getSlateContract, handleScopedSlateTriggerWebhook } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

let VERIFY_TOKEN = 'instagram-verify-token';
let APP_SECRET = 'instagram-app-secret-value';

let createInstagramTriggerTestClient = (
  d: {
    authMethodId?: 'instagram_login' | 'facebook_login';
    verifyToken?: string;
    appSecret?: string;
  } = {}
) => {
  let authMethodId = d.authMethodId ?? 'instagram_login';
  let auth = {
    token: 'instagram-test-token',
    userId: 'ig-user',
    ...(d.appSecret ? { clientSecret: d.appSecret } : {})
  };
  let config = { apiVersion: 'v21.0' };

  return createSlatesClient({
    transport: createLocalSlateTransport({
      slate: provider,
      scopedState: {
        config,
        authenticationMethodId: authMethodId,
        auth,
        secrets: d.verifyToken ? { meta_verify_token: d.verifyToken } : {}
      }
    }),
    state: {
      config,
      auth: { authenticationMethodId: authMethodId, output: auth }
    }
  });
};

let decodeWireBody = (body: { present: boolean; base64?: string } | undefined) =>
  body?.present ? Buffer.from(body.base64 ?? '', 'base64').toString('utf8') : '';

let verificationUrl = (verifyToken: string) =>
  `https://example.com/callbacks/instagram?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge-value`;

describe('Instagram webhook verification contract', () => {
  it('publishes one OAuth app-secret ref covering both OAuth methods', async () => {
    let contract = await getSlateContract(createInstagramTriggerTestClient());
    let trigger = contract.triggers.find(action => action.id === 'webhook_events');

    expect(contract.configSchema).not.toHaveProperty('properties.webhookVerifyToken');
    expect(contract.configSchema).not.toHaveProperty('properties.webhookAppSecret');
    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        registration: { mode: 'manual_bootstrap' },
        ingress: {
          verification: {
            allowedSecretRefs: [
              {
                source: 'generated',
                name: 'meta_verify_token',
                binding: 'receiver_trigger'
              },
              {
                source: 'oauth_credentials',
                name: 'meta_app_secret',
                credentialKey: 'clientSecret',
                authMethods: ['instagram_login', 'facebook_login']
              }
            ]
          }
        }
      }
    });
  });

  it('verifies and captures bootstrap requests with the generated token', async () => {
    let client = createInstagramTriggerTestClient({
      verifyToken: VERIFY_TOKEN,
      appSecret: APP_SECRET
    });
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
    expect(accepted.capture?.status).toBe('accepted');
    if (accepted.capture?.status !== 'accepted') throw new Error('Expected accepted capture');
    expect(decodeWireBody(accepted.capture.response.body)).toBe('challenge-value');
    expect(rejected).toMatchObject({
      verification: { status: 'rejected', code: 'credential_invalid' },
      capture: null,
      delivery: null
    });
  });

  it.each([
    'instagram_login',
    'facebook_login'
  ] as const)('dispatches signed deliveries for the %s OAuth method', async authMethodId => {
    let body = JSON.stringify({
      entry: [
        {
          id: 'ig-user',
          time: 1700000000,
          changes: [
            {
              field: 'comments',
              value: { id: 'comment-1', media: { id: 'media-1' }, text: 'hello' }
            }
          ]
        }
      ]
    });
    let signature = createHmacSignature({ secret: APP_SECRET, payload: body, digest: 'hex' });
    let result = await handleScopedSlateTriggerWebhook({
      client: createInstagramTriggerTestClient({
        authMethodId,
        verifyToken: VERIFY_TOKEN,
        appSecret: APP_SECRET
      }),
      triggerId: 'webhook_events',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/instagram',
      headers: { 'x-hub-signature-256': `sha256=${signature}` },
      body
    });

    expect(result.verification).toMatchObject({ status: 'accepted' });
    expect(result.delivery?.inputs).toEqual([
      {
        eventType: 'comment',
        eventId: 'comment-1',
        commentId: 'comment-1',
        mediaId: 'media-1',
        commentText: 'hello',
        timestamp: '2023-11-14T22:13:20.000Z'
      }
    ]);
    expect(JSON.stringify(result)).not.toContain(APP_SECRET);
    expect(JSON.stringify(result)).not.toContain(VERIFY_TOKEN);
  });

  it('fails closed when the OAuth client secret is absent', async () => {
    await expect(
      handleScopedSlateTriggerWebhook({
        client: createInstagramTriggerTestClient({ verifyToken: VERIFY_TOKEN }),
        triggerId: 'webhook_events',
        ruleId: 'meta.delivery.v1',
        phase: 'delivery',
        url: 'https://example.com/callbacks/instagram',
        body: JSON.stringify({ entry: [] })
      })
    ).rejects.toThrow();
  });
});
