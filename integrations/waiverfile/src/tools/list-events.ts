import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List events from your WaiverFile account within a date range. Optionally filter by event category. Can also retrieve only upcoming events.`,
  instructions: [
    'Dates should be in ISO 8601 / UTC format (e.g. "2024-01-01T00:00:00Z").',
    'Use eventCategoryId to filter results to a specific category.',
    'Set upcomingOnly to true to only return future events in the range.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Start of the date range (UTC, ISO 8601)'),
      endDate: z.string().describe('End of the date range (UTC, ISO 8601)'),
      eventCategoryId: z.string().optional().describe('Filter events by category ID'),
      upcomingOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe('Only return upcoming events within the range')
    })
  )
  .output(
    z.object({
      events: z.any().describe('Array of event records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaiverFileClient({
      token: ctx.auth.token,
      siteId: ctx.auth.siteId
    });

    let events: any;
    if (ctx.input.upcomingOnly) {
      events = await client.getUpcomingEvents({
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate
      });
    } else if (ctx.input.eventCategoryId) {
      events = await client.getEventsByCategory({
        eventCategoryId: ctx.input.eventCategoryId,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate
      });
    } else {
      events = await client.getEventsByDateRange({
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate
      });
    }

    let results = Array.isArray(events) ? events : [events];

    return {
      output: { events: results },
      message: `Found **${results.length}** event(s) between ${ctx.input.startDate} and ${ctx.input.endDate}.`
    };
  })
  .build();
