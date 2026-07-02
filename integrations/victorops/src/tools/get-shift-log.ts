import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getShiftLog = SlateTool.create(spec, {
  name: 'Get Shift Log',
  key: 'get_shift_log',
  description: `Get shift change history for a team. Useful for analyzing on-call workload and generating shift reports over a given time period.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamSlug: z.string().describe('Team slug to get shift log for'),
      start: z.string().optional().describe('Start of the time range in ISO8601 format'),
      end: z.string().optional().describe('End of the time range in ISO8601 format'),
      username: z.string().optional().describe('Filter shifts by a specific user')
    })
  )
  .output(
    z.object({
      shiftLog: z.any().describe('Shift change history for the team')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    let data = await client.getTeamShiftLog(ctx.input.teamSlug, {
      start: ctx.input.start,
      end: ctx.input.end,
      userName: ctx.input.username
    });

    return {
      output: { shiftLog: data },
      message: `Retrieved shift log for team **${ctx.input.teamSlug}**.`
    };
  })
  .build();
