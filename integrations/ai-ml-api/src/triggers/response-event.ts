import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let responseEvent = SlateTrigger.create(spec, {
  name: 'Response Event',
  key: 'response_event',
  description:
    'Triggered when an asynchronous background response completes or fails. Receives webhook notifications for response.completed and response.failed events.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of the event, e.g. "response.completed" or "response.failed"'),
      eventId: z.string().describe('Unique identifier for this event'),
      resourceId: z.string().optional().describe('Identifier of the associated resource'),
      timestamp: z.string().optional().describe('ISO timestamp of when the event occurred'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('Identifier of the response that completed or failed'),
      eventId: z.string().describe('Unique event identifier'),
      timestamp: z.string().optional().describe('Timestamp of the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (body.type as string) ?? (body.event_type as string) ?? 'unknown';
      let eventId = (body.event_id as string) ?? (body.id as string) ?? crypto.randomUUID();
      let resourceId = (body.resource_id as string) ?? (body.response_id as string);
      let timestamp = (body.timestamp as string) ?? (body.created_at as string);

      return {
        inputs: [
          {
            eventType,
            eventId,
            resourceId,
            timestamp,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType || 'response.unknown',
        id: ctx.input.eventId,
        output: {
          responseId: ctx.input.resourceId ?? ctx.input.eventId,
          eventId: ctx.input.eventId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
