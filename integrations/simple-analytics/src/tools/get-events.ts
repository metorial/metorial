import { SlateTool } from 'slates';
import { z } from 'zod';
import { getEvents } from '../lib/stats';
import { spec } from '../spec';

export let getEventsTool = SlateTool.create(spec, {
  name: 'Get Event Counts',
  key: 'get_event_counts',
  description: `Retrieve event counts from Simple Analytics. Events track specific user interactions like button clicks. Returns total counts for named events within a date range. You can query specific events by name or retrieve all tracked events.`,
  instructions: [
    'Event names only support alphanumeric characters and underscores, and are converted to lowercase.',
    'Omit eventNames or pass an empty array to retrieve all events (up to 1000).'
  ],
  constraints: [
    'Event names are limited to 200 characters.',
    'A maximum of 1000 events are returned when querying all events.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventNames: z
        .array(z.string())
        .optional()
        .describe('Specific event names to query. Omit to retrieve all events.'),
      start: z
        .string()
        .optional()
        .describe(
          'Start date in YYYY-MM-DD format or a relative placeholder (e.g. "today-30d").'
        ),
      end: z
        .string()
        .optional()
        .describe('End date in YYYY-MM-DD format or a relative placeholder (e.g. "today").'),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone identifier (e.g. "Europe/Amsterdam").')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventName: z.string().describe('Name of the event'),
            total: z.number().describe('Total number of times the event was triggered')
          })
        )
        .describe('List of event counts')
    })
  )
  .handleInvocation(async ctx => {
    let data = await getEvents(
      { token: ctx.auth.token, userId: ctx.auth.userId },
      {
        hostname: ctx.config.hostname,
        events: ctx.input.eventNames,
        start: ctx.input.start,
        end: ctx.input.end,
        timezone: ctx.input.timezone
      }
    );

    let events: Array<{ eventName: string; total: number }> = [];
    if (data.events) {
      for (let event of data.events) {
        events.push({
          eventName: event.name || event.event || '',
          total: event.total ?? event.count ?? 0
        });
      }
    }

    let dateRange = `${ctx.input.start || 'last 30 days'} to ${ctx.input.end || 'today'}`;
    let summary = `Retrieved **${events.length}** event(s) for **${ctx.config.hostname}** (${dateRange}).`;

    return {
      output: { events },
      message: summary
    };
  })
  .build();
