import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let updateTimeslip = SlateTool.create(spec, {
  name: 'Update Timeslip',
  key: 'update_timeslip',
  description: `Update an existing time entry in FreeAgent. Can also start or stop a running timer on the timeslip.`,
  instructions: [
    'Use "timerAction" to start or stop a timer. Calls combining a timer action with field updates are rejected.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      timeslipId: z.string().describe('The FreeAgent timeslip ID to update'),
      timerAction: z
        .enum(['start', 'stop'])
        .optional()
        .describe('Start or stop the timer on this timeslip'),
      datedOn: z.string().optional().describe('Date in YYYY-MM-DD format'),
      hours: z.number().optional().describe('Hours worked (decimal)'),
      comment: z.string().optional().describe('Comment or description')
    })
  )
  .output(
    z.object({
      timeslip: z.record(z.string(), z.any()).describe('The updated timeslip record')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.timerAction &&
      [ctx.input.datedOn, ctx.input.hours, ctx.input.comment].some(
        value => value !== undefined
      )
    ) {
      throw createApiServiceError(
        'Start or stop a timer separately from timeslip field updates.'
      );
    }

    let client = createClient(ctx);

    if (ctx.input.timerAction === 'start') {
      let timeslip = await client.startTimer(ctx.input.timeslipId);
      return {
        output: { timeslip },
        message: `Started timer on timeslip **${ctx.input.timeslipId}**`
      };
    }

    if (ctx.input.timerAction === 'stop') {
      let timeslip = await client.stopTimer(ctx.input.timeslipId);
      return {
        output: { timeslip },
        message: `Stopped timer on timeslip **${ctx.input.timeslipId}**`
      };
    }

    let timeslipData: Record<string, any> = {};
    if (ctx.input.datedOn) timeslipData.dated_on = ctx.input.datedOn;
    if (ctx.input.hours !== undefined) timeslipData.hours = String(ctx.input.hours);
    if (ctx.input.comment !== undefined) timeslipData.comment = ctx.input.comment;

    let timeslip = await client.updateTimeslip(ctx.input.timeslipId, timeslipData);

    return {
      output: { timeslip },
      message: `Updated timeslip **${ctx.input.timeslipId}**`
    };
  })
  .build();
