import { createLocalSlateTransport, createSlatesClient } from '@slates/client';
import { createHmacSignature } from '@slates/provider';
import { getSlateContract, handleScopedSlateTriggerWebhook } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

let VERIFY_TOKEN = 'facebook-verify-token';
let APP_SECRET = 'facebook-app-secret-value';

let createFacebookTriggerTestClient = (
  d: { verifyToken?: string; appSecret?: string } = {}
) => {
  let auth = {
    token: 'facebook-test-token',
    ...(d.appSecret ? { clientSecret: d.appSecret } : {})
  };
  let config = { apiVersion: 'v25.0' };

  return createSlatesClient({
    transport: createLocalSlateTransport({
      slate: provider,
      scopedState: {
        config,
        authenticationMethodId: 'oauth',
        auth,
        secrets: d.verifyToken ? { meta_verify_token: d.verifyToken } : {}
      }
    }),
    state: {
      config,
      auth: { authenticationMethodId: 'oauth', output: auth }
    }
  });
};

let decodeWireBody = (body: { present: boolean; base64?: string } | undefined) =>
  body?.present ? Buffer.from(body.base64 ?? '', 'base64').toString('utf8') : '';

let verificationUrl = (verifyToken: string) =>
  `https://example.com/callbacks/facebook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge-value`;

describe('Facebook webhook verification contract', () => {
  it('publishes generated bootstrap and OAuth delivery credentials only', async () => {
    let contract = await getSlateContract(createFacebookTriggerTestClient());
    let trigger = contract.triggers.find(action => action.id === 'page_webhook');

    expect(contract.configSchema).not.toHaveProperty('properties.webhookVerifyToken');
    expect(contract.configSchema).not.toHaveProperty('properties.webhookAppSecret');
    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        registration: { mode: 'manual_bootstrap' },
        ingress: {
          kind: 'receiver_route',
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
                authMethods: ['oauth']
              }
            ]
          }
        }
      }
    });
  });

  it('echoes a challenge only for the callback-owned verify token', async () => {
    let client = createFacebookTriggerTestClient({
      verifyToken: VERIFY_TOKEN,
      appSecret: APP_SECRET
    });
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

    expect(accepted.verification).toEqual({
      status: 'accepted',
      selection: { scope: 'receiver_trigger' }
    });
    expect(accepted.capture?.status).toBe('accepted');
    if (accepted.capture?.status !== 'accepted') throw new Error('Expected accepted capture');
    expect(decodeWireBody(accepted.capture.response.body)).toBe('challenge-value');
    expect(rejected).toMatchObject({
      verification: { status: 'rejected', code: 'credential_invalid' },
      capture: null,
      delivery: null
    });
  });

  it('fails closed when the generated verify token or OAuth client secret is absent', async () => {
    await expect(
      handleScopedSlateTriggerWebhook({
        client: createFacebookTriggerTestClient({ appSecret: APP_SECRET }),
        triggerId: 'page_webhook',
        ruleId: 'meta.bootstrap.v1',
        phase: 'bootstrap',
        method: 'GET',
        url: verificationUrl(VERIFY_TOKEN)
      })
    ).rejects.toThrow();

    await expect(
      handleScopedSlateTriggerWebhook({
        client: createFacebookTriggerTestClient({ verifyToken: VERIFY_TOKEN }),
        triggerId: 'page_webhook',
        ruleId: 'meta.delivery.v1',
        phase: 'delivery',
        url: 'https://example.com/callbacks/facebook',
        body: JSON.stringify({ object: 'page', entry: [] })
      })
    ).rejects.toThrow();
  });

  it('dispatches a correctly signed Facebook event without leaking secrets', async () => {
    let entry = {
      id: 'page-id',
      time: 1700000000,
      changes: [{ field: 'feed', value: { post_id: 'post-1', from: { id: 'user-1' } } }]
    };
    let body = JSON.stringify({ object: 'page', entry: [entry] });
    let signature = createHmacSignature({ secret: APP_SECRET, payload: body, digest: 'hex' });
    let result = await handleScopedSlateTriggerWebhook({
      client: createFacebookTriggerTestClient({
        verifyToken: VERIFY_TOKEN,
        appSecret: APP_SECRET
      }),
      triggerId: 'page_webhook',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/facebook',
      headers: { 'x-hub-signature-256': `sha256=${signature}` },
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
    expect(JSON.stringify(result)).not.toContain(VERIFY_TOKEN);
  });
});
