import { createHmacSignature } from 'slates';
import {
  createLocalSlateTestClient,
  getSlateContract,
  handleScopedSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

let TRIGGER_IDS = ['ad_account_changes', 'lead_submitted'] as const;
let VERIFY_TOKEN = 'meta-ads-verify-token';
let APP_SECRET = 'meta-ads-app-secret-value';

let createMetaAdsTriggerTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {
        adAccountId: 'act_123',
        apiVersion: 'v25.0',
        webhookVerifyToken: VERIFY_TOKEN,
        webhookAppSecret: APP_SECRET
      },
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'meta-test-token' }
      }
    }
  });

let decodeWireBody = (body: { present: boolean; base64?: string } | undefined) =>
  body?.present ? Buffer.from(body.base64 ?? '', 'base64').toString('utf8') : '';

let verificationUrl = (verifyToken: string) =>
  `https://example.com/callbacks/meta?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge-value`;

let signedHeaders = (body: string) => ({
  'content-type': 'application/json',
  'x-hub-signature-256': `sha256=${createHmacSignature({
    secret: APP_SECRET,
    payload: body,
    digest: 'hex'
  })}`
});

describe('Meta Ads webhook verification contract', () => {
  it('publishes scoped provider-verification rules for every webhook trigger', async () => {
    let contract = await getSlateContract(createMetaAdsTriggerTestClient());

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
              rules: [
                { id: 'meta.bootstrap.v1', phase: 'bootstrap' },
                { id: 'meta.delivery.v1', phase: 'delivery' }
              ]
            }
          }
        }
      });
    }
  });

  it('captures verified challenges and rejects mismatched tokens before capture', async () => {
    let client = createMetaAdsTriggerTestClient();
    for (let triggerId of TRIGGER_IDS) {
      let accepted = await handleScopedSlateTriggerWebhook({
        client,
        triggerId,
        ruleId: 'meta.bootstrap.v1',
        phase: 'bootstrap',
        method: 'GET',
        url: verificationUrl(VERIFY_TOKEN)
      });
      expect(accepted.verification.status).toBe('accepted');
      if (accepted.capture?.status !== 'accepted') {
        throw new Error('Expected an accepted bootstrap capture');
      }
      expect(decodeWireBody(accepted.capture.response.body)).toBe('challenge-value');
    }
    let rejected = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'ad_account_changes',
      ruleId: 'meta.bootstrap.v1',
      phase: 'bootstrap',
      method: 'GET',
      url: verificationUrl('wrong-token')
    });
    expect(rejected).toMatchObject({
      verification: { status: 'rejected', code: 'credential_invalid' },
      capture: null,
      delivery: null
    });
  });

  it('rejects unsigned and duplicate-signature deliveries without dispatching', async () => {
    let client = createMetaAdsTriggerTestClient();
    let body = JSON.stringify({ object: 'ad_account', entry: [] });
    let unsigned = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'ad_account_changes',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/meta',
      body
    });
    let signature = signedHeaders(body)['x-hub-signature-256'];
    let duplicate = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'ad_account_changes',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/meta',
      headers: [
        ['x-hub-signature-256', signature],
        ['x-hub-signature-256', signature]
      ],
      body
    });
    expect(unsigned.delivery).toBeNull();
    expect(duplicate.delivery).toBeNull();
    expect(JSON.stringify([unsigned, duplicate])).not.toContain(APP_SECRET);
  });

  it('dispatches signed events for both triggers without exposing the app secret', async () => {
    let client = createMetaAdsTriggerTestClient();
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
                created_time: 1700000000,
                ad_id: 'ad-1',
                adgroup_id: 'adgroup-1'
              }
            }
          ]
        }
      ]
    });
    let adAccountResult = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'ad_account_changes',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/meta',
      headers: signedHeaders(adAccountBody),
      body: adAccountBody
    });
    let leadResult = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'lead_submitted',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/meta',
      headers: signedHeaders(leadBody),
      body: leadBody
    });

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
        createdTime: '1700000000',
        adId: 'ad-1',
        adgroupId: 'adgroup-1'
      }
    ]);
    expect(JSON.stringify([adAccountResult, leadResult])).not.toContain(APP_SECRET);
  });
});
