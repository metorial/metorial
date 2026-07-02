import { SlateTool } from 'slates';
import { z } from 'zod';
import { OdpClient } from '../lib/odp-client';
import { spec } from '../spec';

export let sendOdpEvent = SlateTool.create(spec, {
  name: 'Send ODP Event',
  key: 'send_odp_event',
  description: `Send one or more customer events to Optimizely Data Platform (ODP).
Events track customer actions and behaviors that feed into segmentation, analytics, and personalization.
Also supports querying historical events for a customer.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['send', 'send_batch', 'query']).describe('Action to perform'),
      eventType: z
        .string()
        .optional()
        .describe('Event type (for send, e.g., "purchase", "pageview")'),
      eventAction: z
        .string()
        .optional()
        .describe('Event action (for send, e.g., "completed", "viewed")'),
      identifiers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Customer identifiers (for send/send_batch)'),
      eventData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional event data (for send)'),
      events: z
        .array(
          z.object({
            type: z.string().describe('Event type'),
            action: z.string().describe('Event action'),
            identifiers: z.record(z.string(), z.string()).describe('Customer identifiers'),
            data: z.record(z.string(), z.any()).optional().describe('Event data')
          })
        )
        .optional()
        .describe('Batch of events to send (for send_batch)'),
      identifierField: z.string().optional().describe('Identifier field name (for query)'),
      identifierValue: z.string().optional().describe('Identifier value (for query)'),
      queryEventType: z.string().optional().describe('Filter events by type (for query)'),
      queryLimit: z.number().optional().describe('Max events to return (for query)'),
      queryOffset: z.number().optional().describe('Offset for pagination (for query)')
    })
  )
  .output(
    z.object({
      sent: z.boolean().optional().describe('Whether the event(s) were sent successfully'),
      events: z.array(z.any()).optional().describe('Queried events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OdpClient(ctx.auth.token);

    switch (ctx.input.action) {
      case 'send': {
        if (!ctx.input.eventType) throw new Error('eventType is required');
        if (!ctx.input.eventAction) throw new Error('eventAction is required');
        if (!ctx.input.identifiers) throw new Error('identifiers is required');
        await client.sendEvent({
          type: ctx.input.eventType,
          action: ctx.input.eventAction,
          identifiers: ctx.input.identifiers,
          data: ctx.input.eventData
        });
        return {
          output: { sent: true },
          message: `Sent ODP event **${ctx.input.eventType}.${ctx.input.eventAction}**.`
        };
      }
      case 'send_batch': {
        if (!ctx.input.events || ctx.input.events.length === 0)
          throw new Error('events array is required');
        await client.sendEvents(
          ctx.input.events.map(e => ({
            type: e.type,
            action: e.action,
            identifiers: e.identifiers,
            data: e.data
          }))
        );
        return {
          output: { sent: true },
          message: `Sent batch of ${ctx.input.events.length} ODP events.`
        };
      }
      case 'query': {
        if (!ctx.input.identifierField) throw new Error('identifierField is required');
        if (!ctx.input.identifierValue) throw new Error('identifierValue is required');
        let events = await client.queryEvents({
          identifierField: ctx.input.identifierField,
          identifierValue: ctx.input.identifierValue,
          eventType: ctx.input.queryEventType,
          limit: ctx.input.queryLimit,
          offset: ctx.input.queryOffset
        });
        return {
          output: { events: Array.isArray(events) ? events : events.data || [] },
          message: `Queried ODP events for ${ctx.input.identifierField}=${ctx.input.identifierValue}.`
        };
      }
    }
  })
  .build();
