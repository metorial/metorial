import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let listTimeEntries = SlateTool.create(spec, {
  name: 'List Time Entries',
  key: 'list_time_entries',
  description: `Search and retrieve time entries with flexible filtering by user, client, project, task, date range, billing status, and running status. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().optional().describe('Filter by user ID'),
      clientId: z.number().optional().describe('Filter by client ID'),
      projectId: z.number().optional().describe('Filter by project ID'),
      taskId: z.number().optional().describe('Filter by task ID'),
      isBilled: z.boolean().optional().describe('Filter by billed status'),
      isRunning: z.boolean().optional().describe('Filter by running timer status'),
      from: z.string().optional().describe('Start of date range (YYYY-MM-DD)'),
      to: z.string().optional().describe('End of date range (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Results per page (max 2000)')
    })
  )
  .output(
    z.object({
      timeEntries: z.array(
        z.object({
          timeEntryId: z.number().describe('ID of the time entry'),
          userId: z.number().optional().describe('User ID'),
          userName: z.string().optional().describe('User name'),
          projectId: z.number().optional().describe('Project ID'),
          projectName: z.string().optional().describe('Project name'),
          clientName: z.string().optional().describe('Client name'),
          taskId: z.number().optional().describe('Task ID'),
          taskName: z.string().optional().describe('Task name'),
          spentDate: z.string().describe('Date the time was spent'),
          hours: z.number().describe('Hours logged'),
          notes: z.string().nullable().describe('Notes'),
          isRunning: z.boolean().describe('Whether the timer is running'),
          isBilled: z.boolean().describe('Whether billed'),
          billable: z.boolean().describe('Whether billable'),
          billableRate: z.number().nullable().describe('Billable rate')
        })
      ),
      totalEntries: z.number().describe('Total number of matching entries'),
      totalPages: z.number().describe('Total number of pages'),
      page: z.number().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.listTimeEntries({
      userId: ctx.input.userId,
      clientId: ctx.input.clientId,
      projectId: ctx.input.projectId,
      taskId: ctx.input.taskId,
      isBilled: ctx.input.isBilled,
      isRunning: ctx.input.isRunning,
      from: ctx.input.from,
      to: ctx.input.to,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let timeEntries = result.results.map((e: any) => ({
      timeEntryId: e.id,
      userId: e.user?.id,
      userName: e.user?.name,
      projectId: e.project?.id,
      projectName: e.project?.name,
      clientName: e.client?.name,
      taskId: e.task?.id,
      taskName: e.task?.name,
      spentDate: e.spent_date,
      hours: e.hours,
      notes: e.notes,
      isRunning: e.is_running,
      isBilled: e.is_billed,
      billable: e.billable,
      billableRate: e.billable_rate
    }));

    return {
      output: {
        timeEntries,
        totalEntries: result.totalEntries,
        totalPages: result.totalPages,
        page: result.page
      },
      message: `Found **${result.totalEntries}** time entries (page ${result.page}/${result.totalPages}).`
    };
  })
  .build();
