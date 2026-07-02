import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let searchEvents = SlateTrigger.create(spec, {
  name: 'Search Events',
  key: 'search_events',
  description:
    'Receive real-time notifications for search completion, search failure, and quota exceeded events via webhooks.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of event (search.completed, search.failed, quota.exceeded)'),
      eventId: z.string().describe('Unique identifier for the event'),
      query: z.string().optional().describe('Search query that triggered the event'),
      timestamp: z.string().optional().describe('When the event occurred'),
      rawPayload: z.any().optional().describe('Full raw event payload from Serply')
    })
  )
  .output(
    z.object({
      searchQuery: z
        .string()
        .optional()
        .describe('The search query associated with the event'),
      status: z.string().optional().describe('Status of the search (completed, failed)'),
      timestamp: z.string().optional().describe('When the event occurred'),
      errorMessage: z.string().optional().describe('Error message if the search failed')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let _signature = ctx.request.headers.get('x-serply-signature');
      let body = (await ctx.request.json()) as any;

      let eventType = body.type || body.event || 'unknown';
      let eventId = body.id || body.event_id || `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            query: body.query || body.data?.query || undefined,
            timestamp: body.timestamp || body.created_at || undefined,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let rawPayload = ctx.input.rawPayload || {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          searchQuery:
            ctx.input.query || rawPayload.query || rawPayload.data?.query || undefined,
          status:
            ctx.input.eventType === 'search.completed'
              ? 'completed'
              : ctx.input.eventType === 'search.failed'
                ? 'failed'
                : ctx.input.eventType === 'quota.exceeded'
                  ? 'quota_exceeded'
                  : ctx.input.eventType,
          timestamp: ctx.input.timestamp || undefined,
          errorMessage: rawPayload.error || rawPayload.message || undefined
        }
      };
    }
  })
  .build();
