import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

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
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventId: z.number(),
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
        .describe('List of events matching the filter criteria')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.listEvents(ctx.input);

    let events = (result.events || []).map((e: any) => ({
      eventId: e.id,
      title: e.title,
      text: e.text,
      dateHappened: e.date_happened,
      priority: e.priority,
      host: e.host,
      tags: e.tags,
      alertType: e.alert_type,
      source: e.source
    }));

    return {
      output: { events },
      message: `Found **${events.length}** events`
    };
  })
  .build();
