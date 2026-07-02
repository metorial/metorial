import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let updateTimeEntry = SlateTool.create(spec, {
  name: 'Update Time Entry',
  key: 'update_time_entry',
  description: `Update an existing logged time entry. You can modify the hours/minutes, date, notes, or associated user.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      loggedTimeId: z.number().describe('ID of the time entry to update'),
      minutes: z.number().optional().describe('Updated number of minutes'),
      hours: z.number().optional().describe('Updated number of hours'),
      date: z.string().optional().describe('Updated date (YYYY-MM-DD)'),
      notes: z.string().optional().describe('Updated notes'),
      userId: z.number().optional().describe('Updated user ID')
    })
  )
  .output(
    z.object({
      loggedTimeId: z.number().describe('ID of the updated time entry'),
      raw: z.record(z.string(), z.any()).describe('Full updated time entry object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.minutes !== undefined) body.minutes = ctx.input.minutes;
    if (ctx.input.hours !== undefined) body.hours = ctx.input.hours;
    if (ctx.input.date !== undefined) body.date = ctx.input.date;
    if (ctx.input.notes !== undefined) body.notes = ctx.input.notes;
    if (ctx.input.userId !== undefined) body.userId = ctx.input.userId;

    let result = await client.updateLoggedTime(ctx.input.loggedTimeId, body);

    return {
      output: {
        loggedTimeId: result.id,
        raw: result
      },
      message: `Updated time entry (ID: ${result.id}).`
    };
  })
  .build();
