import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBusyTimes = SlateTool.create(spec, {
  name: 'Get Busy Times',
  key: 'get_busy_times',
  description: `Retrieve busy time windows across all connected calendars for a date range. Useful for understanding availability conflicts before scheduling.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dateFrom: z.string().describe('Start of the date range (ISO 8601)'),
      dateTo: z.string().describe('End of the date range (ISO 8601)'),
      timeZone: z
        .string()
        .optional()
        .describe('Time zone for the busy-time query (e.g., America/New_York)'),
      loggedInUsersTz: z
        .string()
        .optional()
        .describe('Deprecated alias for timeZone. Prefer timeZone.'),
      calendarsToLoad: z
        .array(
          z.object({
            credentialId: z.number().describe('Cal.com credential ID'),
            externalId: z.string().describe('External calendar ID')
          })
        )
        .optional()
        .describe('Specific calendars to include in the busy-time query')
    })
  )
  .output(
    z.object({
      busyTimes: z.any().describe('Busy time windows from connected calendars')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let params: Record<string, any> = {
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo
    };
    if (ctx.input.timeZone) params.timeZone = ctx.input.timeZone;
    else if (ctx.input.loggedInUsersTz) params.timeZone = ctx.input.loggedInUsersTz;
    if (ctx.input.calendarsToLoad) params.calendarsToLoad = ctx.input.calendarsToLoad;

    let busyTimes = await client.getBusyTimes(params);

    return {
      output: { busyTimes },
      message: `Retrieved busy times from ${ctx.input.dateFrom} to ${ctx.input.dateTo}.`
    };
  })
  .build();
