import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let peopleEventTypes = [
  'peopleCreated',
  'peopleUpdated',
  'peopleDeleted',
  'peopleTagsCreated',
  'peopleStageUpdated'
] as const;

export let peopleEvents = SlateTrigger.create(spec, {
  name: 'People Events',
  key: 'people_events',
  description:
    'Triggered when contacts are created, updated, deleted, or when tags or stages change on a contact.'
})
  .input(
    z.object({
      eventType: z.enum(peopleEventTypes).describe('Type of people event'),
      eventId: z.string().describe('Unique event ID'),
      personId: z.number().describe('Contact ID affected'),
      resourceUri: z.string().optional().describe('URI to fetch the full resource'),
      tags: z.array(z.string()).optional().describe('Tag names (for peopleTagsCreated)'),
      stageName: z.string().optional().describe('New stage name (for peopleStageUpdated)'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('Contact ID'),
      eventType: z.string().describe('Type of event'),
      tags: z.array(z.string()).optional().describe('Tags added (for tag events)'),
      stageName: z.string().optional().describe('New stage name (for stage events)'),
      resourceUri: z.string().optional(),
      timestamp: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let registeredWebhooks: Array<{ webhookId: number; event: string }> = [];

      for (let eventType of peopleEventTypes) {
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
            personId: data.personId || data.resourceIds?.[0],
            resourceUri: data.uri,
            tags: data.tags,
            stageName: data.stageName,
            timestamp: data.timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `people.${ctx.input.eventType.replace('people', '').toLowerCase()}`,
        id: ctx.input.eventId,
        output: {
          personId: ctx.input.personId,
          eventType: ctx.input.eventType,
          tags: ctx.input.tags,
          stageName: ctx.input.stageName,
          resourceUri: ctx.input.resourceUri,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
