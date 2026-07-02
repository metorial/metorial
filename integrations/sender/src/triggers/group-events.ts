import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let groupEvents = SlateTrigger.create(spec, {
  name: 'Group Events',
  key: 'group_events',
  description: 'Triggers when a new subscriber group is created in your Sender account.'
})
  .input(
    z.object({
      topic: z.string().describe('The webhook topic that fired'),
      webhookId: z.string().describe('Webhook event ID'),
      groupTitle: z.string().optional().describe('Title of the newly created group'),
      eventData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full event data from the webhook payload'),
      timestamp: z.string().describe('Timestamp of the event')
    })
  )
  .output(
    z.object({
      groupTitle: z.string().optional().describe('Title of the created group'),
      topic: z.string().describe('Webhook topic that triggered the event'),
      eventTimestamp: z.string().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        topic: 'groups/new'
      });

      return {
        registrationDetails: { webhookId: result.data.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: string };

      if (details.webhookId) {
        await client.deleteWebhook(details.webhookId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let eventId = String(body.id || `${Date.now()}`);
      let title = (body.title as string) || undefined;
      let timestamp = (body.created as string) || new Date().toISOString();

      return {
        inputs: [
          {
            topic: 'groups/new',
            webhookId: eventId,
            groupTitle: title,
            eventData: body,
            timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'group.created',
        id: `${ctx.input.webhookId}-${ctx.input.timestamp}`,
        output: {
          groupTitle: ctx.input.groupTitle,
          topic: ctx.input.topic,
          eventTimestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
