import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTimeEntry = SlateTool.create(spec, {
  name: 'Create Time Entry',
  key: 'create_time_entry',
  description: `Log a time entry for a task in Project Bubble. Specify the duration in seconds, and optionally associate with a subtask.`
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to log time for'),
      seconds: z.number().describe('Duration in seconds'),
      date: z.string().optional().describe('Date of the time entry (yyyymmdd format)'),
      subtaskId: z.string().optional().describe('Subtask ID to associate the entry with'),
      description: z.string().optional().describe('Description of the time entry'),
      userId: z.string().optional().describe('User ID for the time entry')
    })
  )
  .output(
    z.object({
      entryId: z.string().describe('ID of the created time entry'),
      seconds: z.number().describe('Duration in seconds'),
      taskId: z.string().describe('Associated task ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.createTimeEntry(ctx.input.taskId, {
      seconds: ctx.input.seconds,
      date: ctx.input.date,
      subtaskId: ctx.input.subtaskId,
      description: ctx.input.description,
      userId: ctx.input.userId
    });

    let e = result?.data?.[0] || result?.data || result;

    let hours = Math.floor(ctx.input.seconds / 3600);
    let mins = Math.floor((ctx.input.seconds % 3600) / 60);

    return {
      output: {
        entryId: String(e.entry_id),
        seconds: ctx.input.seconds,
        taskId: ctx.input.taskId
      },
      message: `Logged **${hours}h ${mins}m** on task ${ctx.input.taskId}.`
    };
  })
  .build();
