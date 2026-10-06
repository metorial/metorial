import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageParams, paginationSchema, readRows } from '../lib/response';
import { spec } from '../spec';

export let listLeaveRequests = SlateTool.create(spec, {
  name: 'List Leave Requests',
  key: 'list_leave_requests',
  description: `Retrieve leave requests from Breathe HR. Returns a paginated list of leave requests with status, dates, and employee details.`,
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
      leaveRequests: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of leave request records')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });

    const result = await client.list(
      'leave_requests',
      { ...pageParams(ctx.input, true) },
      true
    );
    const leaveRequests = readRows(result, 'leave_requests');
    return {
      output: { leaveRequests, pagination: result.pagination },
      message: `Retrieved **${leaveRequests.length}** leave request(s).`
    };
  })
  .build();
