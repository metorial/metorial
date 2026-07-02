import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

export let listCalendars = SlateTool.create(spec, {
  name: 'List Calendars',
  key: 'list_calendars',
  description: `List all calendars on the user's calendar list, including their primary calendar, subscribed calendars, and shared calendars. Returns calendar metadata including access role, color, and visibility settings.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCalendarActionScopes.listCalendars)
  .input(
    z.object({
      showHidden: z
        .boolean()
        .optional()
        .describe('Whether to include hidden calendars in the result'),
      showDeleted: z
        .boolean()
        .optional()
        .describe('Whether to include deleted calendars in the result'),
      maxResults: z.number().optional().describe('Maximum number of calendars to return'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results')
    })
  )
  .output(
    z.object({
      calendars: z
        .array(
          z.object({
            calendarId: z.string().optional().describe('Calendar ID'),
            summary: z.string().optional().describe('Calendar title'),
            description: z.string().optional().describe('Calendar description'),
            location: z.string().optional().describe('Calendar location'),
            timeZone: z.string().optional().describe('Calendar time zone'),
            colorId: z.string().optional().describe('Color ID'),
            backgroundColor: z.string().optional().describe('Background color hex'),
            foregroundColor: z.string().optional().describe('Foreground color hex'),
            accessRole: z
              .string()
              .optional()
              .describe('Access role (owner, writer, reader, freeBusyReader)'),
            primary: z.boolean().optional().describe('Whether this is the primary calendar'),
            hidden: z.boolean().optional().describe('Whether the calendar is hidden'),
            selected: z
              .boolean()
              .optional()
              .describe('Whether the calendar is selected in the UI'),
            summaryOverride: z.string().optional().describe('User-customized calendar name')
          })
        )
        .describe('List of calendars'),
      nextPageToken: z.string().optional().describe('Token for next page'),
      totalResults: z.number().describe('Number of calendars returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleCalendarClient(ctx.auth.token);

    let result = await client.listCalendarList({
      showHidden: ctx.input.showHidden,
      showDeleted: ctx.input.showDeleted,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken
    });

    let calendars = (result.items || []).map(c => ({
      calendarId: c.id,
      summary: c.summary,
      description: c.description,
      location: c.location,
      timeZone: c.timeZone,
      colorId: c.colorId,
      backgroundColor: c.backgroundColor,
      foregroundColor: c.foregroundColor,
      accessRole: c.accessRole,
      primary: c.primary,
      hidden: c.hidden,
      selected: c.selected,
      summaryOverride: c.summaryOverride
    }));

    return {
      output: {
        calendars,
        nextPageToken: result.nextPageToken,
        totalResults: calendars.length
      },
      message: `Found **${calendars.length}** calendar(s)${result.nextPageToken ? ' (more pages available)' : ''}.`
    };
  })
  .build();
