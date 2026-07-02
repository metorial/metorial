import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkdayClient } from '../lib/client';
import { spec } from '../spec';

export let getTimeBlocks = SlateTool.create(spec, {
  name: 'Get Time Blocks',
  key: 'get_time_blocks',
  description: `Retrieve time tracking blocks for a specific worker. Returns recorded time entries including clock-in/out times and durations. Optionally filter by date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workerId: z.string().describe('The Workday worker ID'),
      fromDate: z.string().optional().describe('Start date filter in YYYY-MM-DD format'),
      toDate: z.string().optional().describe('End date filter in YYYY-MM-DD format'),
      limit: z.number().optional().describe('Maximum number of results (default: 20)'),
      offset: z.number().optional().describe('Pagination offset (default: 0)')
    })
  )
  .output(
    z.object({
      timeBlocks: z
        .array(z.record(z.string(), z.any()))
        .describe('List of time block entries'),
      total: z.number().describe('Total number of matching time blocks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkdayClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      tenant: ctx.config.tenant
    });

    let result = await client.getWorkerTimeBlocks(ctx.input.workerId, {
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        timeBlocks: result.data,
        total: result.total
      },
      message: `Retrieved **${result.total}** time blocks for worker ${ctx.input.workerId}. Returned ${result.data.length} results.`
    };
  })
  .build();
