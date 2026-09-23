import { buildApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

export let getCalendar = SlateTool.create(spec, {
  name: 'Get Calendar',
  key: 'get_calendar',
  description:
    'Retrieve the properties of a Google Calendar, including its title, description, time zone, and conferencing options.',
  tags: { readOnly: true }
})
  .scopes(googleCalendarActionScopes.getCalendar)
  .input(
    z.object({
      calendarId: z
        .string()
        .default('primary')
        .describe('Calendar ID. Use "primary" for the user\'s primary calendar.')
    })
  )
  .output(
    z.object({
      calendarId: z.string().describe('Calendar ID'),
      summary: z.string().optional().describe('Calendar title'),
      description: z.string().optional().describe('Calendar description'),
      location: z.string().optional().describe('Calendar location'),
      timeZone: z.string().optional().describe('Calendar time zone'),
      dataOwner: z.string().optional().describe('Owner email for a secondary calendar'),
      etag: z.string().optional().describe('Calendar version tag'),
      allowedConferenceSolutionTypes: z
        .array(z.string())
        .optional()
        .describe('Conference types allowed for this calendar')
    })
  )
  .handleInvocation(async ctx => {
    try {
      let client = new GoogleCalendarClient(ctx.auth.token);
      let calendar = await client.getCalendar(ctx.input.calendarId);

      return {
        output: {
          calendarId: calendar.id ?? ctx.input.calendarId,
          summary: calendar.summary,
          description: calendar.description,
          location: calendar.location,
          timeZone: calendar.timeZone,
          dataOwner: calendar.dataOwner,
          etag: calendar.etag,
          allowedConferenceSolutionTypes:
            calendar.conferenceProperties?.allowedConferenceSolutionTypes
        },
        message: `Retrieved calendar **"${calendar.summary || calendar.id || ctx.input.calendarId}"**.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Calendar',
        operation: 'get calendar',
        reason: 'google_calendar_api_error',
        nestedKeys: ['error', 'errors']
      });
    }
  })
  .build();
