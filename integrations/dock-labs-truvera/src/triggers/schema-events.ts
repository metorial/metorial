import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let schemaEvents = SlateTrigger.create(spec, {
  name: 'Schema Events',
  key: 'schema_events',
  description:
    'Triggers when a credential schema is created. Configure the webhook URL in the Dock Certs dashboard under Developer > Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of schema event'),
      eventId: z.string().describe('Unique event identifier'),
      schemaId: z.string().optional().describe('The created schema ID'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      schemaId: z.string().optional().describe('The created schema ID'),
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
      let schemaId = (data.schemaId ??
        (data.data as Record<string, unknown> | undefined)?.id) as string | undefined;
      let timestamp = (data.timestamp ??
        data.created_at ??
        new Date().toISOString()) as string;

      if (eventType !== 'schema_create') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId,
            schemaId,
            timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'schema.created',
        id: ctx.input.eventId,
        output: {
          schemaId: ctx.input.schemaId,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          webhookPayload: ctx.input.rawPayload
        }
      };
    }
  })
  .build();
