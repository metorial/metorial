import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTimeEntry = SlateTool.create(spec, {
  name: 'Update Time Entry',
  key: 'update_time_entry',
  description: `Update an existing time entry in TimeCamp. Modify the date, duration, start/end times, description, task association, or billable status.`
})
  .input(
    z.object({
      entryId: z.number().describe('ID of the time entry to update'),
      date: z.string().optional().describe('Updated date (YYYY-MM-DD)'),
      duration: z.number().optional().describe('Updated duration in seconds'),
      startTime: z.string().optional().describe('Updated start time (HH:MM:SS)'),
      endTime: z.string().optional().describe('Updated end time (HH:MM:SS)'),
      note: z.string().optional().describe('Updated description'),
      taskId: z.number().optional().describe('Updated task ID'),
      billable: z.boolean().optional().describe('Updated billable status')
    })
  )
  .output(
    z.object({
      entryId: z.string().describe('ID of the updated time entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let _result = await client.updateTimeEntry({
      entryId: ctx.input.entryId,
      date: ctx.input.date,
      duration: ctx.input.duration,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      note: ctx.input.note,
      taskId: ctx.input.taskId,
      billable: ctx.input.billable !== undefined ? (ctx.input.billable ? 1 : 0) : undefined
    });

    return {
      output: {
        entryId: String(ctx.input.entryId)
      },
      message: `Updated time entry **${ctx.input.entryId}**.`
    };
  })
  .build();
