import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTimeEntry = SlateTool.create(spec, {
  name: 'Create Time Entry',
  key: 'create_time_entry',
  description: `Log a new time entry in Agiled. Track hours worked against projects and tasks with start/end times and a memo.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to log time against'),
      taskId: z.string().optional().describe('ID of the task to log time against'),
      userId: z.string().optional().describe('User ID of who logged the time'),
      startTime: z.string().describe('Start time (YYYY-MM-DD HH:mm:ss)'),
      endTime: z.string().describe('End time (YYYY-MM-DD HH:mm:ss)'),
      memo: z.string().optional().describe('Description of the work performed'),
      totalHours: z.string().optional().describe('Total hours in HH:mm format')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string().describe('ID of the created time entry'),
      totalHours: z.string().optional().describe('Total hours logged')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    let result = await client.createTimeEntry({
      project_id: ctx.input.projectId,
      task_id: ctx.input.taskId,
      user_id: ctx.input.userId,
      start_time: ctx.input.startTime,
      end_time: ctx.input.endTime,
      memo: ctx.input.memo,
      total_hours: ctx.input.totalHours
    });

    let entry = result.data;

    return {
      output: {
        timeEntryId: String(entry.id ?? ''),
        totalHours: (entry.total_hours as string | undefined) ?? ctx.input.totalHours
      },
      message: `Logged time entry for project **${ctx.input.projectId}**${ctx.input.totalHours ? ` (${ctx.input.totalHours})` : ''}.`
    };
  })
  .build();
