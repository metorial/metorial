import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let whatsappGroupEventTrigger = SlateTrigger.create(spec, {
  name: 'WhatsApp Group Event',
  key: 'whatsapp_group_event',
  description:
    'Triggers on WhatsApp group activity: messages received, reactions, and membership changes (joins, leaves, removals).'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of group event'),
      eventId: z.string().describe('Unique identifier for this event'),
      groupUuid: z.string().optional().describe('UUID of the group'),
      groupName: z.string().optional().describe('Name of the group'),
      onNumber: z.string().optional().describe('Connected WhatsApp number'),
      participantNumber: z
        .string()
        .optional()
        .describe('Phone number of the participant involved'),
      participantName: z.string().optional().describe('Display name of the participant'),
      text: z.string().optional().describe('Message text (for message events)'),
      mediaUrl: z.string().optional().describe('Media URL (for message events)'),
      messageUuid: z.string().optional().describe('UUID of the message'),
      reaction: z.string().optional().describe('Reaction emoji'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.any().optional().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      groupUuid: z.string().optional().describe('UUID of the group'),
      groupName: z.string().optional().describe('Name of the group'),
      onNumber: z.string().optional().describe('Connected WhatsApp number'),
      participantNumber: z
        .string()
        .optional()
        .describe('Phone number of the participant involved'),
      participantName: z.string().optional().describe('Display name of the participant'),
      text: z.string().optional().describe('Message text'),
      mediaUrl: z.string().optional().describe('Media URL'),
      messageUuid: z.string().optional().describe('UUID of the message'),
      reaction: z.string().optional().describe('Reaction emoji'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TwoChatClient({ token: ctx.auth.token });

      let numbersResult = await client.listWhatsAppNumbers();
      let numbers = numbersResult.numbers || numbersResult.data || [];

      let events = [
        'whatsapp.group.message.received',
        'whatsapp.group.message.reaction',
        'whatsapp.group.join',
        'whatsapp.group.leave',
        'whatsapp.group.remove'
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
      let group = data.group || msg.group || {};

      return {
        inputs: [
          {
            eventType,
            eventId: msg.uuid || msg.message_uuid || msg.id || `${eventType}-${Date.now()}`,
            groupUuid: group.uuid || data.group_uuid || data.to_group_uuid,
            groupName: group.name || data.group_name,
            onNumber: data.on_number || data.channel_number,
            participantNumber:
              msg.from_number || msg.from || msg.phone_number || data.participant_number,
            participantName: msg.sender_name || msg.push_name || msg.display_name,
            text: msg.text || msg.body,
            mediaUrl: msg.media_url || msg.url,
            messageUuid: msg.uuid || msg.message_uuid,
            reaction: msg.reaction || msg.emoji,
            timestamp: msg.sent_at || msg.created_at || data.timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventMap: Record<string, string> = {
        'whatsapp.group.message.received': 'whatsapp_group.message_received',
        'whatsapp.group.message.reaction': 'whatsapp_group.message_reaction',
        'whatsapp.group.join': 'whatsapp_group.join',
        'whatsapp.group.leave': 'whatsapp_group.leave',
        'whatsapp.group.remove': 'whatsapp_group.remove'
      };

      return {
        type:
          eventMap[ctx.input.eventType] ||
          `whatsapp_group.${ctx.input.eventType.split('.').pop()}`,
        id: ctx.input.eventId,
        output: {
          groupUuid: ctx.input.groupUuid,
          groupName: ctx.input.groupName,
          onNumber: ctx.input.onNumber,
          participantNumber: ctx.input.participantNumber,
          participantName: ctx.input.participantName,
          text: ctx.input.text,
          mediaUrl: ctx.input.mediaUrl,
          messageUuid: ctx.input.messageUuid,
          reaction: ctx.input.reaction,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
