import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTimeEntries = SlateTool.create(spec, {
  name: 'List Time Entries',
  key: 'list_time_entries',
  description: `Retrieve time entries from TimeCamp filtered by date range, tasks, or users. Returns logged time with duration, task association, billable status, and timestamps. Use this to query timesheet data, generate reports, or review tracked hours.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.string().describe('Start date (YYYY-MM-DD). Required to filter time entries.'),
      to: z.string().describe('End date (YYYY-MM-DD). Required to filter time entries.'),
      taskIds: z.string().optional().describe('Comma-separated task IDs to filter by'),
      userIds: z.string().optional().describe('Comma-separated user IDs to filter by'),
      withSubtasks: z.boolean().optional().describe('Include subtask entries')
    })
  )
  .output(
    z.object({
      entries: z.array(
        z.object({
          entryId: z.string().describe('Time entry ID'),
          duration: z.string().describe('Duration in seconds'),
          userId: z.string().describe('User ID who logged the entry'),
          userName: z.string().describe('User display name'),
          taskId: z.string().describe('Associated task ID'),
          taskName: z.string().describe('Task name'),
          date: z.string().describe('Entry date (YYYY-MM-DD)'),
          startTime: z.string().describe('Start time (HH:MM:SS)'),
          endTime: z.string().describe('End time (HH:MM:SS)'),
          billable: z.string().describe('Whether entry is billable (0 or 1)'),
          description: z.string().describe('Entry description/note'),
          lastModified: z.string().describe('Last modification timestamp')
        })
      ),
      totalEntries: z.number().describe('Total number of entries returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let entries = await client.getTimeEntries({
      from: ctx.input.from,
      to: ctx.input.to,
      taskIds: ctx.input.taskIds,
      userIds: ctx.input.userIds,
      withSubtasks: ctx.input.withSubtasks ? 1 : undefined
    });

    let mapped = (entries || []).map(e => ({
      entryId: String(e.id),
      duration: String(e.duration),
      userId: String(e.user_id),
      userName: e.user_name || '',
      taskId: String(e.task_id),
      taskName: e.name || '',
      date: e.date || '',
      startTime: e.start_time || '',
      endTime: e.end_time || '',
      billable: String(e.billable || '0'),
      description: e.description || '',
      lastModified: e.last_modify || ''
    }));

    return {
      output: {
        entries: mapped,
        totalEntries: mapped.length
      },
      message: `Retrieved **${mapped.length}** time entries from ${ctx.input.from} to ${ctx.input.to}.`
    };
  })
  .build();
