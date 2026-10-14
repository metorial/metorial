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
      offset: z
        .number()
        .optional()
        .describe(
          'Legacy number of responses to skip for pagination; current API pagination uses page'
        ),
      page: z.number().optional().describe('Page number, starting at 1'),
      pageSize: z
        .number()
        .optional()
        .describe('Responses per page; default 50, maximum 200. Takes precedence over limit.')
    })
  )
  .output(
    z.object({
      responses: z.array(z.any()).describe('List of check-in responses with user answers'),
      count: z.number().optional().describe('Total number of responses matching the filter'),
      next: z.string().nullable().optional().describe('URL of the next page, or null'),
      previous: z.string().nullable().optional().describe('URL of the previous page, or null')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let result = await client.getCheckinResponses(ctx.input.checkinUuid, {
      dateStart: ctx.input.dateStart,
      dateEnd: ctx.input.dateEnd,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let responses = result?.results ?? result;
    let count = result?.count;

    return {
      output: {
        responses: Array.isArray(responses) ? responses : [],
        count,
        next: result?.next,
        previous: result?.previous
      },
      message: `Retrieved **${Array.isArray(responses) ? responses.length : 0}** response(s) for check-in \`${ctx.input.checkinUuid}\`.`
    };
  })
  .build();
