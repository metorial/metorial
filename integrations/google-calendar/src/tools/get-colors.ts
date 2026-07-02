import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

export let getColors = SlateTool.create(spec, {
  name: 'Get Colors',
  key: 'get_colors',
  description: `Retrieve the available calendar and event color definitions used in Google Calendar. Returns color IDs with their background and foreground hex values. Use these IDs when setting colors on events or calendars.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCalendarActionScopes.getColors)
  .input(z.object({}))
  .output(
    z.object({
      calendarColors: z
        .record(
          z.string(),
          z.object({
            background: z.string().describe('Background hex color'),
            foreground: z.string().describe('Foreground hex color')
          })
        )
        .describe('Available calendar colors keyed by color ID'),
      eventColors: z
        .record(
          z.string(),
          z.object({
            background: z.string().describe('Background hex color'),
            foreground: z.string().describe('Foreground hex color')
          })
        )
        .describe('Available event colors keyed by color ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleCalendarClient(ctx.auth.token);
    let colors = await client.getColors();

    let calendarCount = Object.keys(colors.calendar || {}).length;
    let eventCount = Object.keys(colors.event || {}).length;

    return {
      output: {
        calendarColors: colors.calendar || {},
        eventColors: colors.event || {}
      },
      message: `Retrieved **${calendarCount}** calendar color(s) and **${eventCount}** event color(s).`
    };
  })
  .build();
