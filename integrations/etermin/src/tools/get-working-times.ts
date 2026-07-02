import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkingTimes = SlateTool.create(spec, {
  name: 'Get Working Times',
  key: 'get_working_times',
  description: `Retrieve working time configurations for a specific calendar. Shows when the calendar resource is available for bookings, including weekday schedules and time ranges.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      calendarId: z.string().describe('Calendar ID to retrieve working times for')
    })
  )
  .output(
    z.object({
      workingTimes: z
        .array(z.record(z.string(), z.any()))
        .describe('Working time configuration entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.getWorkingTimes(ctx.input.calendarId);

    let workingTimes = Array.isArray(result) ? result : [result];

    return {
      output: { workingTimes },
      message: `Retrieved **${workingTimes.length}** working time entry/entries for calendar ${ctx.input.calendarId}.`
    };
  })
  .build();
