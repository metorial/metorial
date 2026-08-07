import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const TRIGGER_IDS = ['ad_account_changes', 'lead_submitted'] as const;

let createMetaAdsTriggerTestClient = (webhookVerifyToken?: string) =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {
        adAccountId: 'act_123',
        apiVersion: 'v25.0',
        ...(webhookVerifyToken ? { webhookVerifyToken } : {})
      },
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'meta-test-token' }
      }
    }
  });

let decodeBody = (response: { body?: { content: string } | null }) =>
  Buffer.from(response.body?.content ?? '', 'base64').toString();

let verificationUrl = (verifyToken: string) =>
  `https://example.com/callbacks/meta?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge-value`;

describe('Meta Ads webhook verification contract', () => {
  it('advertises GET verification without making POST events synchronous', async () => {
    let contract = await getSlateContract(createMetaAdsTriggerTestClient());

    for (let triggerId of TRIGGER_IDS) {
      let trigger = contract.triggers.find(action => action.id === triggerId);
      expect(trigger?.invocation).toMatchObject({
        type: 'webhook',
        http: {
          methods: ['GET', 'POST'],
          sync: {
            mode: 'match',
            match: [{ method: 'GET', hasQueryParam: 'hub.mode' }]
          }
        }
      });
    }
  });

  it('echoes the challenge when the configured Verify Token matches', async () => {
    let client = createMetaAdsTriggerTestClient('expected-token');

    for (let triggerId of TRIGGER_IDS) {
      let result = await handleSlateTriggerWebhook({
        client,
        triggerId,
        method: 'GET',
        url: verificationUrl('expected-token')
      });

      expect(result.inputs).toEqual([]);
      expect(result.response).toMatchObject({
        status: 200,
        headers: { 'content-type': 'text/plain' }
      });
      expect(decodeBody(result.response!)).toBe('challenge-value');
    }
  });

  it('rejects a mismatched token while preserving legacy unconfigured callbacks', async () => {
    let protectedResult = await handleSlateTriggerWebhook({
      client: createMetaAdsTriggerTestClient('expected-token'),
      triggerId: 'ad_account_changes',
      method: 'GET',
      url: verificationUrl('wrong-token')
    });
    let legacyResult = await handleSlateTriggerWebhook({
      client: createMetaAdsTriggerTestClient(),
      triggerId: 'ad_account_changes',
      method: 'GET',
      url: verificationUrl('legacy-token')
    });

    expect(protectedResult.response).toMatchObject({ status: 403 });
    expect(legacyResult.response).toMatchObject({ status: 200 });
    expect(decodeBody(legacyResult.response!)).toBe('challenge-value');
  });

  it('preserves normal POST event inputs', async () => {
    let client = createMetaAdsTriggerTestClient('expected-token');

    let adAccountResult = await handleSlateTriggerWebhook({
      client,
      triggerId: 'ad_account_changes',
      url: 'https://example.com/callbacks/meta',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        object: 'ad_account',
        entry: [
          {
            id: 'act_123',
            time: 1700000000,
            changes: [{ field: 'campaigns', value: { campaign_id: 'camp-1' } }]
          }
        ]
      })
    });
    let leadResult = await handleSlateTriggerWebhook({
      client,
      triggerId: 'lead_submitted',
      url: 'https://example.com/callbacks/meta',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
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
      })
    });

    expect(adAccountResult.inputs).toEqual([
      {
        entryId: 'act_123',
        changeType: 'campaigns',
        changeValue: { campaign_id: 'camp-1' },
        timestamp: '1700000000'
      }
    ]);
    expect(adAccountResult.response).toBeUndefined();
    expect(leadResult.inputs).toEqual([
      {
        pageId: 'page-1',
        formId: 'form-1',
        leadgenId: 'lead-1',
        createdTime: '1700000000',
        adId: 'ad-1',
        adgroupId: 'adgroup-1'
      }
    ]);
    expect(leadResult.response).toBeUndefined();
  });
});
