import { createLocalSlateTransport, createSlatesClient } from '@slates/client';
import { createHmacSignature } from '@slates/provider';
import { getSlateContract, handleScopedSlateTriggerWebhook } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

let TRIGGER_IDS = ['message_received', 'message_status'] as const;
let VERIFY_TOKEN = 'whatsapp-verify-token';
let APP_SECRET = 'whatsapp-app-secret-value';

let createWhatsAppTriggerTestClient = (
  d: { verifyToken?: string; appSecret?: string } = {}
) => {
  let auth = {
    token: 'whatsapp-test-token',
    ...(d.appSecret ? { webhookAppSecret: d.appSecret } : {})
  };
  let config = {
    phoneNumberId: 'phone-number-id',
    wabaId: 'waba-id',
    apiVersion: 'v21.0'
  };

  return createSlatesClient({
    transport: createLocalSlateTransport({
      slate: provider,
      scopedState: {
        config,
        authenticationMethodId: 'access_token',
        auth,
        secrets: d.verifyToken ? { meta_verify_token: d.verifyToken } : {}
      }
    }),
    state: {
      config,
      auth: { authenticationMethodId: 'access_token', output: auth }
    }
  });
};

let verificationUrl = (verifyToken: string) =>
  `https://example.com/callbacks/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge-value`;

describe('WhatsApp webhook verification contract', () => {
  it('publishes generated bootstrap and access-token auth-config delivery credentials', async () => {
    let contract = await getSlateContract(createWhatsAppTriggerTestClient());

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
                  source: 'auth_config',
                  name: 'meta_app_secret',
                  credentialKey: 'webhookAppSecret',
                  authMethods: ['access_token']
                }
              ]
            }
          }
        }
      });
    }
  });

  it('requires and persists the app secret with the WhatsApp access token', async () => {
    let client = createWhatsAppTriggerTestClient();
    let contract = await getSlateContract(client);
    let method = contract.authMethods.find(candidate => candidate.id === 'access_token');

    expect(method?.inputSchema).toMatchObject({
      required: expect.arrayContaining(['token', 'webhookAppSecret'])
    });
    await expect(
      client.getAuthOutput({
        authenticationMethodId: 'access_token',
        input: { token: 'access-token', webhookAppSecret: APP_SECRET }
      })
    ).resolves.toMatchObject({
      output: { token: 'access-token', webhookAppSecret: APP_SECRET }
    });
    await expect(
      client.getAuthOutput({
        authenticationMethodId: 'access_token',
        input: { token: 'access-token' }
      })
    ).rejects.toThrow();
  });

  it('verifies generated bootstrap tokens for both triggers', async () => {
    let client = createWhatsAppTriggerTestClient({
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

  it('dispatches signed message and status deliveries through the selected access-token auth method', async () => {
    let client = createWhatsAppTriggerTestClient({
      verifyToken: VERIFY_TOKEN,
      appSecret: APP_SECRET
    });
    let messageBody = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'phone-1', display_phone_number: '+15551234567' },
                contacts: [{ wa_id: '15550000000', profile: { name: 'Ada' } }],
                messages: [
                  {
                    id: 'message-1',
                    type: 'text',
                    from: '15550000000',
                    timestamp: '1700000000',
                    text: { body: 'hello' }
                  }
                ]
              }
            }
          ]
        }
      ]
    });
    let statusBody = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'phone-1' },
                statuses: [
                  {
                    id: 'message-1',
                    status: 'delivered',
                    timestamp: '1700000001',
                    recipient_id: '15550000000'
                  }
                ]
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
        url: 'https://example.com/callbacks/whatsapp',
        headers: {
          'x-hub-signature-256': `sha256=${createHmacSignature({
            secret: APP_SECRET,
            payload: body,
            digest: 'hex'
          })}`
        },
        body
      });

    let messageResult = await invoke('message_received', messageBody);
    let statusResult = await invoke('message_status', statusBody);

    expect(messageResult.delivery?.inputs).toEqual([
      {
        messageId: 'message-1',
        messageType: 'text',
        from: '15550000000',
        senderName: 'Ada',
        timestamp: '1700000000',
        phoneNumberId: 'phone-1',
        displayPhoneNumber: '+15551234567',
        message: {
          id: 'message-1',
          type: 'text',
          from: '15550000000',
          timestamp: '1700000000',
          text: { body: 'hello' }
        }
      }
    ]);
    expect(statusResult.delivery?.inputs).toEqual([
      {
        statusId: 'message-1_delivered_1700000001',
        messageId: 'message-1',
        status: 'delivered',
        timestamp: '1700000001',
        recipientId: '15550000000',
        phoneNumberId: 'phone-1'
      }
    ]);
    expect(JSON.stringify([messageResult, statusResult])).not.toContain(APP_SECRET);
  });

  it('fails closed when the auth-config app secret is absent', async () => {
    await expect(
      handleScopedSlateTriggerWebhook({
        client: createWhatsAppTriggerTestClient({ verifyToken: VERIFY_TOKEN }),
        triggerId: 'message_received',
        ruleId: 'meta.delivery.v1',
        phase: 'delivery',
        url: 'https://example.com/callbacks/whatsapp',
        body: JSON.stringify({ object: 'whatsapp_business_account', entry: [] })
      })
    ).rejects.toThrow();
  });
});
