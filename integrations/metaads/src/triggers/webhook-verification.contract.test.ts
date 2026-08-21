import { createLocalSlateTransport, createSlatesClient } from '@slates/client';
import { createHmacSignature } from '@slates/provider';
import { getSlateContract, handleScopedSlateTriggerWebhook } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

let TRIGGER_IDS = ['ad_account_changes', 'lead_submitted'] as const;
let VERIFY_TOKEN = 'meta-ads-verify-token';
let APP_SECRET = 'meta-ads-app-secret-value';
type MetaAdsAuthMethod = 'oauth' | 'system_user_token';

let createMetaAdsTriggerTestClient = (
  d: { verifyToken?: string; appSecret?: string; authMethodId?: MetaAdsAuthMethod } = {}
) => {
  let authMethodId = d.authMethodId ?? 'oauth';
  let auth = {
    token: 'meta-ads-test-token',
    ...(d.appSecret
      ? authMethodId === 'oauth'
        ? { clientSecret: d.appSecret }
        : { webhookAppSecret: d.appSecret }
      : {})
  };
  let config = { adAccountId: 'act_123', apiVersion: 'v25.0' };

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

let verificationUrl = (verifyToken: string) =>
  `https://example.com/callbacks/meta?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge-value`;

describe('Meta Ads webhook verification contract', () => {
  it('publishes disjoint OAuth and system-user app-secret refs on every trigger', async () => {
    let contract = await getSlateContract(createMetaAdsTriggerTestClient());

    expect(contract.configSchema).not.toHaveProperty('properties.webhookVerifyToken');
    expect(contract.configSchema).not.toHaveProperty('properties.webhookAppSecret');
    for (let triggerId of TRIGGER_IDS) {
      let trigger = contract.triggers.find(action => action.id === triggerId);
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
                  authMethods: ['oauth']
                },
                {
                  source: 'auth_config',
                  name: 'meta_app_secret',
                  credentialKey: 'webhookAppSecret',
                  authMethods: ['system_user_token']
                }
              ]
            }
          }
        }
      });
    }
  });

  it('requires and persists the system-user webhook app secret in auth config', async () => {
    let client = createMetaAdsTriggerTestClient();
    let contract = await getSlateContract(client);
    let method = contract.authMethods.find(candidate => candidate.id === 'system_user_token');

    expect(method?.inputSchema).toMatchObject({
      required: expect.arrayContaining(['apiToken', 'webhookAppSecret'])
    });
    await expect(
      client.getAuthOutput({
        authenticationMethodId: 'system_user_token',
        input: { apiToken: 'system-token', webhookAppSecret: APP_SECRET }
      })
    ).resolves.toMatchObject({
      output: { token: 'system-token', webhookAppSecret: APP_SECRET }
    });
    await expect(
      client.getAuthOutput({
        authenticationMethodId: 'system_user_token',
        input: { apiToken: 'system-token' }
      })
    ).rejects.toThrow();
  });

  it('verifies generated bootstrap tokens for each trigger', async () => {
    let client = createMetaAdsTriggerTestClient({
      verifyToken: VERIFY_TOKEN,
      appSecret: APP_SECRET
    });

    for (let triggerId of TRIGGER_IDS) {
      let accepted = await handleScopedSlateTriggerWebhook({
        client,
        triggerId,
        ruleId: 'meta.bootstrap.v1',
        phase: 'bootstrap',
        method: 'GET',
        url: verificationUrl(VERIFY_TOKEN)
      });
      let rejected = await handleScopedSlateTriggerWebhook({
        client,
        triggerId,
        ruleId: 'meta.bootstrap.v1',
        phase: 'bootstrap',
        method: 'GET',
        url: verificationUrl('wrong-token')
      });

      expect(accepted.verification).toMatchObject({ status: 'accepted' });
      expect(accepted.capture?.status).toBe('accepted');
      expect(rejected).toMatchObject({
        verification: { status: 'rejected', code: 'credential_invalid' },
        capture: null,
        delivery: null
      });
    }
  });

  it.each([
    'oauth',
    'system_user_token'
  ] as const)('dispatches signed deliveries through the selected %s auth method', async authMethodId => {
    let client = createMetaAdsTriggerTestClient({
      verifyToken: VERIFY_TOKEN,
      appSecret: APP_SECRET,
      authMethodId
    });
    let adAccountBody = JSON.stringify({
      object: 'ad_account',
      entry: [
        {
          id: 'act_123',
          time: 1700000000,
          changes: [{ field: 'campaigns', value: { campaign_id: 'camp-1' } }]
        }
      ]
    });
    let leadBody = JSON.stringify({
      object: 'page',
      entry: [
        {
          id: 'page-1',
          changes: [
            {
              field: 'leadgen',
              value: {
                page_id: 'page-1',
                form_id: 'form-1',
                leadgen_id: 'lead-1',
                created_time: 1700000000
              }
            }
          ]
        }
      ]
    });
    let invoke = (triggerId: (typeof TRIGGER_IDS)[number], body: string) =>
      handleScopedSlateTriggerWebhook({
        client,
        triggerId,
        ruleId: 'meta.delivery.v1',
        phase: 'delivery',
        url: 'https://example.com/callbacks/meta',
        headers: {
          'x-hub-signature-256': `sha256=${createHmacSignature({
            secret: APP_SECRET,
            payload: body,
            digest: 'hex'
          })}`
        },
        body
      });

    let adAccountResult = await invoke('ad_account_changes', adAccountBody);
    let leadResult = await invoke('lead_submitted', leadBody);

    expect(adAccountResult.delivery?.inputs).toEqual([
      {
        entryId: 'act_123',
        changeType: 'campaigns',
        changeValue: { campaign_id: 'camp-1' },
        timestamp: '1700000000'
      }
    ]);
    expect(leadResult.delivery?.inputs).toEqual([
      {
        pageId: 'page-1',
        formId: 'form-1',
        leadgenId: 'lead-1',
        createdTime: '1700000000'
      }
    ]);
    expect(JSON.stringify([adAccountResult, leadResult])).not.toContain(APP_SECRET);
  });

  it('fails closed when the OAuth client secret is absent', async () => {
    await expect(
      handleScopedSlateTriggerWebhook({
        client: createMetaAdsTriggerTestClient({ verifyToken: VERIFY_TOKEN }),
        triggerId: 'ad_account_changes',
        ruleId: 'meta.delivery.v1',
        phase: 'delivery',
        url: 'https://example.com/callbacks/meta',
        body: JSON.stringify({ object: 'ad_account', entry: [] })
      })
    ).rejects.toThrow();
  });
});
