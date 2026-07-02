import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventTypeSchema = z.object({
  eventTypeId: z.string().describe('Unique event type identifier'),
  name: z.string().describe('Event type name'),
  description: z.string().nullable().describe('Event type description'),
  durationMinutes: z.number().nullable().describe('Duration in minutes')
});

export let listEventTypes = SlateTool.create(spec, {
  name: 'List Event Types',
  key: 'list_event_types',
  description: `Retrieve all event types configured in your ScheduleOnce account.
Event types represent the different services or meeting types you offer, each with configurable duration and settings. Useful for looking up event type IDs when filtering bookings.`,
  constraints: ['Maximum 100 event types per request (default 10).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of event types to return (1-100, default 10)'),
      cursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of event types'),
      eventTypes: z.array(eventTypeSchema).describe('List of event types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listEventTypes({
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });

    let eventTypes = (result.data || []).map(et => ({
      eventTypeId: et.id,
      name: et.name,
      description: et.description ?? null,
      durationMinutes: et.duration_minutes ?? null
    }));

    return {
      output: {
        count: result.count,
        eventTypes
      },
      message: `Found **${result.count}** event type(s). Returned **${eventTypes.length}** in this page.`
    };
  })
  .build();
