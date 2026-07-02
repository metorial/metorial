import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTimeEntry = SlateTool.create(spec, {
  name: 'Create Time Entry',
  key: 'create_time_entry',
  description: `Create a new time entry in TimeCamp. You can specify a start/end time range or a duration in seconds. Optionally associate the entry with a task and mark it as billable.`,
  instructions: [
    'Provide either (start AND end) OR duration, not both.',
    'Date format for start/end is YYYY-MM-DD HH:MM:SS.',
    'Date format for date is YYYY-MM-DD.'
  ]
})
  .input(
    z.object({
      date: z
        .string()
        .optional()
        .describe('Date for the entry (YYYY-MM-DD). Defaults to today if not specified.'),
      start: z
        .string()
        .optional()
        .describe('Start datetime (YYYY-MM-DD HH:MM:SS). Use with end.'),
      end: z
        .string()
        .optional()
        .describe('End datetime (YYYY-MM-DD HH:MM:SS). Use with start.'),
      duration: z
        .number()
        .optional()
        .describe('Duration in seconds. Use if not providing start/end.'),
      note: z.string().optional().describe('Description of the time entry'),
      taskId: z.number().optional().describe('Task ID to associate the entry with'),
      billable: z.boolean().optional().describe('Whether the entry is billable')
    })
  )
  .output(
    z.object({
      entryId: z.string().describe('ID of the created time entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createTimeEntry({
      date: ctx.input.date,
      start: ctx.input.start,
      end: ctx.input.end,
      duration: ctx.input.duration,
      note: ctx.input.note,
      taskId: ctx.input.taskId,
      billable: ctx.input.billable !== undefined ? (ctx.input.billable ? 1 : 0) : undefined
    });

    let entryId = String(result?.entry_id || result?.id || '');

    return {
      output: {
        entryId
      },
      message: `Created time entry **${entryId}**${ctx.input.taskId ? ` for task ${ctx.input.taskId}` : ''}.`
    };
  })
  .build();
