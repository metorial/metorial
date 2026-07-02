import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let campaignEmailWebhook = SlateTrigger.create(spec, {
  name: 'Campaign Email Webhook',
  key: 'campaign_email_webhook',
  description:
    'Receives real-time email engagement events from Optimizely Campaign including sends, opens, clicks, bounces, unsubscribes, and spam complaints.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Email event type (sent, open, click, bounce, unsubscribe, spam_complaint)'),
      eventId: z.string().describe('Unique event identifier'),
      mailingId: z.string().optional().describe('Mailing ID'),
      recipientEmail: z.string().optional().describe('Recipient email address'),
      payload: z.any().describe('Full webhook event payload')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Email event type'),
      mailingId: z.string().optional().describe('Mailing ID'),
      mailingName: z.string().optional().describe('Mailing name'),
      recipientEmail: z.string().optional().describe('Recipient email address'),
      recipientId: z.string().optional().describe('Recipient ID'),
      timestamp: z.string().optional().describe('When the event occurred'),
      linkUrl: z.string().optional().describe('Clicked link URL (for click events)'),
      bounceType: z
        .string()
        .optional()
        .describe('Bounce type: soft or hard (for bounce events)'),
      rawEvent: z.any().optional().describe('Additional event details')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let events: any[] = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let eventType = (
          event.type ||
          event.event_type ||
          event.event ||
          'unknown'
        ).toLowerCase();
        let eventId =
          event.id ||
          event.event_id ||
          `${eventType}-${event.mailing_id || ''}-${event.recipient_email || ''}-${Date.now()}`;

        return {
          eventType,
          eventId: String(eventId),
          mailingId: event.mailing_id ? String(event.mailing_id) : undefined,
          recipientEmail: event.recipient_email || event.email,
          payload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      return {
        type: `email.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          eventType: ctx.input.eventType,
          mailingId: ctx.input.mailingId,
          mailingName: payload.mailing_name || payload.mailingName,
          recipientEmail: ctx.input.recipientEmail,
          recipientId: payload.recipient_id ? String(payload.recipient_id) : undefined,
          timestamp: payload.timestamp || payload.occurred_at || payload.created_at,
          linkUrl: payload.link_url || payload.url,
          bounceType: payload.bounce_type || payload.bounceType,
          rawEvent: payload
        }
      };
    }
  })
  .build();
