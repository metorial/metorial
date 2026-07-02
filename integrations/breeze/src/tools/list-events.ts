import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List church events with optional filtering by date range and calendar/category. Also retrieves available calendars and event locations when requested.`,
  constraints: [
    'Event responses may be cached and lag up to 15 minutes behind the live site.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.string().optional().describe('Start date filter (YYYY-MM-DD format)'),
      end: z.string().optional().describe('End date filter (YYYY-MM-DD format)'),
      categoryId: z.string().optional().describe('Calendar/category ID to filter by'),
      details: z.boolean().optional().describe('Set to true to include full event details'),
      limit: z.number().optional().describe('Maximum number of events to return'),
      includeCalendars: z
        .boolean()
        .optional()
        .describe('Set to true to also return available calendars'),
      includeLocations: z
        .boolean()
        .optional()
        .describe('Set to true to also return available locations')
    })
  )
  .output(
    z.object({
      events: z.array(z.any()).describe('Array of event objects'),
      calendars: z
        .array(z.any())
        .optional()
        .describe('Available calendars (when includeCalendars is true)'),
      locations: z
        .array(z.any())
        .optional()
        .describe('Available locations (when includeLocations is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let events = await client.listEvents({
      start: ctx.input.start,
      end: ctx.input.end,
      categoryId: ctx.input.categoryId,
      details: ctx.input.details,
      limit: ctx.input.limit
    });
    let eventsArray = Array.isArray(events) ? events : [];

    let calendars: unknown[] | undefined;
    if (ctx.input.includeCalendars) {
      let result = await client.listCalendars();
      calendars = Array.isArray(result) ? result : [];
    }

    let locations: unknown[] | undefined;
    if (ctx.input.includeLocations) {
      let result = await client.listLocations();
      locations = Array.isArray(result) ? result : [];
    }

    return {
      output: { events: eventsArray, calendars, locations },
      message: `Found **${eventsArray.length}** events.`
    };
  })
  .build();
