import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transactionalSmsEventTypes = [
  'sent',
  'accepted',
  'delivered',
  'replied',
  'softBounce',
  'hardBounce',
  'subscribe',
  'unsubscribe',
  'skip',
  'blacklisted',
  'rejected'
] as const;

export let transactionalSmsEvents = SlateTrigger.create(spec, {
  name: 'Transactional SMS Events',
  key: 'transactional_sms_events',
  description:
    'Receive notifications for transactional SMS delivery status events including sent, delivered, bounced, replied, and unsubscribed.'
})
  .input(
    z.object({
      event: z.string().describe('Event type'),
      messageId: z.string().optional().describe('Message ID'),
      phoneNumber: z.string().optional().describe('Recipient phone number'),
      date: z.string().optional().describe('Event timestamp'),
      ts: z.number().optional().describe('Event timestamp (Unix)'),
      tsEvent: z.number().optional().describe('Event timestamp (Unix)'),
      tag: z.string().optional().describe('SMS tag'),
      reason: z.string().optional().describe('Reason for bounce/rejection'),
      reply: z.string().optional().describe('Reply content for replied events'),
      raw: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('SMS message ID'),
      phoneNumber: z.string().optional().describe('Recipient phone number'),
      tag: z.string().optional().describe('SMS tag'),
      eventTimestamp: z.string().optional().describe('When the event occurred (ISO 8601)'),
      reason: z.string().optional().describe('Reason for bounce or rejection'),
      reply: z.string().optional().describe('Reply content (for replied events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authType: ctx.auth.authType
      });

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [...transactionalSmsEventTypes],
        type: 'transactional',
        channel: 'sms',
        description: 'Slates transactional SMS event webhook'
      });

      return {
        registrationDetails: { webhookId: result.webhookId }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authType: ctx.auth.authType
      });

      let details = ctx.input.registrationDetails as { webhookId: number };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = await ctx.request.json();
      let events = Array.isArray(data) ? data : [data];

      return {
        inputs: events.map((evt: any) => ({
          event: evt.event,
          messageId: evt['message-id'] ?? evt.messageId,
          phoneNumber: evt.phoneNumber ?? evt.phone,
          date: evt.date,
          ts: evt.ts,
          tsEvent: evt.ts_event ?? evt.tsEvent,
          tag: evt.tag,
          reason: evt.reason,
          reply: evt.reply,
          raw: evt
        }))
      };
    },

    handleEvent: async ctx => {
      let eventType = (ctx.input.event ?? 'unknown').toLowerCase();
      let eventTimestamp: string | undefined;
      if (ctx.input.tsEvent) {
        eventTimestamp = new Date(ctx.input.tsEvent * 1000).toISOString();
      } else if (ctx.input.ts) {
        eventTimestamp = new Date(ctx.input.ts * 1000).toISOString();
      } else if (ctx.input.date) {
        eventTimestamp = ctx.input.date;
      }

      let eventId = `sms-${ctx.input.messageId ?? 'unknown'}-${eventType}-${ctx.input.tsEvent ?? ctx.input.ts ?? Date.now()}`;

      return {
        type: `transactional_sms.${eventType}`,
        id: eventId,
        output: {
          messageId: ctx.input.messageId,
          phoneNumber: ctx.input.phoneNumber,
          tag: ctx.input.tag,
          eventTimestamp,
          reason: ctx.input.reason,
          reply: ctx.input.reply
        }
      };
    }
  });
