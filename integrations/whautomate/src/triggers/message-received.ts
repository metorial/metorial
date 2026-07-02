import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let incomingEventTypes = [
  'incoming_whatsapp_message',
  'incoming_instagram_message',
  'incoming_messenger_message',
  'incoming_telegram_message',
  'incoming_livechat_message'
] as const;

export let messageReceived = SlateTrigger.create(spec, {
  name: 'Message Received',
  key: 'message_received',
  description:
    'Triggered when a new incoming message is received from a contact on any channel (WhatsApp, Instagram, Messenger, Telegram, Live Chat).'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      eventTimestamp: z.string().describe('Event timestamp'),
      message: z.record(z.string(), z.any()).describe('Message payload')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message ID'),
      contactId: z.string().optional().describe('Contact ID'),
      channel: z
        .string()
        .optional()
        .describe('Messaging channel (whatsapp, instagram, messenger, telegram, livechat)'),
      phoneNumber: z.string().optional().describe('Contact phone number'),
      from: z.string().optional().describe('Sender identifier'),
      text: z.string().optional().describe('Text content of the message'),
      mediaUrl: z.string().optional().describe('URL of attached media'),
      caption: z.string().optional().describe('Media caption'),
      messageType: z
        .string()
        .optional()
        .describe('Message type (text, image, document, etc.)'),
      timestamp: z.string().optional().describe('Message timestamp'),
      createdAt: z.string().optional().describe('Message creation time')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiHost: ctx.config.apiHost
      });

      let result = await client.createWebhook({
        serverUrl: ctx.input.webhookBaseUrl,
        eventTypes: [...incomingEventTypes],
        isActive: true
      });

      return {
        registrationDetails: {
          webhookId: result.id || result._id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiHost: ctx.config.apiHost
      });

      if (ctx.input.registrationDetails?.webhookId) {
        await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let event = data.event || {};
      let message = data.message || data;

      return {
        inputs: [
          {
            eventType: event.type || 'incoming_message',
            eventId: event.id || message.id || message._id || crypto.randomUUID(),
            eventTimestamp: event.timeStamp || message.createdAt || new Date().toISOString(),
            message
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let msg = ctx.input.message;
      let channel = ctx.input.eventType.replace('incoming_', '').replace('_message', '');

      return {
        type: `message.received`,
        id: ctx.input.eventId,
        output: {
          messageId: msg.id || msg._id || ctx.input.eventId,
          contactId: msg.contact?.id || msg.contactId,
          channel,
          phoneNumber: msg.contact?.phoneNumber || msg.phoneNumber,
          from: msg.from,
          text: msg.text,
          mediaUrl: msg.mediaUrl,
          caption: msg.caption,
          messageType: msg.type,
          timestamp: msg.timestamp,
          createdAt: msg.createdAt
        }
      };
    }
  })
  .build();
