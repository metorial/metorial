import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let marketingEventTypes = ['unsubscribed', 'listAddition', 'delivered'] as const;

export let marketingEvents = SlateTrigger.create(spec, {
  name: 'Marketing Events',
  key: 'marketing_events',
  description:
    'Receive notifications for marketing webhook events including contact list additions, unsubscribes, and campaign delivery status.'
})
  .input(
    z.object({
      event: z.string().describe('Event type'),
      email: z.string().optional().describe('Contact email'),
      messageId: z.string().optional().describe('Message ID'),
      date: z.string().optional().describe('Event timestamp'),
      ts: z.number().optional().describe('Event timestamp (Unix)'),
      tsEvent: z.number().optional().describe('Event timestamp (Unix)'),
      listId: z.array(z.number()).optional().describe('Associated list IDs'),
      tag: z.string().optional().describe('Campaign tag'),
      tags: z.array(z.string()).optional().describe('Campaign tags'),
      raw: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('Contact email address'),
      messageId: z.string().optional().describe('Marketing message ID'),
      listIds: z.array(z.number()).optional().describe('Associated contact list IDs'),
      tag: z.string().optional().describe('Campaign tag'),
      tags: z.array(z.string()).optional().describe('Campaign tags'),
      eventTimestamp: z.string().optional().describe('When the event occurred (ISO 8601)')
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
        events: [...marketingEventTypes],
        type: 'marketing',
        description: 'Slates marketing event webhook'
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
          email: evt.email,
          messageId: evt['message-id'] ?? evt.messageId,
          date: evt.date,
          ts: evt.ts,
          tsEvent: evt.ts_event ?? evt.tsEvent,
          listId: evt.list_id ?? evt.listId,
          tag: evt.tag,
          tags: evt.tags,
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

      let eventId = `mkt-${ctx.input.email ?? 'unknown'}-${eventType}-${ctx.input.tsEvent ?? ctx.input.ts ?? Date.now()}`;

      return {
        type: `marketing.${eventType}`,
        id: eventId,
        output: {
          email: ctx.input.email,
          messageId: ctx.input.messageId,
          listIds: ctx.input.listId,
          tag: ctx.input.tag,
          tags: ctx.input.tags,
          eventTimestamp
        }
      };
    }
  });
