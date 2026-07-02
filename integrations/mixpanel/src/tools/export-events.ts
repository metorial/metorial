import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

export let exportEvents = SlateTool.create(spec, {
  name: 'Export Raw Events',
  key: 'export_events',
  description: `Export raw event data from Mixpanel for a specified date range. Returns individual event records with all properties.
Useful for feeding data into external systems or performing custom analysis.`,
  constraints: [
    'Rate limit: 60 queries per hour, 3 queries per second, max 100 concurrent queries.',
    'Use a limit parameter to control the number of returned events.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z.string().describe('Start date in yyyy-mm-dd format (inclusive)'),
      toDate: z.string().describe('End date in yyyy-mm-dd format (inclusive)'),
      eventName: z.string().optional().describe('Filter by specific event name'),
      where: z.string().optional().describe('Filter expression for events'),
      limit: z.number().optional().describe('Maximum number of events to export')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventName: z.string().describe('Event name'),
            properties: z
              .record(z.string(), z.unknown())
              .describe('Event properties including distinct_id and time')
          })
        )
        .describe('Exported events'),
      count: z.number().describe('Number of events exported')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let events = await client.exportRawEvents({
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      event: ctx.input.eventName,
      where: ctx.input.where,
      limit: ctx.input.limit
    });

    return {
      output: {
        events: events.map(e => ({ eventName: e.event, properties: e.properties })),
        count: events.length
      },
      message: `Exported **${events.length}** event(s) from ${ctx.input.fromDate} to ${ctx.input.toDate}.`
    };
  })
  .build();
