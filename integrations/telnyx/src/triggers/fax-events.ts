import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let faxEvents = SlateTrigger.create(spec, {
  name: 'Fax Events',
  key: 'fax_events',
  description:
    'Receive webhook events for fax transmission status changes including queued, sending, delivered, received, and failed events. Configure the webhook URL on a Fax Application.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The event type (e.g., fax.delivered, fax.received, fax.failed)'),
      eventId: z.string().describe('Unique event ID'),
      occurredAt: z.string().optional().describe('When the event occurred'),
      faxId: z.string().optional().describe('Fax ID'),
      connectionId: z.string().optional().describe('Connection (fax application) ID'),
      from: z.string().optional().describe('Sender fax number'),
      to: z.string().optional().describe('Recipient fax number'),
      direction: z.string().optional().describe('Fax direction (inbound/outbound)'),
      status: z.string().optional().describe('Fax status'),
      mediaUrl: z.string().optional().describe('URL of the fax media'),
      pageCount: z.number().optional().describe('Number of pages'),
      rawPayload: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      faxId: z.string().describe('Fax ID'),
      connectionId: z.string().optional().describe('Connection (fax application) ID'),
      from: z.string().optional().describe('Sender fax number'),
      to: z.string().optional().describe('Recipient fax number'),
      direction: z.string().optional().describe('Fax direction'),
      status: z.string().optional().describe('Current fax status'),
      mediaUrl: z.string().optional().describe('URL of the fax media (if available)'),
      pageCount: z.number().optional().describe('Number of pages'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let event = body?.data;
      if (!event) {
        return { inputs: [] };
      }

      let payload = event.payload ?? {};
      let eventType = event.event_type ?? 'fax.unknown';
      let eventId = event.id ?? `fax-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            occurredAt: event.occurred_at,
            faxId: payload.fax_id ?? payload.id,
            connectionId: payload.connection_id,
            from: payload.from,
            to: payload.to,
            direction: payload.direction,
            status: payload.status,
            mediaUrl: payload.media_url,
            pageCount: payload.page_count,
            rawPayload: payload
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          faxId: ctx.input.faxId ?? ctx.input.eventId,
          connectionId: ctx.input.connectionId,
          from: ctx.input.from,
          to: ctx.input.to,
          direction: ctx.input.direction,
          status: ctx.input.status,
          mediaUrl: ctx.input.mediaUrl,
          pageCount: ctx.input.pageCount,
          occurredAt: ctx.input.occurredAt
        }
      };
    }
  })
  .build();
