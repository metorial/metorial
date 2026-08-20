import { createHmacSignature } from '@slates/provider';
import {
  createLocalSlateTestClient,
  getSlateContract,
  handleScopedSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

let TRIGGER_IDS = ['message_received', 'message_status'] as const;
let VERIFY_TOKEN = 'whatsapp-verify-token';
let APP_SECRET = 'whatsapp-app-secret-value';

let createWhatsAppTriggerTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {
        phoneNumberId: 'phone-number-id',
        wabaId: 'waba-id',
        apiVersion: 'v21.0',
        webhookVerifyToken: VERIFY_TOKEN,
        webhookAppSecret: APP_SECRET
      },
      auth: {
        authenticationMethodId: 'access_token',
        output: { token: 'meta-test-token' }
      }
    }
  });

let decodeWireBody = (body: { present: boolean; base64?: string } | undefined) =>
  body?.present ? Buffer.from(body.base64 ?? '', 'base64').toString('utf8') : '';

let verificationUrl = (verifyToken: string) =>
  `https://example.com/callbacks/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge-value`;

let signedHeaders = (body: string) => ({
  'content-type': 'application/json',
  'x-hub-signature-256': `sha256=${createHmacSignature({
    secret: APP_SECRET,
    payload: body,
    digest: 'hex'
  })}`
});

describe('WhatsApp webhook verification contract', () => {
  it('publishes scoped provider-verification rules for both triggers', async () => {
    let contract = await getSlateContract(createWhatsAppTriggerTestClient());
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
    let client = createWhatsAppTriggerTestClient();
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
      triggerId: 'message_received',
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
    let client = createWhatsAppTriggerTestClient();
    let body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    let unsigned = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'message_received',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/whatsapp',
      body
    });
    let signature = signedHeaders(body)['x-hub-signature-256'];
    let duplicate = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'message_received',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/whatsapp',
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

  it('dispatches signed message and status events without exposing the app secret', async () => {
    let client = createWhatsAppTriggerTestClient();
    let message = {
      id: 'wamid.test-1',
      type: 'text',
      from: '15551234567',
      timestamp: '1700000000',
      text: { body: 'hello' }
    };
    let messageBody = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-id',
          changes: [
            {
              field: 'messages',
              value: {
                metadata: {
                  phone_number_id: 'phone-number-id',
                  display_phone_number: '15550001111'
                },
                contacts: [{ wa_id: '15551234567', profile: { name: 'Test Sender' } }],
                messages: [message]
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
          id: 'waba-id',
          changes: [
            {
              field: 'messages',
              value: {
                metadata: {
                  phone_number_id: 'phone-number-id',
                  display_phone_number: '15550001111'
                },
                statuses: [
                  {
                    id: 'wamid.test-1',
                    status: 'delivered',
                    timestamp: '1700000001',
                    recipient_id: '15551234567'
                  }
                ]
              }
            }
          ]
        }
      ]
    });
    let messageResult = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'message_received',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/whatsapp',
      headers: signedHeaders(messageBody),
      body: messageBody
    });
    let statusResult = await handleScopedSlateTriggerWebhook({
      client,
      triggerId: 'message_status',
      ruleId: 'meta.delivery.v1',
      phase: 'delivery',
      url: 'https://example.com/callbacks/whatsapp',
      headers: signedHeaders(statusBody),
      body: statusBody
    });

    expect(messageResult.delivery?.inputs).toEqual([
      {
        messageId: 'wamid.test-1',
        messageType: 'text',
        from: '15551234567',
        senderName: 'Test Sender',
        timestamp: '1700000000',
        phoneNumberId: 'phone-number-id',
        displayPhoneNumber: '15550001111',
        message
      }
    ]);
    expect(statusResult.delivery?.inputs).toEqual([
      {
        statusId: 'wamid.test-1_delivered_1700000001',
        messageId: 'wamid.test-1',
        status: 'delivered',
        timestamp: '1700000001',
        recipientId: '15551234567',
        phoneNumberId: 'phone-number-id',
        displayPhoneNumber: '15550001111'
      }
    ]);
    expect(JSON.stringify([messageResult, statusResult])).not.toContain(APP_SECRET);
  });
});
