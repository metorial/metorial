import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let communicationEventTypes = [
  'callsCreated',
  'callsUpdated',
  'callsDeleted',
  'textMessagesCreated',
  'textMessagesUpdated',
  'textMessagesDeleted',
  'emailsCreated',
  'emailsUpdated',
  'emailsDeleted'
] as const;

export let communicationEvents = SlateTrigger.create(spec, {
  name: 'Communication Events',
  key: 'communication_events',
  description:
    'Triggered when calls, text messages, or emails are created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.enum(communicationEventTypes).describe('Type of communication event'),
      eventId: z.string().describe('Unique event ID'),
      resourceId: z.number().describe('ID of the affected communication record'),
      resourceUri: z.string().optional().describe('URI to fetch the full resource'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      resourceId: z.number().describe('Communication record ID'),
      eventType: z.string().describe('Type of event'),
      communicationType: z
        .string()
        .describe('Type of communication (call, textMessage, email)'),
      resourceUri: z.string().optional(),
      timestamp: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let registeredWebhooks: Array<{ webhookId: number; event: string }> = [];

      for (let eventType of communicationEventTypes) {
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
      let commType = 'unknown';
      if (ctx.input.eventType.startsWith('calls')) commType = 'call';
      else if (ctx.input.eventType.startsWith('textMessages')) commType = 'text_message';
      else if (ctx.input.eventType.startsWith('emails')) commType = 'email';

      let action = ctx.input.eventType
        .replace(/^(calls|textMessages|emails)/, '')
        .toLowerCase();

      return {
        type: `${commType}.${action}`,
        id: ctx.input.eventId,
        output: {
          resourceId: ctx.input.resourceId,
          eventType: ctx.input.eventType,
          communicationType: commType,
          resourceUri: ctx.input.resourceUri,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
