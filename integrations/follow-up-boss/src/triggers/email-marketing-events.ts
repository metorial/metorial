import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let emEventTypes = ['emEventsOpened', 'emEventsClicked', 'emEventsUnsubscribed'] as const;

export let emailMarketingEvents = SlateTrigger.create(spec, {
  name: 'Email Marketing Events',
  key: 'email_marketing_events',
  description: 'Triggered when contacts open, click, or unsubscribe from marketing emails.'
})
  .input(
    z.object({
      eventType: z.enum(emEventTypes).describe('Type of email marketing event'),
      eventId: z.string().describe('Unique event ID'),
      resourceId: z.number().describe('Resource ID affected'),
      resourceUri: z.string().optional().describe('URI to fetch the full resource'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      resourceId: z.number().describe('Resource ID'),
      eventType: z.string().describe('Type of event'),
      action: z.string().describe('Action taken (opened, clicked, unsubscribed)'),
      resourceUri: z.string().optional(),
      timestamp: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let registeredWebhooks: Array<{ webhookId: number; event: string }> = [];

      for (let eventType of emEventTypes) {
        let result = await client.createWebhook({
          event: eventType,
          url: ctx.input.webhookBaseUrl
        });
        registeredWebhooks.push({ webhookId: result.id, event: eventType });
      }

      return { registrationDetails: { webhooks: registeredWebhooks } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhooks = ctx.input.registrationDetails?.webhooks || [];
      for (let wh of webhooks) {
        try {
          await client.deleteWebhook(wh.webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event,
            eventId: String(data.eventId),
            resourceId: data.resourceIds?.[0] || 0,
            resourceUri: data.uri,
            timestamp: data.timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let action = 'unknown';
      if (ctx.input.eventType === 'emEventsOpened') action = 'opened';
      else if (ctx.input.eventType === 'emEventsClicked') action = 'clicked';
      else if (ctx.input.eventType === 'emEventsUnsubscribed') action = 'unsubscribed';

      return {
        type: `email_marketing.${action}`,
        id: ctx.input.eventId,
        output: {
          resourceId: ctx.input.resourceId,
          eventType: ctx.input.eventType,
          action,
          resourceUri: ctx.input.resourceUri,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
