import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, takeWithinOutputBudget, truncateText } from '../lib/helpers';
import { spec } from '../spec';

let MAX_EVENT_TEXT_CHARS = 10_000;

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List events from the Datadog event stream within a time range. Filter events by priority, source, or tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().describe('Start of the time range as Unix timestamp in seconds'),
      end: z.number().describe('End of the time range as Unix timestamp in seconds'),
      priority: z.enum(['normal', 'low']).optional().describe('Filter by event priority'),
      sources: z.string().optional().describe('Comma-separated list of sources to filter by'),
      tags: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of tags to filter by, e.g. "env:production,service:web"'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Page number (starting at 0) of up to 1000 events. When set, unaggregated events are returned, as Datadog requires for paging.'
        )
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventId: z.number(),
            eventIdString: z
              .string()
              .optional()
              .describe('Exact Event ID to pass to get_event'),
            title: z.string(),
            text: z.string().optional(),
            dateHappened: z.number().optional(),
            priority: z.string().optional(),
            host: z.string().optional(),
            tags: z.array(z.string()).optional(),
            alertType: z.string().optional(),
            source: z.string().optional()
          })
        )
        .describe('List of events matching the filter criteria'),
      truncated: z
        .boolean()
        .optional()
        .describe(
          'True when the text of at least one event was shortened because it was too long'
        ),
      totalEvents: z
        .number()
        .optional()
        .describe(
          'Set only when some events were left out because the result was too large: the total number of events Datadog returned. Omitted events cannot be reached with page; narrow the time range or filters to see them.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.listEvents({
      ...ctx.input,
      // Datadog only accepts `page` for unaggregated event listings and rejects it otherwise.
      unaggregated: ctx.input.page !== undefined ? true : undefined
    });

    let textTruncatedFlags: boolean[] = [];
    let allEvents: any[] = (result.events || []).map((e: any) => {
      let text = truncateText(e.text, MAX_EVENT_TEXT_CHARS);
      textTruncatedFlags.push(text.truncated);
      return {
        eventId: e.id,
        eventIdString: e.id_str,
        title: e.title,
        text: text.value,
        dateHappened: e.date_happened ?? undefined,
        priority: e.priority ?? undefined,
        host: e.host ?? undefined,
        tags: e.tags ?? undefined,
        alertType: e.alert_type ?? undefined,
        source: e.source ?? undefined
      };
    });
    let { items: events, truncated: eventsOmitted } = takeWithinOutputBudget(allEvents);
    let textTruncated = textTruncatedFlags.slice(0, events.length).some(Boolean);

    return {
      output: {
        events,
        truncated: textTruncated || undefined,
        totalEvents: eventsOmitted ? allEvents.length : undefined
      },
      message: `Found **${events.length}** events${
        eventsOmitted
          ? ` (showing ${events.length} of ${allEvents.length} because the result was too large; the omitted events cannot be reached with page, so narrow the time range or filters to see them)`
          : ''
      }${textTruncated ? '. Some long event text was shortened.' : ''}`
    };
  })
  .build();
