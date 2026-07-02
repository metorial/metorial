import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let whatsappMessageReceiptTrigger = SlateTrigger.create(spec, {
  name: 'WhatsApp Message Receipt',
  key: 'whatsapp_message_receipt',
  description:
    'Triggers when a sent WhatsApp message status changes: sent (in transit), received (delivered), or read by the recipient.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of receipt event'),
      eventId: z.string().describe('Unique identifier for this event'),
      messageUuid: z.string().optional().describe('UUID of the message'),
      fromNumber: z.string().optional().describe('Sender phone number'),
      toNumber: z.string().optional().describe('Recipient phone number'),
      onNumber: z.string().optional().describe('Connected WhatsApp number'),
      receiptStatus: z.string().optional().describe('Receipt status (sent, received, read)'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.any().optional().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      messageUuid: z.string().optional().describe('UUID of the message'),
      fromNumber: z.string().optional().describe('Sender phone number'),
      toNumber: z.string().optional().describe('Recipient phone number'),
      onNumber: z.string().optional().describe('Connected WhatsApp number'),
      receiptStatus: z.string().optional().describe('Receipt status (sent, received, read)'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TwoChatClient({ token: ctx.auth.token });

      let numbersResult = await client.listWhatsAppNumbers();
      let numbers = numbersResult.numbers || numbersResult.data || [];

      let events = [
        'whatsapp.message.receipt.sent',
        'whatsapp.message.receipt.received',
        'whatsapp.message.receipt.read'
      ];

      let registrations: Array<{ webhookUuid: string; event: string; onNumber: string }> = [];

      for (let num of numbers) {
        let phoneNumber = num.phone_number || num.number;
        if (!phoneNumber) continue;

        for (let event of events) {
          try {
            let result = await client.subscribeWebhook({
              hookUrl: ctx.input.webhookBaseUrl,
              onNumber: phoneNumber,
              event
            });
            registrations.push({
              webhookUuid: result.uuid || result.webhook_uuid || result.id,
              event,
              onNumber: phoneNumber
            });
          } catch (_e) {
            // Some events may not be supported for all number types
          }
        }
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new TwoChatClient({ token: ctx.auth.token });
      let registrations = ctx.input.registrationDetails?.registrations || [];

      for (let reg of registrations) {
        try {
          if (reg.webhookUuid) {
            await client.deleteWebhook(reg.webhookUuid);
          }
        } catch (_e) {
          // Best-effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event || data.type || '';
      let msg = data.message || data.payload || data;

      let statusMap: Record<string, string> = {
        'whatsapp.message.receipt.sent': 'sent',
        'whatsapp.message.receipt.received': 'received',
        'whatsapp.message.receipt.read': 'read'
      };

      return {
        inputs: [
          {
            eventType,
            eventId: msg.uuid || msg.message_uuid || `${eventType}-${Date.now()}`,
            messageUuid: msg.uuid || msg.message_uuid || msg.id,
            fromNumber: msg.from_number || msg.from || data.from_number,
            toNumber: msg.to_number || msg.to || data.to_number,
            onNumber: data.on_number || data.channel_number,
            receiptStatus: statusMap[eventType] || msg.status || eventType.split('.').pop(),
            timestamp: msg.timestamp || msg.sent_at || data.timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventMap: Record<string, string> = {
        'whatsapp.message.receipt.sent': 'whatsapp_receipt.sent',
        'whatsapp.message.receipt.received': 'whatsapp_receipt.received',
        'whatsapp.message.receipt.read': 'whatsapp_receipt.read'
      };

      return {
        type:
          eventMap[ctx.input.eventType] ||
          `whatsapp_receipt.${ctx.input.eventType.split('.').pop()}`,
        id: ctx.input.eventId,
        output: {
          messageUuid: ctx.input.messageUuid,
          fromNumber: ctx.input.fromNumber,
          toNumber: ctx.input.toNumber,
          onNumber: ctx.input.onNumber,
          receiptStatus: ctx.input.receiptStatus,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
