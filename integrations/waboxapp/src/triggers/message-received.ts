import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messageReceivedTrigger = SlateTrigger.create(spec, {
  name: 'Message Received',
  key: 'message_received',
  description:
    'Triggers when a new WhatsApp message is received or sent on the linked account. Covers all message types including text, image, video, audio, document, vcard, and location.'
})
  .input(
    z.object({
      eventType: z.string().describe('The event type identifier.'),
      contactPhone: z.string().describe('Phone number of the contact.'),
      contactName: z.string().optional().describe('Name of the contact.'),
      contactType: z.string().optional().describe('Contact type: user or group.'),
      messageId: z.string().describe('WhatsApp unique message ID.'),
      direction: z.string().describe('Message direction: i (inbound) or o (outbound).'),
      messageType: z
        .string()
        .describe(
          'Type of message: chat, image, video, audio, ptt, document, vcard, location.'
        ),
      timestamp: z.number().describe('Unix timestamp of the message.'),
      body: z.string().optional().describe('Text content of the message.'),
      mediaUrl: z
        .string()
        .optional()
        .describe('URL of the media content (retained for 15 days).'),
      raw: z.any().describe('Full raw webhook payload.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('WhatsApp unique message ID.'),
      contactPhone: z.string().describe('Phone number of the contact.'),
      contactName: z.string().optional().describe('Display name of the contact.'),
      contactType: z.string().optional().describe('Contact type: user or group.'),
      direction: z
        .enum(['inbound', 'outbound'])
        .describe('Whether the message was received or sent.'),
      messageType: z
        .string()
        .describe(
          'Type of message: chat, image, video, audio, ptt, document, vcard, location.'
        ),
      timestamp: z.number().describe('Unix timestamp of the message.'),
      body: z.string().optional().describe('Text content of the message (for chat messages).'),
      mediaUrl: z
        .string()
        .optional()
        .describe('URL of the media content (retained for 15 days).')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      // Only process message events, skip ACK events
      if (data.event_type !== 'message') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.event_type,
            contactPhone: data.contact?.uid ?? '',
            contactName: data.contact?.name,
            contactType: data.contact?.type,
            messageId: data.id ?? '',
            direction: data.dir ?? '',
            messageType: data.type ?? '',
            timestamp: data.time ?? 0,
            body: data.body,
            mediaUrl: data.url,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let direction: 'inbound' | 'outbound' =
        ctx.input.direction === 'i' ? 'inbound' : 'outbound';

      return {
        type: `message.${direction}`,
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          contactPhone: ctx.input.contactPhone,
          contactName: ctx.input.contactName,
          contactType: ctx.input.contactType,
          direction,
          messageType: ctx.input.messageType,
          timestamp: ctx.input.timestamp,
          body: ctx.input.body,
          mediaUrl: ctx.input.mediaUrl
        }
      };
    }
  })
  .build();
