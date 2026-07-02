import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ExaClient } from '../lib/client';
import { spec } from '../spec';

let webhookEventTypes = [
  'webset.created',
  'webset.deleted',
  'webset.paused',
  'webset.idle',
  'webset.search.created',
  'webset.search.updated',
  'webset.search.completed',
  'webset.search.canceled',
  'webset.item.created',
  'webset.item.enriched',
  'import.created',
  'import.completed',
  'monitor.created',
  'monitor.updated',
  'monitor.deleted',
  'monitor.run.created',
  'monitor.run.completed',
  'webset.export.created',
  'webset.export.completed'
] as const;

export let websetEventsTrigger = SlateTrigger.create(spec, {
  name: 'Webset Events',
  key: 'webset_events',
  description:
    'Receive real-time notifications for Webset lifecycle events including item creation, enrichment completion, search progress, imports, monitors, and exports.'
})
  .input(
    z.object({
      eventType: z.string().describe('The event type'),
      eventId: z.string().describe('Unique event identifier'),
      eventData: z.record(z.string(), z.unknown()).describe('Full event payload from Exa')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('ID of the affected resource'),
      resourceType: z
        .string()
        .describe(
          'Type of the affected resource (webset, item, search, import, monitor, export, webhook)'
        ),
      eventData: z.record(z.string(), z.unknown()).describe('Full event data from Exa')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ExaClient(ctx.auth.token);

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [...webhookEventTypes]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ExaClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (body.type as string) || 'unknown';
      let eventId = (body.id as string) || `evt_${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            eventData: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventData = ctx.input.eventData;
      let data = (eventData.data || eventData) as Record<string, unknown>;

      let resourceId = (data.id as string) || (eventData.id as string) || 'unknown';
      let resourceType = inferResourceType(ctx.input.eventType);

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          resourceId,
          resourceType,
          eventData: ctx.input.eventData
        }
      };
    }
  })
  .build();

let inferResourceType = (eventType: string): string => {
  if (eventType.startsWith('webset.item.')) return 'item';
  if (eventType.startsWith('webset.search.')) return 'search';
  if (eventType.startsWith('webset.export.')) return 'export';
  if (eventType.startsWith('import.')) return 'import';
  if (eventType.startsWith('monitor.')) return 'monitor';
  if (eventType.startsWith('webset.')) return 'webset';
  return 'unknown';
};
