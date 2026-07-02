import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTimeEntries = SlateTool.create(spec, {
  name: 'List Time Entries',
  key: 'list_time_entries',
  description: `Retrieve time entries from Project Bubble. Supports filtering by user, project, task, subtask, and date range. Useful for time tracking and reporting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('Filter by user ID'),
      clientId: z.string().optional().describe('Filter by client ID'),
      projectId: z.string().optional().describe('Filter by project ID'),
      taskId: z.string().optional().describe('Filter by task ID'),
      subtaskId: z.string().optional().describe('Filter by subtask ID'),
      hideBilled: z.boolean().optional().describe('Hide billed time entries'),
      createdFrom: z
        .string()
        .optional()
        .describe('Filter entries from this date (yyyymmdd format)'),
      createdTo: z
        .string()
        .optional()
        .describe('Filter entries to this date (yyyymmdd format)'),
      limit: z.number().optional().describe('Maximum number of records (max 1000)'),
      offset: z.number().optional().describe('Starting position for pagination')
    })
  )
  .output(
    z.object({
      timeEntries: z
        .array(
          z.object({
            entryId: z.string().describe('Time entry ID'),
            date: z.string().optional().describe('Entry date'),
            projectId: z.string().optional().describe('Project ID'),
            projectName: z.string().optional().describe('Project name'),
            taskId: z.string().optional().describe('Task ID'),
            taskName: z.string().optional().describe('Task name'),
            subtaskId: z.string().optional().describe('Subtask ID'),
            subtaskName: z.string().optional().describe('Subtask name'),
            hours: z.number().optional().describe('Hours logged'),
            minutes: z.number().optional().describe('Minutes logged'),
            seconds: z.number().optional().describe('Seconds logged'),
            description: z.string().optional().describe('Entry description'),
            billed: z.boolean().optional().describe('Whether the entry is billed'),
            userId: z.string().optional().describe('User ID'),
            userName: z.string().optional().describe('User name')
          })
        )
        .describe('List of time entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.getTimeEntries({
      userId: ctx.input.userId,
      clientId: ctx.input.clientId,
      projectId: ctx.input.projectId,
      taskId: ctx.input.taskId,
      subtaskId: ctx.input.subtaskId,
      hideBilled: ctx.input.hideBilled,
      createdFrom: ctx.input.createdFrom,
      createdTo: ctx.input.createdTo,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let data = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];

    let timeEntries = data.map((e: any) => ({
      entryId: String(e.entry_id),
      date: e.date || undefined,
      projectId: e.project_id ? String(e.project_id) : undefined,
      projectName: e.project_name || undefined,
      taskId: e.task_id ? String(e.task_id) : undefined,
      taskName: e.task_name || undefined,
      subtaskId: e.subtask_id ? String(e.subtask_id) : undefined,
      subtaskName: e.subtask_name || undefined,
      hours: e.hours ?? undefined,
      minutes: e.minutes ?? undefined,
      seconds: e.seconds ?? undefined,
      description: e.description || undefined,
      billed:
        e.billed === 1 || e.billed === true
          ? true
          : e.billed === 0 || e.billed === false
            ? false
            : undefined,
      userId: e.user_id ? String(e.user_id) : undefined,
      userName: e.user_name || undefined
    }));

    return {
      output: { timeEntries },
      message: `Found **${timeEntries.length}** time entry(ies).`
    };
  })
  .build();
