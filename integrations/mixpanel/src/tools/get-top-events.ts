import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext, requireServiceAccount } from '../lib/helpers';
import { spec } from '../spec';

export let getTopEvents = SlateTool.create(spec, {
  name: 'Get Top Events',
  key: 'get_top_events',
  description: `Get today's most popular events in the Mixpanel project ranked by volume. Useful for a quick overview of current event activity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of events to return (default: 10)')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventName: z.string().describe('Event name'),
            amount: z.number().describe('Event count')
          })
        )
        .describe('Top events ranked by volume')
    })
  )
  .handleInvocation(async ctx => {
    requireServiceAccount(ctx);

    let client = createClientFromContext(ctx);

    let events = await client.getTopEvents({ limit: ctx.input.limit });

    return {
      output: {
        events: events.map(e => ({ eventName: e.event, amount: e.amount }))
      },
      message: `Retrieved **${events.length}** top event(s).`
    };
  })
  .build();
