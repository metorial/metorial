import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const TRIGGER_IDS = ['message_received', 'message_status'] as const;

let createWhatsAppTriggerTestClient = (webhookVerifyToken?: string) =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {
        phoneNumberId: 'phone-number-id',
        wabaId: 'waba-id',
        apiVersion: 'v21.0',
        ...(webhookVerifyToken ? { webhookVerifyToken } : {})
      },
      auth: {
        authenticationMethodId: 'access_token',
        output: { token: 'meta-test-token' }
      }
    }
  });

let decodeBody = (response: { body?: { content: string } | null }) =>
  Buffer.from(response.body?.content ?? '', 'base64').toString();

let verificationUrl = (verifyToken: string) =>
  `https://example.com/callbacks/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge-value`;

describe('WhatsApp webhook verification contract', () => {
  it('advertises GET verification without making POST events synchronous', async () => {
    let contract = await getSlateContract(createWhatsAppTriggerTestClient());

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
    let client = createWhatsAppTriggerTestClient('expected-token');

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
      client: createWhatsAppTriggerTestClient('expected-token'),
      triggerId: 'message_received',
      method: 'GET',
      url: verificationUrl('wrong-token')
    });
    let legacyResult = await handleSlateTriggerWebhook({
      client: createWhatsAppTriggerTestClient(),
      triggerId: 'message_received',
      method: 'GET',
      url: verificationUrl('legacy-token')
    });

    expect(protectedResult.response).toMatchObject({ status: 403 });
    expect(legacyResult.response).toMatchObject({ status: 200 });
    expect(decodeBody(legacyResult.response!)).toBe('challenge-value');
  });

  it('preserves normal POST event inputs', async () => {
    let client = createWhatsAppTriggerTestClient('expected-token');
    let message = {
      id: 'wamid.test-1',
      type: 'text',
      from: '15551234567',
      timestamp: '1700000000',
      text: { body: 'hello' }
    };

    let messageResult = await handleSlateTriggerWebhook({
      client,
      triggerId: 'message_received',
      url: 'https://example.com/callbacks/whatsapp',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
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
      })
    });
    let statusResult = await handleSlateTriggerWebhook({
      client,
      triggerId: 'message_status',
      url: 'https://example.com/callbacks/whatsapp',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
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
      })
    });

    expect(messageResult.inputs).toEqual([
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
    expect(messageResult.response).toBeUndefined();
    expect(statusResult.inputs).toEqual([
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
    expect(statusResult.response).toBeUndefined();
  });
});
