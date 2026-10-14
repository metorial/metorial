import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNonWorkingTimes = SlateTool.create(spec, {
  name: 'List Non-Working Times',
  key: 'list_non_working_times',
  description:
    'List calendar absences that block booking availability, including absence IDs, dates, and reasons.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      calendarId: z
        .string()
        .min(1)
        .describe('Calendar ID. Call list_calendars to discover available calendars.')
    })
  )
  .output(
    z.object({
      nonWorkingTimes: z
        .array(z.record(z.string(), z.any()))
        .describe('Calendar absence records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.listNonWorkingTimes(ctx.input.calendarId);
    let nonWorkingTimes = Array.isArray(result) ? result : [result];
    return {
      output: { nonWorkingTimes },
      message: `Found **${nonWorkingTimes.length}** absence(s) for calendar ${ctx.input.calendarId}.`
    };
  })
  .build();
