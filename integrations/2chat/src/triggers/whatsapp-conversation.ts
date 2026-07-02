import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let whatsappConversationTrigger = SlateTrigger.create(spec, {
  name: 'WhatsApp New Conversation',
  key: 'whatsapp_new_conversation',
  description:
    'Triggers when a new WhatsApp conversation is started. A conversation is considered new based on a configurable inactivity period.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      eventId: z.string().describe('Unique identifier for this event'),
      fromNumber: z.string().optional().describe('Phone number that started the conversation'),
      toNumber: z.string().optional().describe('Phone number that received the conversation'),
      onNumber: z.string().optional().describe('Connected WhatsApp number'),
      contactName: z.string().optional().describe('Display name of the contact'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.any().optional().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      fromNumber: z.string().optional().describe('Phone number that started the conversation'),
      toNumber: z.string().optional().describe('Phone number that received the conversation'),
      onNumber: z.string().optional().describe('Connected WhatsApp number'),
      contactName: z.string().optional().describe('Display name of the contact'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TwoChatClient({ token: ctx.auth.token });

      let numbersResult = await client.listWhatsAppNumbers();
      let numbers = numbersResult.numbers || numbersResult.data || [];

      let registrations: Array<{ webhookUuid: string; event: string; onNumber: string }> = [];

      for (let num of numbers) {
        let phoneNumber = num.phone_number || num.number;
        if (!phoneNumber) continue;

        try {
          let result = await client.subscribeWebhook({
            hookUrl: ctx.input.webhookBaseUrl,
            onNumber: phoneNumber,
            event: 'whatsapp.conversation.new'
          });
          registrations.push({
            webhookUuid: result.uuid || result.webhook_uuid || result.id,
            event: 'whatsapp.conversation.new',
            onNumber: phoneNumber
          });
        } catch (_e) {
          // May not be supported for all number types
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

      let msg = data.message || data.payload || data;

      return {
        inputs: [
          {
            eventType: data.event || 'whatsapp.conversation.new',
            eventId: msg.uuid || msg.id || `conv-${Date.now()}`,
            fromNumber: msg.from_number || msg.from || data.from_number,
            toNumber: msg.to_number || msg.to || data.to_number,
            onNumber: data.on_number || data.channel_number,
            contactName: msg.sender_name || msg.push_name || msg.contact_name,
            timestamp: msg.sent_at || msg.created_at || data.timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'whatsapp_conversation.new',
        id: ctx.input.eventId,
        output: {
          fromNumber: ctx.input.fromNumber,
          toNumber: ctx.input.toNumber,
          onNumber: ctx.input.onNumber,
          contactName: ctx.input.contactName,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
