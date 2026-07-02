import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOtherLeaveReasons = SlateTool.create(spec, {
  name: 'List Other Leave Reasons',
  key: 'list_other_leave_reasons',
  description: `Retrieve the list of "other leave" reasons configured in Breathe HR. Other leave is leave that is not deducted from holiday allowance. Returns each reason's ID, name, and creation timestamp.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      otherLeaveReasons: z
        .array(z.record(z.string(), z.any()))
        .describe('List of other leave reason records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listOtherLeaveReasons({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let otherLeaveReasons = result?.other_leave_reasons || [];

    return {
      output: { otherLeaveReasons },
      message: `Retrieved **${otherLeaveReasons.length}** other leave reason(s).`
    };
  })
  .build();
