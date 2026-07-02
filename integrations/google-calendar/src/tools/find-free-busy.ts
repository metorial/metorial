import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

export let findFreeBusy = SlateTool.create(spec, {
  name: 'Find Free/Busy',
  key: 'find_free_busy',
  description: `Query the free/busy availability for one or more calendars over a given time range. Returns busy time slots without exposing event details. Useful for finding open meeting times and checking availability.`,
  instructions: [
    'Use RFC3339 format for timeMin and timeMax (e.g. "2024-01-15T09:00:00Z").',
    'Use "primary" as a calendar ID to check the user\'s primary calendar.',
    'Multiple calendar IDs can be provided to check availability across several people.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleCalendarActionScopes.findFreeBusy)
  .input(
    z.object({
      timeMin: z.string().describe('Start of the time range to query (RFC3339 format)'),
      timeMax: z.string().describe('End of the time range to query (RFC3339 format)'),
      calendarIds: z
        .array(z.string())
        .describe('List of calendar IDs to check availability for'),
      timeZone: z
        .string()
        .optional()
        .describe('IANA time zone for the query (e.g. "America/New_York")')
    })
  )
  .output(
    z.object({
      timeMin: z.string().describe('Start of the queried range'),
      timeMax: z.string().describe('End of the queried range'),
      calendars: z
        .record(
          z.string(),
          z.object({
            busy: z
              .array(
                z.object({
                  start: z.string().describe('Start of busy period'),
                  end: z.string().describe('End of busy period')
                })
              )
              .describe('List of busy time slots'),
            errors: z
              .array(
                z.object({
                  domain: z.string(),
                  reason: z.string()
                })
              )
              .optional()
              .describe('Any errors for this calendar')
          })
        )
        .describe('Free/busy information keyed by calendar ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleCalendarClient(ctx.auth.token);

    let result = await client.queryFreeBusy({
      timeMin: ctx.input.timeMin,
      timeMax: ctx.input.timeMax,
      timeZone: ctx.input.timeZone,
      items: ctx.input.calendarIds.map(id => ({ id }))
    });

    let totalBusySlots = 0;
    for (let calId of Object.keys(result.calendars || {})) {
      totalBusySlots += (result.calendars[calId]?.busy || []).length;
    }

    return {
      output: {
        timeMin: result.timeMin,
        timeMax: result.timeMax,
        calendars: result.calendars || {}
      },
      message: `Found **${totalBusySlots}** busy slot(s) across **${ctx.input.calendarIds.length}** calendar(s) between ${ctx.input.timeMin} and ${ctx.input.timeMax}.`
    };
  })
  .build();
