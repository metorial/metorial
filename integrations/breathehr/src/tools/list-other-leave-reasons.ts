import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageParams, paginationSchema, readRows } from '../lib/response';
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
      pagination: paginationSchema.optional(),
      otherLeaveReasons: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of other leave reason records')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });

    const result = await client.list(
      'other_leave_reasons',
      { ...pageParams(ctx.input, false) },
      false
    );
    const otherLeaveReasons = readRows(result, 'other_leave_reasons');
    return {
      output: { otherLeaveReasons, pagination: result.pagination },
      message: `Retrieved **${otherLeaveReasons.length}** leave reason(s).`
    };
  })
  .build();
