import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

let eventSchema = z.object({
  eventId: z.string().describe('Event ID'),
  serviceId: z.string().optional().describe('Service ID'),
  type: z.string().optional().describe('Event type'),
  timestamp: z.string().optional().describe('Event timestamp')
});

let mapEvent = (value: any) => {
  let event = value.event || value;
  return {
    eventId: event.id,
    serviceId: event.serviceId,
    type: event.type,
    timestamp: event.timestamp
  };
};

export let manageEvents = SlateTool.create(spec, {
  name: 'Manage Events',
  key: 'manage_events',
  description: `List events for a Render service or retrieve a specific event by ID. Useful for auditing service lifecycle changes, deploy events, and datastore events.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get']).describe('Event action'),
      serviceId: z.string().optional().describe('Service ID for list'),
      eventId: z.string().optional().describe('Event ID for get'),
      eventType: z.string().optional().describe('Filter list by event type'),
      startTime: z.string().optional().describe('Filter list from this timestamp'),
      endTime: z.string().optional().describe('Filter list through this timestamp'),
      limit: z.number().optional().describe('Maximum results for list'),
      cursor: z.string().optional().describe('Pagination cursor for list')
    })
  )
  .output(
    z.object({
      events: z.array(eventSchema).optional().describe('Events'),
      event: eventSchema.optional().describe('Single event'),
      cursor: z.string().optional().describe('Cursor for next page'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);

    if (ctx.input.action === 'get') {
      if (!ctx.input.eventId) throw createApiServiceError('eventId is required for get');
      let event = mapEvent(await client.getEvent(ctx.input.eventId));
      return {
        output: { event, success: true },
        message: `Event \`${event.eventId}\` type: **${event.type || 'unknown'}**.`
      };
    }

    if (!ctx.input.serviceId) throw createApiServiceError('serviceId is required for list');
    let params: Record<string, any> = {};
    if (ctx.input.eventType) params.eventType = [ctx.input.eventType];
    if (ctx.input.startTime) params.startTime = ctx.input.startTime;
    if (ctx.input.endTime) params.endTime = ctx.input.endTime;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.cursor) params.cursor = ctx.input.cursor;
    let data = await client.listServiceEvents(ctx.input.serviceId, params);
    let lastCursor: string | undefined;
    let events = (Array.isArray(data) ? data : []).map((item: any) => {
      lastCursor = item.cursor;
      return mapEvent(item);
    });

    return {
      output: { events, cursor: lastCursor, success: true },
      message: `Found **${events.length}** event(s) for service \`${ctx.input.serviceId}\`.`
    };
  })
  .build();
