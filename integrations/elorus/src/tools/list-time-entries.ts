import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTimeEntries = SlateTool.create(spec, {
  name: 'List Time Entries',
  key: 'list_time_entries',
  description: `List time entries in your Elorus organization. Filter by project, task, billable status, and date range to review time tracking data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().optional().describe('Filter by project ID.'),
      taskId: z.string().optional().describe('Filter by task ID.'),
      billable: z
        .boolean()
        .optional()
        .describe('Filter for billable or non-billable entries.'),
      billed: z.boolean().optional().describe('Filter for billed or un-billed entries.'),
      periodFrom: z.string().optional().describe('Filter from this date (YYYY-MM-DD).'),
      periodTo: z.string().optional().describe('Filter until this date (YYYY-MM-DD).'),
      ordering: z.string().optional().describe('Sort field. Prefix with "-" for descending.'),
      page: z.number().optional().describe('Page number (starts at 1).'),
      pageSize: z.number().optional().describe('Results per page (max 250).')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching time entries.'),
      timeEntries: z.array(z.any()).describe('Array of time entry objects.'),
      hasMore: z.boolean().describe('Whether there are more pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listTimeEntries({
      project: ctx.input.projectId,
      task: ctx.input.taskId,
      billable:
        ctx.input.billable !== undefined ? (ctx.input.billable ? '1' : '0') : undefined,
      billed: ctx.input.billed !== undefined ? (ctx.input.billed ? '1' : '0') : undefined,
      periodFrom: ctx.input.periodFrom,
      periodTo: ctx.input.periodTo,
      ordering: ctx.input.ordering,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        totalCount: result.count,
        timeEntries: result.results,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** time entry(ies). Returned ${result.results.length} on this page.`
    };
  })
  .build();
