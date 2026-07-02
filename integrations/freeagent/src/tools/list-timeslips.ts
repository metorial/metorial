import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let listTimeslips = SlateTool.create(spec, {
  name: 'List Timeslips',
  key: 'list_timeslips',
  description: `Retrieve time tracking entries (timeslips) from FreeAgent. Can filter by date range, user, task, project, or billing status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      view: z
        .enum(['all', 'unbilled', 'running'])
        .optional()
        .describe('Filter timeslips by billing status'),
      fromDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      toDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
      updatedSince: z.string().optional().describe('ISO 8601 timestamp'),
      userId: z.string().optional().describe('Filter by user ID'),
      taskId: z.string().optional().describe('Filter by task ID'),
      projectId: z.string().optional().describe('Filter by project ID'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      timeslips: z.array(z.record(z.string(), z.any())).describe('List of timeslip records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let timeslips = await client.listTimeslips(ctx.input);
    let count = timeslips.length;

    return {
      output: { timeslips },
      message: `Found **${count}** timeslip${count !== 1 ? 's' : ''}.`
    };
  })
  .build();
