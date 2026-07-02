import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messagingEvents = SlateTrigger.create(spec, {
  name: 'Messaging Events',
  key: 'messaging_events',
  description:
    'Receive webhook events for inbound and outbound messages, including received messages, sent confirmations, and delivery status updates. Configure the webhook URL on a Messaging Profile in Telnyx Mission Control.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The event type (e.g., message.received, message.sent, message.finalized)'),
      eventId: z.string().describe('Unique event ID'),
      occurredAt: z.string().optional().describe('When the event occurred'),
      from: z.string().optional().describe('Sender phone number'),
      to: z.string().optional().describe('Recipient phone number'),
      text: z.string().optional().describe('Message body text'),
      messageId: z.string().optional().describe('Telnyx message ID'),
      direction: z.string().optional().describe('Message direction'),
      messageType: z.string().optional().describe('Message type (SMS/MMS)'),
      status: z.string().optional().describe('Message status'),
      mediaUrls: z.array(z.string()).optional().describe('Media URLs (for MMS)'),
      messagingProfileId: z.string().optional().describe('Messaging profile ID'),
      rawPayload: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Telnyx message ID'),
      from: z.string().optional().describe('Sender phone number'),
      to: z.string().optional().describe('Recipient phone number'),
      text: z.string().optional().describe('Message body text'),
      direction: z.string().optional().describe('Message direction (inbound/outbound)'),
      messageType: z.string().optional().describe('Message type (SMS/MMS)'),
      status: z.string().optional().describe('Message delivery status'),
      mediaUrls: z.array(z.string()).optional().describe('Media URLs for MMS messages'),
      messagingProfileId: z.string().optional().describe('Associated messaging profile ID'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let event = body?.data;
      if (!event) {
        return { inputs: [] };
      }

      let payload = event.payload ?? {};
      let eventType = event.event_type ?? 'message.unknown';
      let eventId = event.id ?? `msg-${Date.now()}`;

      let from = payload.from?.phone_number ?? payload.from;
      let to = Array.isArray(payload.to)
        ? payload.to[0]?.phone_number
        : (payload.to?.phone_number ?? payload.to);
      let mediaUrls = (payload.media ?? []).map((m: any) => m.url).filter(Boolean);

      return {
        inputs: [
          {
            eventType,
            eventId,
            occurredAt: event.occurred_at,
            from,
            to,
            text: payload.text,
            messageId: payload.id ?? eventId,
            direction: payload.direction,
            messageType: payload.type,
            status: payload.to?.[0]?.status ?? payload.status,
            mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
            messagingProfileId: payload.messaging_profile_id,
            rawPayload: payload
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          messageId: ctx.input.messageId ?? ctx.input.eventId,
          from: ctx.input.from,
          to: ctx.input.to,
          text: ctx.input.text,
          direction: ctx.input.direction,
          messageType: ctx.input.messageType,
          status: ctx.input.status,
          mediaUrls: ctx.input.mediaUrls,
          messagingProfileId: ctx.input.messagingProfileId,
          occurredAt: ctx.input.occurredAt
        }
      };
    }
  })
  .build();
