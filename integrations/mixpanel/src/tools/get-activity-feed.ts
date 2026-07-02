import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

export let getActivityFeed = SlateTool.create(spec, {
  name: 'Get Activity Feed',
  key: 'get_activity_feed',
  description: `Retrieve a user's event activity stream from Mixpanel. Shows all events performed by specific users within a date range, in chronological order.`,
  constraints: ['Rate limit: 60 queries per hour, max 5 concurrent queries.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      distinctIds: z.array(z.string()).describe('User distinct IDs to retrieve activity for'),
      fromDate: z.string().describe('Start date in yyyy-mm-dd format (inclusive)'),
      toDate: z.string().describe('End date in yyyy-mm-dd format (inclusive)')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventName: z.string().describe('Event name'),
            properties: z.record(z.string(), z.unknown()).describe('Event properties')
          })
        )
        .describe('User activity events'),
      count: z.number().describe('Number of events returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let events = await client.queryActivityFeed({
      distinctIds: ctx.input.distinctIds,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate
    });

    return {
      output: {
        events: events.map(e => ({ eventName: e.event, properties: e.properties })),
        count: events.length
      },
      message: `Retrieved **${events.length}** event(s) for ${ctx.input.distinctIds.length} user(s) from ${ctx.input.fromDate} to ${ctx.input.toDate}.`
    };
  })
  .build();
