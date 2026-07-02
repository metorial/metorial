import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let registryEvents = SlateTrigger.create(spec, {
  name: 'Registry Events',
  key: 'registry_events',
  description:
    'Triggers when a revocation registry is created or deleted. Configure the webhook URL in the Dock Certs dashboard under Developer > Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of registry event'),
      eventId: z.string().describe('Unique event identifier'),
      registryId: z.string().optional().describe('The affected registry ID'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      registryId: z.string().optional().describe('The affected registry ID'),
      eventType: z.string().describe('Type of event that occurred'),
      timestamp: z.string().optional().describe('When the event occurred'),
      webhookPayload: z
        .record(z.string(), z.unknown())
        .describe('Full event data from Dock Certs')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (data.type ?? data.event ?? 'unknown') as string;
      let eventId = (data.id ?? data.eventId ?? `${eventType}-${Date.now()}`) as string;
      let registryId = (data.registryId ??
        (data.data as Record<string, unknown> | undefined)?.id) as string | undefined;
      let timestamp = (data.timestamp ??
        data.created_at ??
        new Date().toISOString()) as string;

      let registryEventTypes = ['registry_create', 'registry_delete'];
      if (!registryEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId,
            registryId,
            timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        registry_create: 'registry.created',
        registry_delete: 'registry.deleted'
      };

      let type = typeMap[ctx.input.eventType] ?? `registry.${ctx.input.eventType}`;

      return {
        type,
        id: ctx.input.eventId,
        output: {
          registryId: ctx.input.registryId,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          webhookPayload: ctx.input.rawPayload
        }
      };
    }
  })
  .build();
