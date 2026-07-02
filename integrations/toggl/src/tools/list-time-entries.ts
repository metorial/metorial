import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

let timeEntrySchema = z.object({
  timeEntryId: z.number().describe('Time entry ID'),
  description: z.string().nullable().describe('Description'),
  start: z.string().describe('Start time'),
  stop: z.string().nullable().describe('Stop time'),
  duration: z.number().describe('Duration in seconds (-1 if running)'),
  projectId: z.number().nullable().describe('Associated project ID'),
  taskId: z.number().nullable().describe('Associated task ID'),
  tags: z.array(z.string()).describe('Tags applied'),
  billable: z.boolean().describe('Whether billable'),
  workspaceId: z.number().describe('Workspace ID')
});

export let listTimeEntries = SlateTool.create(spec, {
  name: 'List Time Entries',
  key: 'list_time_entries',
  description: `List recent time entries for the authenticated user. Supports filtering by date range. Limited to a 3-month lookback window; for older data, use the reports tools instead.`,
  constraints: ['Limited to a 3-month lookback window from the current date.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z
        .string()
        .optional()
        .describe(
          'Start date in ISO 8601 or YYYY-MM-DD format. Defaults to entries from the past week.'
        ),
      endDate: z.string().optional().describe('End date in ISO 8601 or YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      timeEntries: z.array(timeEntrySchema).describe('List of time entries'),
      totalCount: z.number().describe('Number of entries returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);

    let entries = await client.getMyTimeEntries({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    let timeEntries = (entries ?? []).map((e: any) => ({
      timeEntryId: e.id,
      description: e.description ?? null,
      start: e.start,
      stop: e.stop ?? null,
      duration: e.duration,
      projectId: e.project_id ?? null,
      taskId: e.task_id ?? null,
      tags: e.tags ?? [],
      billable: e.billable ?? false,
      workspaceId: e.workspace_id
    }));

    return {
      output: {
        timeEntries,
        totalCount: timeEntries.length
      },
      message: `Found **${timeEntries.length}** time entries`
    };
  })
  .build();
