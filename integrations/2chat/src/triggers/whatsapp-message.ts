import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let whatsappMessageTrigger = SlateTrigger.create(spec, {
  name: 'WhatsApp Message',
  key: 'whatsapp_message',
  description:
    'Triggers when a WhatsApp message is received, sent, edited, or reacted to. Also fires on audio transcription events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of WhatsApp message event'),
      eventId: z.string().describe('Unique identifier for this event'),
      fromNumber: z.string().optional().describe('Sender phone number'),
      toNumber: z.string().optional().describe('Recipient phone number'),
      onNumber: z
        .string()
        .optional()
        .describe('Connected WhatsApp number that received the webhook'),
      text: z.string().optional().describe('Text content of the message'),
      mediaUrl: z.string().optional().describe('URL of attached media'),
      mediaType: z.string().optional().describe('MIME type of attached media'),
      messageUuid: z.string().optional().describe('UUID of the message'),
      timestamp: z.string().optional().describe('Event timestamp'),
      senderName: z.string().optional().describe('Display name of the sender'),
      isForwarded: z.boolean().optional().describe('Whether the message was forwarded'),
      reaction: z.string().optional().describe('Reaction emoji (for reaction events)'),
      transcription: z
        .string()
        .optional()
        .describe('Transcribed text (for audio transcription events)'),
      rawPayload: z.any().optional().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      messageUuid: z.string().optional().describe('UUID of the message'),
      fromNumber: z.string().optional().describe('Sender phone number'),
      toNumber: z.string().optional().describe('Recipient phone number'),
      onNumber: z.string().optional().describe('Connected WhatsApp number'),
      text: z.string().optional().describe('Text content of the message'),
      mediaUrl: z.string().optional().describe('URL of attached media'),
      mediaType: z.string().optional().describe('MIME type of attached media'),
      senderName: z.string().optional().describe('Display name of the sender'),
      isForwarded: z.boolean().optional().describe('Whether the message was forwarded'),
      reaction: z.string().optional().describe('Reaction emoji'),
      transcription: z.string().optional().describe('Transcribed text'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TwoChatClient({ token: ctx.auth.token });

      let numbersResult = await client.listWhatsAppNumbers();
      let numbers = numbersResult.numbers || numbersResult.data || [];

      let events = [
        'whatsapp.message.received',
        'whatsapp.message.sent',
        'whatsapp.message.new',
        'whatsapp.message.edited',
        'whatsapp.message.reaction',
        'whatsapp.audio.transcribed'
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

      let eventType = data.event || data.type || 'whatsapp.message.received';
      let msg = data.message || data.payload || data;

      return {
        inputs: [
          {
            eventType,
            eventId: msg.uuid || msg.message_uuid || msg.id || `${eventType}-${Date.now()}`,
            fromNumber: msg.from_number || msg.from || data.from_number,
            toNumber: msg.to_number || msg.to || data.to_number,
            onNumber: data.on_number || data.channel_number,
            text: msg.text || msg.body,
            mediaUrl: msg.media_url || msg.url,
            mediaType: msg.media_type || msg.mime_type,
            messageUuid: msg.uuid || msg.message_uuid || msg.id,
            timestamp: msg.sent_at || msg.created_at || data.timestamp,
            senderName: msg.sender_name || msg.push_name || msg.display_name,
            isForwarded: msg.is_forwarded ?? false,
            reaction: msg.reaction || msg.emoji,
            transcription: msg.transcription || msg.transcribed_text,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventMap: Record<string, string> = {
        'whatsapp.message.received': 'whatsapp_message.received',
        'whatsapp.message.sent': 'whatsapp_message.sent',
        'whatsapp.message.new': 'whatsapp_message.new',
        'whatsapp.message.edited': 'whatsapp_message.edited',
        'whatsapp.message.reaction': 'whatsapp_message.reaction',
        'whatsapp.audio.transcribed': 'whatsapp_message.audio_transcribed'
      };

      return {
        type:
          eventMap[ctx.input.eventType] ||
          `whatsapp_message.${ctx.input.eventType.split('.').pop()}`,
        id: ctx.input.eventId,
        output: {
          messageUuid: ctx.input.messageUuid,
          fromNumber: ctx.input.fromNumber,
          toNumber: ctx.input.toNumber,
          onNumber: ctx.input.onNumber,
          text: ctx.input.text,
          mediaUrl: ctx.input.mediaUrl,
          mediaType: ctx.input.mediaType,
          senderName: ctx.input.senderName,
          isForwarded: ctx.input.isForwarded,
          reaction: ctx.input.reaction,
          transcription: ctx.input.transcription,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
