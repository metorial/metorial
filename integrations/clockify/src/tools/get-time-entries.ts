import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTimeEntries = SlateTool.create(spec, {
  name: 'Get Time Entries',
  key: 'get_time_entries',
  description: `Retrieve time entries for a user in the workspace. Filter by date range, project, task, tags, or description. Returns entries sorted by start time. If no userId is provided, retrieves entries for the authenticated user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('User ID to get entries for. Defaults to the authenticated user.'),
      start: z
        .string()
        .optional()
        .describe('Filter entries starting after this ISO 8601 date'),
      end: z.string().optional().describe('Filter entries ending before this ISO 8601 date'),
      projectId: z.string().optional().describe('Filter by project ID'),
      taskId: z.string().optional().describe('Filter by task ID'),
      description: z.string().optional().describe('Filter by description (partial match)'),
      inProgress: z.boolean().optional().describe('Filter to only running timers'),
      page: z.number().optional().describe('Page number (1-based)'),
      pageSize: z.number().optional().describe('Number of entries per page (max 5000)')
    })
  )
  .output(
    z.object({
      entries: z.array(
        z.object({
          timeEntryId: z.string(),
          description: z.string().optional(),
          projectId: z.string().optional(),
          taskId: z.string().optional(),
          billable: z.boolean(),
          start: z.string(),
          end: z.string().optional(),
          isRunning: z.boolean(),
          tagIds: z.array(z.string()).optional(),
          userId: z.string().optional()
        })
      ),
      count: z.number().describe('Number of entries returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let userId = ctx.input.userId;
    if (!userId) {
      let user = await client.getCurrentUser();
      userId = user.id;
    }

    let entries = await client.getTimeEntries(userId as string, {
      start: ctx.input.start,
      end: ctx.input.end,
      project: ctx.input.projectId,
      task: ctx.input.taskId,
      description: ctx.input.description,
      'in-progress': ctx.input.inProgress,
      page: ctx.input.page,
      'page-size': ctx.input.pageSize
    });

    let mapped = (entries as any[]).map((e: any) => ({
      timeEntryId: e.id,
      description: e.description || undefined,
      projectId: e.projectId || undefined,
      taskId: e.taskId || undefined,
      billable: e.billable ?? false,
      start: e.timeInterval?.start,
      end: e.timeInterval?.end || undefined,
      isRunning: !e.timeInterval?.end,
      tagIds: e.tagIds?.length ? e.tagIds : undefined,
      userId: e.userId || undefined
    }));

    return {
      output: {
        entries: mapped,
        count: mapped.length
      },
      message: `Retrieved **${mapped.length}** time entries.`
    };
  })
  .build();
