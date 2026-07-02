import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let getCheckinResponses = SlateTool.create(spec, {
  name: 'Get Check-in Responses',
  key: 'get_checkin_responses',
  description: `Retrieve responses for a specific check-in, filtered by date range. Returns each participant's answers, blocker status, and completion information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      checkinUuid: z.string().describe('UUID of the check-in'),
      dateStart: z
        .string()
        .optional()
        .describe('Start date for filtering responses (YYYY-MM-DD)'),
      dateEnd: z.string().optional().describe('End date for filtering responses (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Maximum number of responses to return'),
      offset: z.number().optional().describe('Number of responses to skip for pagination')
    })
  )
  .output(
    z.object({
      responses: z.array(z.any()).describe('List of check-in responses with user answers'),
      count: z.number().optional().describe('Total number of responses matching the filter')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let result = await client.getCheckinResponses(ctx.input.checkinUuid, {
      dateStart: ctx.input.dateStart,
      dateEnd: ctx.input.dateEnd,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let responses = result?.results ?? result;
    let count = result?.count;

    return {
      output: {
        responses: Array.isArray(responses) ? responses : [],
        count
      },
      message: `Retrieved **${Array.isArray(responses) ? responses.length : 0}** response(s) for check-in \`${ctx.input.checkinUuid}\`.`
    };
  })
  .build();
